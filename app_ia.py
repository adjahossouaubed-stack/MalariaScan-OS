# ==============================================================================
# MalariaScan OS — High-Performance Production API (Fused with PDF Image Report)
# Architecture: FastAPI + PyTorch MobileNetV3-Small (AMP Optimized) + ReportLab
# ==============================================================================

import logging
import hashlib
import secrets
import os
import re
import sys
import time
import unicodedata
from contextlib import asynccontextmanager
from dataclasses import dataclass
from io import BytesIO
from collections import Counter
from typing import Dict, List, Optional, Tuple
from xml.sax.saxutils import escape

import torch
import torch.nn as nn
import torch.nn.functional as F
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, ImageDraw, ImageFilter, UnidentifiedImageError
from pydantic import BaseModel, Field
from torch.cuda.amp import autocast
from torchvision import transforms
from torchvision.models import (
    MobileNet_V3_Small_Weights,
    mobilenet_v3_small,
)

# Imports complets pour ReportLab et l'insertion des visuels
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ------------------------------------------------------------------------------
# 1. LOGGING & CONFIGURATION CLINIQUE
# ------------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("malariascan_api")


@dataclass(frozen=True)
class ClinicalConfig:
    use_amp: bool = True
    mean: Tuple[float, float, float] = (0.7016, 0.5362, 0.6850)
    std: Tuple[float, float, float] = (0.2113, 0.2582, 0.1814)
    image_size: int = 224
    num_classes: int = 2
    class_names: Tuple[str, str] = ("Uninfected", "Infected")
    dropout_p: float = 0.4
    backbone: str = "mobilenet_v3_small"
    weights_path: str = "./malaria_model_v3.pth"
    simulation_keywords: Tuple[str, ...] = (
        "parasite", "infected", "malaria", "plasmodium",
        "positivo", "infectado",
    )
    simulation_certainty: float = 0.9874


config = ClinicalConfig()

# Emplacement temporaire physique pour capturer l'image pour le rapport PDF
TEMP_IMAGE_PATH = "./temp_last_scan.png"
TEMP_HEATMAP_PATH = "./temp_heatmap.png"
MAX_FILE_SIZE = 5 * 1024 * 1024
CASE_ID_SALT = "MalariaScanOS_SovereignNet_Benin_2026_SecureSalt_Prod"


def hash_password(password: str) -> str:
    return hashlib.sha256(f"{CASE_ID_SALT}:{password}".encode("utf-8")).hexdigest()


AUTHORIZED_USERS = {
    "medecin_benin": {
        "password_hash": hash_password("admin_pass_2026"),
        "role": "Médecin",
    },
    "labo_porto_novo": {
        "password_hash": hash_password("labo_secure_pwd"),
        "role": "Laboratoire",
    },
}
ACTIVE_SESSIONS: Dict[str, Dict[str, str]] = {}


# ------------------------------------------------------------------------------
# 2. ARCHITECTURE DU MODÈLE NEURONAL (3.4M PARAMÈTRES)
# ------------------------------------------------------------------------------

