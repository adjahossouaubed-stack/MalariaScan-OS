# MalariaScan OS

Plateforme biomédicale MLOps (FastAPI + PyTorch + React) pour la détection du paludisme au Bénin.

MalariaScan OS permet à un praticien de déposer une image de frottis sanguin, d'y ajouter des notes cliniques optionnelles, et d'obtenir une analyse automatisée assistée par IA — le tout restitué dans un tableau de bord de suivi épidémiologique en temps réel.

## Fonctionnalités

- **Scanner de microscopie** : dépôt (glisser-déposer) d'une image de frottis sanguin pour détection automatique du paludisme.
- **Notes cliniques du médecin** : un champ optionnel permet au praticien de saisir symptômes et observations, analysées via un pipeline NLP et fusionnées avec le résultat du scan dans un rapport PDF.
- **Pipeline NLP** : traitement du texte clinique en complément de l'analyse d'image.
- **Données analytiques** : tableau de bord de suivi des dépistages avec répartition par ville (Cotonou, Porto-Novo, Parakou, Abomey-Calavi) et taux de positivité en temps réel.

## Modèle

- **Architecture** : MobileNetV3-Petit
- **Données d'entraînement** : ensemble de données sur le paludisme du NIH
- **Inférence** : optimisée avec PyTorch AMP (Automatic Mixed Precision) pour une faible latence

## Stack technique

- **Backend** : FastAPI, PyTorch
- **Frontend** : React (Vite)
- **NLP** : pipeline de traitement du texte clinique

## Installation et lancement

### Backend

```bash
# Depuis la racine du projet
pip install -r requirements.txt
uvicorn main:app --reload
```

Le backend est servi par défaut sur `http://localhost:8000`.

### Frontend

```bash
cd malaria-ui
npm install
npm run dev
```

Le frontend est accessible sur `http://localhost:5173`.

## Structure du projet

```
MalariaScan-OS/
├── malaria-ui/           # Frontend React (Vite)
├── main.py               # Point d'entrée du backend FastAPI
├── app_ia.py             # Logique du modèle IA / inférence
├── malaria_model_v3.pth  # Poids du modèle entraîné
├── App.css
└── requirements.txt
```

## Avertissement

Ce projet est développé dans un cadre éducatif (Hack Club — programme Capitol) et ne constitue pas un dispositif médical certifié. Il ne doit pas se substituer à un diagnostic médical professionnel.

## Auteur

Projet développé par [adjahossouaubed](https://github.com/adjahossouaubed-stack).