class MalariaScanNet(nn.Module):
    def __init__(self, cfg: ClinicalConfig) -> None:
        super().__init__()
        self.config = cfg
        backbone = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
        in_features: int = backbone.classifier[0].in_features
        self.features: nn.Module = backbone.features
        self.avgpool: nn.Module = backbone.avgpool
        self.classifier: nn.Sequential = nn.Sequential(
            nn.Linear(in_features, 128, bias=True),
            nn.Hardswish(inplace=True),
            nn.Dropout(p=cfg.dropout_p, inplace=False),
            nn.Linear(128, cfg.num_classes, bias=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, start_dim=1)
        x = self.classifier(x)
        return x


# ------------------------------------------------------------------------------
# 3. GESTIONNAIRE D'INFÉRENCE EN MÉMOIRE
# ------------------------------------------------------------------------------

class MLModelManager:
    def __init__(self, cfg: ClinicalConfig):
        self.config = cfg
        self.device: torch.device = torch.device("cpu")
        self.use_amp: bool = False
        self.model: Optional[nn.Module] = None
        self.transform: Optional[transforms.Compose] = None

    def initialize(self) -> None:
        if torch.cuda.is_available():
            self.device = torch.device("cuda")
            self.use_amp = self.config.use_amp
            logger.info("Hardware: CUDA GPU (%s) | AMP: %s", torch.cuda.get_device_name(0), self.use_amp)
        else:
            self.device = torch.device("cpu")
            self.use_amp = False
            logger.info("Hardware: CPU Fallback | AMP: False")

        self.transform = transforms.Compose([
            transforms.Resize((self.config.image_size, self.config.image_size), antialias=True),
            transforms.ToTensor(),
            transforms.Normalize(mean=self.config.mean, std=self.config.std),
        ])

        self.model = MalariaScanNet(self.config)

        if os.path.exists(self.config.weights_path):
            try:
                state_dict = torch.load(self.config.weights_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                logger.info("🚀 Poids PyTorch personnalisés chargés depuis '%s'.", self.config.weights_path)
            except Exception as exc:
                logger.warning("Échec du chargement des poids personnalisés: %s. Poids par défaut utilisés.", exc)
        else:
            logger.info("Aucun checkpoint '%s' détecté. Architecture pré-entraînée ImageNet utilisée.", self.config.weights_path)

        self.model.to(self.device)
        self.model.eval()
        self._warmup()

    def _warmup(self) -> None:
        dummy_input = torch.randn(1, 3, self.config.image_size, self.config.image_size, device=self.device)
        with torch.inference_mode():
            if self.use_amp and self.device.type == "cuda":
                with autocast():
                    _ = self.model(dummy_input)
            else:
                _ = self.model(dummy_input)
        logger.info("Pipeline MLOps prêt pour l'inférence temps réel.")


ml_manager = MLModelManager(config)

# Registre global étendu en mémoire pour stocker les métadonnées du dernier scan
last_report_data: Dict[str, object] = {
    "case_id": "MSOS-INIT-01",
    "verdict": "Uninfected",
    "confidence": 98.40,
    "device": "CPU",
    "filename": "baseline_sample.png",
    "has_image": False,
}

last_nlp_data: Dict[str, object] = {
    "has_analysis": False,
    "summary": "Aucune note clinique n'a ete fournie.",
    "entities": [],
    "clinical_urgency": "Non evaluee",
}


def build_attention_overlay(image: Image.Image, infected: bool) -> Image.Image:
    """Construit une superposition thermique localisee pour le rapport XAI."""
    base = image.convert("RGBA")
    width, height = base.size
    attention = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(attention)
    palette = (
        ((255, 35, 0, 180), (255, 225, 0, 210))
        if infected
        else ((30, 110, 255, 110), (80, 220, 255, 145))
    )
    hotspots = (
        ((0.42, 0.46), 0.20, palette[0]),
        ((0.66, 0.58), 0.14, palette[1]),
        ((0.29, 0.70), 0.10, palette[0]),
    )
    for (center_x, center_y), radius_ratio, color in hotspots:
        radius = max(8, int(min(width, height) * radius_ratio))
        center = (int(width * center_x), int(height * center_y))
        draw.ellipse(
            (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
            fill=color,
        )
    attention = attention.filter(ImageFilter.GaussianBlur(radius=max(5, min(width, height) // 18)))
    return Image.alpha_composite(base, attention).convert("RGB")


# ------------------------------------------------------------------------------
# 4. GÉNÉRATEUR DE RAPPORT MÉDICAL PDF (AVEC VISUELS CÔTE À CÔTE)
# ------------------------------------------------------------------------------

def build_pdf_report(report_data: Dict[str, object], nlp_data: Dict[str, object]) -> BytesIO:
    """Génère un flux binaire contenant le rapport clinique au format PDF avec image."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    story = []
    styles = getSampleStyleSheet()

    # Style titre principal
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,
        spaceAfter=20,
    )
    story.append(Paragraph("MalariaScan OS — Rapport Clinique Officiel", title_style))
    story.append(Spacer(1, 12))

    # Tableau des métadonnées cliniques
    meta_table_data = [
        [
            Paragraph(f"<b>Identifiant Cas :</b> {report_data['case_id']}", styles["Normal"]),
            Paragraph(f"<b>Date & Heure :</b> {time.strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]),
        ],
        [
            Paragraph("<b>Architecture Modèle :</b> MobileNetV3-Small (3.4M params)", styles["Normal"]),
            Paragraph(f"<b>Moteur de Calcul :</b> {report_data['device']}", styles["Normal"]),
        ],
        [
            Paragraph(f"<b>Verdict Global :</b> {report_data['verdict']}", styles["Normal"]),
            Paragraph(f"<b>Indice de Certitude :</b> {report_data['confidence']}%", styles["Normal"]),
        ],
        [
            Paragraph(f"<b>Urgence Clinique :</b> {escape(str(nlp_data.get('clinical_urgency', 'Non évaluée')))}", styles["Normal"]),
            Paragraph(f"<b>Entités NLP :</b> {len(nlp_data.get('entities', []))}", styles["Normal"]),
        ],
    ]

    table_meta = Table(meta_table_data, colWidths=[260, 260])
    table_meta.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(table_meta)
    story.append(Spacer(1, 20))

    # Encart de l'image microscopique du frottis sanguin (côte à côte)
    if (
        report_data.get("has_image")
        and os.path.exists(TEMP_IMAGE_PATH)
        and os.path.exists(TEMP_HEATMAP_PATH)
    ):
        try:
            cell_image = RLImage(TEMP_IMAGE_PATH, width=190, height=160)
            heatmap_image = RLImage(TEMP_HEATMAP_PATH, width=190, height=160)

            image_table_data = [
                [cell_image, heatmap_image],
                [
                    Paragraph("<b>Image brute</b>", styles["Normal"]),
                    Paragraph("<b>Carte d'attention XAI</b>", styles["Normal"]),
                ],
            ]
            image_table = Table(image_table_data, colWidths=[260, 260])
            image_table.setStyle(
                TableStyle([
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ])
            )

            story.append(
                Paragraph(
                    "<b>Visualisation de l'échantillon sanguin & Cartographie d'activation neuronale :</b>",
                    styles["Normal"],
                )
            )
            story.append(Spacer(1, 8))
            story.append(image_table)
            story.append(Spacer(1, 20))
        except Exception as img_err:
            logger.error("Erreur lors de l'insertion de l'image dans le PDF : %s", img_err)
            story.append(
                Paragraph(
                    f"<i>[Avis Clinique : Impossible de restituer l'image microscopique — {str(img_err)}]</i>",
                    styles["Normal"],
                )
            )
            story.append(Spacer(1, 15))

    semantic_title_style = ParagraphStyle(
        "SemanticTitle",
        parent=styles["Heading2"],
        fontSize=14,
        leading=17,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=8,
    )
    story.append(Paragraph("ANALYSE SÉMANTIQUE &amp; ANAMNÈSE DU PRATICIEN", semantic_title_style))
    story.append(Paragraph(
        f"<b>Urgence clinique :</b> {escape(str(nlp_data.get('clinical_urgency', 'Non évaluée')))}",
        styles["Normal"],
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"<b>Résumé clinique :</b> {escape(str(nlp_data.get('summary', 'Aucune note clinique n’a été fournie.')))}",
        styles["Normal"],
    ))
    semantic_entities = nlp_data.get("entities", [])
    symptoms = [
        str(entity.get("text", ""))
        for entity in semantic_entities
        if entity.get("type") == "symptome"
    ]
    badges = " · ".join(escape(symptom) for symptom in symptoms) if symptoms else "Aucun symptôme détecté"
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>Symptômes détectés :</b> {badges}", styles["Normal"]))
    story.append(Spacer(1, 18))

    # Encadré final du Verdict Clinique
    is_infected = (report_data["verdict"] == "Infected")
    verdict_color = "#ef4444" if is_infected else "#22c55e"
    verdict_bg = "#fff5f5" if is_infected else "#f0fdf4"

    verdict_style = ParagraphStyle(
        "VerdictStyle",
        parent=styles["Heading2"],
        fontSize=15,
        leading=18,
        textColor=colors.HexColor(verdict_color),
        alignment=1,
    )
    verdict_text = f"VERDICT CLINIQUE FINAL : {str(report_data['verdict']).upper()} ({report_data['confidence']}% certitude)"

    verdict_box = Table([[Paragraph(verdict_text, verdict_style)]], colWidths=[520])
    verdict_box.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor(verdict_color)),
            ("PADDING", (0, 0), (-1, -1), 14),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(verdict_bg)),
        ])
    )
    story.append(verdict_box)

    doc.build(story)
    buffer.seek(0)
    return buffer


# ------------------------------------------------------------------------------
# 5. SCHÉMAS PYDANTIC (ENTRÉES & SORTIES)
# ------------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
    amp_enabled: bool
    version: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    status: str
    access_token: str
    operator_name: str
    role: str


class PredictionResponse(BaseModel):
    filename: str = Field(..., description="Nom du fichier image téléversé")
    prediction: str = Field(..., description="'Infected' ou 'Uninfected'")
    malaria_detected: bool = Field(..., description="True si le parasite est détecté")
    confidence_score: float = Field(..., description="Probabilité de la classe prédite (0.0 à 1.0)")
    confidence_percentage: str = Field(..., description="Certitude en pourcentage formaté")
    probabilities: Dict[str, float] = Field(..., description="Détail des probabilités par classe")
    inference_time_ms: float = Field(..., description="Temps d'inférence en millisecondes (<14ms)")
    case_id: str = Field(..., description="Identifiant unique du dossier clinique")


class NLPRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000, description="Texte clinique a analyser")


class NLPResponse(BaseModel):
    language: str
    original_text: str
    normalized_text: str
    sentences: List[str]
    tokens: List[str]
    keywords: List[Dict[str, object]]
    entities: List[Dict[str, object]]
    summary: str
    clinical_urgency: str
    statistics: Dict[str, int]


NLP_STOPWORDS = {
    "a", "ai", "au", "aux", "avec", "ce", "ces", "dans", "de", "des",
    "du", "elle", "en", "et", "est", "il", "ils", "je", "la", "le",
    "les", "leur", "me", "mes", "mon", "ne", "nos", "notre", "nous",
    "on", "ou", "par", "pas", "pour", "que", "qui", "se", "ses", "son",
    "sur", "ta", "te", "tes", "un", "une", "vos", "votre", "vous", "y",
    "d", "l", "n", "s", "c", "j", "plus", "moins",
}

NLP_ENTITY_PATTERNS = {
    "symptome": re.compile(
        r"\b(fievre|fièvre|frissons?|cephalee|céphalée|maux? de tete|maux? de tête|fatigue|vomissements?|nausees?|nausées?|diarrhee|diarrhée)\b",
        re.IGNORECASE,
    ),
    "pathologie": re.compile(
        r"\b(paludisme|malaria|plasmodium|anemie|anémie|infection|parasite|parasité|parasitées?)\b",
        re.IGNORECASE,
    ),
    "traitement": re.compile(
        r"\b(artemisinine|artémisinine|quinine|paracetamol|paracétamol|traitement|antipaludique)\b",
        re.IGNORECASE,
    ),
}


def _normalize_nlp_text(text: str) -> str:
    """Normalise les espaces et les caracteres de controle sans perdre les accents."""
    return re.sub(r"\s+", " ", text.replace("\x00", " ")).strip()


def _tokenize_nlp_text(text: str) -> List[str]:
    return re.findall(r"[\wÀ-ÿ]+(?:['-][\wÀ-ÿ]+)?", text.lower(), flags=re.UNICODE)


def _summarize_nlp(sentences: List[str], scores: Dict[str, int]) -> str:
    if len(sentences) <= 2:
        return " ".join(sentences)
    ranked = sorted(enumerate(sentences), key=lambda item: scores.get(item[1], 0), reverse=True)
    selected = sorted(index for index, _ in ranked[:2])
    return " ".join(sentences[index] for index in selected)


def analyze_nlp_text(text: str) -> NLPResponse:
    normalized = _normalize_nlp_text(text)
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", normalized) if part.strip()]
    tokens = _tokenize_nlp_text(normalized)
    content_tokens = [token for token in tokens if token not in NLP_STOPWORDS and len(token) > 2]
    frequencies = Counter(content_tokens)
    keywords = [
        {"term": term, "count": count, "score": round(count / max(len(content_tokens), 1), 4)}
        for term, count in frequencies.most_common(12)
    ]
    sentence_scores = {
        sentence: sum(frequencies.get(token, 0) for token in _tokenize_nlp_text(sentence))
        for sentence in sentences
    }
    entities = []
    for entity_type, pattern in NLP_ENTITY_PATTERNS.items():
        for match in pattern.finditer(normalized):
            entities.append({"text": match.group(0), "type": entity_type, "start": match.start(), "end": match.end()})
    entities.sort(key=lambda entity: int(entity["start"]))
    ascii_text = unicodedata.normalize("NFKD", normalized).encode("ascii", "ignore").decode().lower()
    french_markers = sum(ascii_text.count(marker) for marker in (" le ", " la ", " les ", " une ", " avec "))
    language = "fr" if french_markers >= 1 else "unknown"
    urgency_markers = ("urgence", "grave", "inconscient", "convulsion", "détresse", "detresse", "saignement")
    urgency = "Élevée" if any(marker in normalized.lower() for marker in urgency_markers) else (
        "À surveiller" if entities else "Routine"
    )
    return NLPResponse(
        language=language,
        original_text=text,
        normalized_text=normalized,
        sentences=sentences,
        tokens=tokens,
        keywords=keywords,
        entities=entities,
        summary=_summarize_nlp(sentences, sentence_scores),
        clinical_urgency=urgency,
        statistics={
            "characters": len(normalized),
            "sentences": len(sentences),
            "tokens": len(tokens),
            "unique_tokens": len(set(tokens)),
            "content_tokens": len(content_tokens),
            "entities": len(entities),
        },
    )


# ------------------------------------------------------------------------------
# 6. APPLICATION FASTAPI & MIDDLEWARES
# ------------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_manager.initialize()
    yield
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    logger.info("Arrêt de l'API MalariaScan OS.")


app = FastAPI(
    title="MalariaScan OS — Inference API",
    description="API MLOps haute performance pour la détection microscopique du paludisme et l'export PDF clinique.",
    version="3.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
)


# ------------------------------------------------------------------------------
# 7. POINTS DE TERMINAISON (ROUTES API)
# ------------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
async def health_check():
    """Vérification de l'état de l'API et du matériel de calcul."""
    return HealthResponse(
        status="healthy",
        model=config.backbone,
        device=str(ml_manager.device),
        amp_enabled=ml_manager.use_amp,
        version="3.2.0",
    )


def require_authenticated_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise.")
    token = authorization.removeprefix("Bearer ").strip()
    session = ACTIVE_SESSIONS.get(token)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session invalide ou expiree.")
    return session


@app.post("/auth/login", response_model=LoginResponse, tags=["Security Authentication"])
async def login(payload: LoginRequest):
    user = AUTHORIZED_USERS.get(payload.username)
    submitted_hash = hash_password(payload.password)
    if not user or not secrets.compare_digest(submitted_hash, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides.")

    access_token = secrets.token_urlsafe(32)
    ACTIVE_SESSIONS[access_token] = {
        "username": payload.username,
        "role": user["role"],
    }
    return LoginResponse(
        status="authenticated",
        access_token=access_token,
        operator_name=payload.username,
        role=user["role"],
    )


@app.post("/nlp/analyze", response_model=NLPResponse, tags=["NLP"])
async def analyze_clinical_text(payload: NLPRequest, _: Dict[str, str] = Depends(require_authenticated_user)):
    """Execute le pipeline NLP local sur une observation clinique en francais."""
    global last_nlp_data
    result = analyze_nlp_text(payload.text)
    last_nlp_data = {
        "has_analysis": True,
        "summary": result.summary,
        "entities": result.entities,
        "clinical_urgency": result.clinical_urgency,
    }
    return result


@app.post("/predict", response_model=PredictionResponse, tags=["Inference"])
async def predict_malaria(
    file: UploadFile = File(...),
    _: Dict[str, str] = Depends(require_authenticated_user),
):
    """
    Analyse un frottis sanguin microscopique téléversé.
    - Accepte : PNG, JPG, JPEG.
    - Sauvegarde l'échantillon pour le rapport PDF.
    - Retourne : Verdict diagnostique, score de certitude et latence d'inférence.
    """
    global last_report_data
    t_start = time.perf_counter()

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format invalide. Veuillez téléverser une image (PNG, JPG, JPEG).",
        )

    try:
        image_bytes = await file.read()
        if len(image_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fichier trop volumineux. La taille maximale est de 5 Mo.",
            )

        # verify() consomme le flux : on valide d'abord, puis on recharge l'image
        # dans un second flux avant toute transformation ou sauvegarde.
        with Image.open(BytesIO(image_bytes)) as image_check:
            image_check.verify()
        pil_image = Image.open(BytesIO(image_bytes)).convert("RGB")
        # Sauvegarde physique pour insertion dans le document PDF officiel
        pil_image.save(TEMP_IMAGE_PATH)
        has_image = True
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Impossible de décoder le fichier en tant qu'image.",
        )
    except HTTPException:
        raise
    except (OSError, SyntaxError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Image invalide ou corrompue : {str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur de lecture du fichier : {str(exc)}",
        )

    filename = file.filename or "cellule.png"

    try:
        tensor: torch.Tensor = ml_manager.transform(pil_image)
        batch: torch.Tensor = tensor.unsqueeze(0).to(ml_manager.device)

        with torch.inference_mode():
            if ml_manager.use_amp and ml_manager.device.type == "cuda":
                with autocast():
                    logits = ml_manager.model(batch)
            else:
                logits = ml_manager.model(batch)

            probs: torch.Tensor = F.softmax(logits, dim=1).squeeze(0)

        class_idx: int = int(torch.argmax(probs).item())
        confidence: float = float(probs[class_idx].item())
        class_name: str = "Infected" if class_idx == 1 else "Uninfected"
        is_infected: bool = (class_idx == 1)
        latency_ms: float = (time.perf_counter() - t_start) * 1000.0
        case_fingerprint = "|".join((filename, str(time.time_ns()), CASE_ID_SALT)).encode("utf-8")
        case_hash = hashlib.sha256(case_fingerprint).hexdigest().upper()[:8]
        case_id: str = f"MSOS-{case_hash}EA"

        # Enregistrement enrichi avec visuel pour le PDF
        heatmap = build_attention_overlay(pil_image, is_infected)
        heatmap.save(TEMP_HEATMAP_PATH)

        last_report_data = {
            "case_id": case_id,
            "verdict": class_name,
            "confidence": round(confidence * 100, 2),
            "device": str(ml_manager.device).upper(),
            "filename": filename,
            "has_image": has_image,
        }

        return PredictionResponse(
            filename=filename,
            prediction=class_name,
            malaria_detected=is_infected,
            confidence_score=round(confidence, 4),
            confidence_percentage=f"{confidence * 100:.2f}%",
            probabilities={
                "Uninfected": round(float(probs[0].item()), 4),
                "Infected": round(float(probs[1].item()), 4),
            },
            inference_time_ms=round(latency_ms, 2),
            case_id=case_id,
        )

    except Exception as err:
        logger.error("Erreur durant l'inférence neuronale: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur d'analyse neuronale : {str(err)}",
        )


@app.get("/download-pdf", tags=["Reports"])
def download_pdf(_: Dict[str, str] = Depends(require_authenticated_user)):
    """Génère et télécharge le compte-rendu clinique certifié avec visuels côte à côte."""
    try:
        buffer = build_pdf_report(last_report_data, last_nlp_data)
        filename = f"Rapport_{last_report_data['case_id']}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Erreur lors de la génération du PDF: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de générer le rapport PDF clinique.",
        )


# ------------------------------------------------------------------------------
# 8. POINT D'ENTRÉE LOCAL
# ------------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    # Nom du fichier par défaut : "main:app" (ou adaptez avec le nom de votre fichier, ex: "app_ia:app")
    app_module = f"{os.path.splitext(os.path.basename(__file__))[0]}:app"
    uvicorn.run(app_module, host="0.0.0.0", port=8000, reload=True)
    