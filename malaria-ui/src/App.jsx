import { useCallback, useRef, useState } from "react"
import {
  Cpu, ScanLine, BarChart3, Trophy, Activity, Microscope,
  Wifi, Layers, Target, Zap, MapPin, TrendingUp,
  UploadCloud, CheckCircle2, RotateCcw, ServerCrash,
  Award, Users, GitBranch, FileDown, Hash, FileText, Send, Languages,
  UserRound, LockKeyhole, ShieldCheck,
} from "lucide-react"


const API_URL = "http://localhost:8000/predict"
const PDF_URL = "http://localhost:8000/download-pdf"
const NLP_API_URL = "http://localhost:8000/nlp/analyze"

/* ------------------------------------------------------------------ */
/* utils                                                               */
/* ------------------------------------------------------------------ */
const cn = (...classes) => classes.filter(Boolean).join(" ")

function LoginScreen({ onAuthenticated }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const submitLogin = async (event) => {
    event.preventDefault()
    setErrorMsg("")
    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "Identifiants invalides")
      onAuthenticated(data)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Authentification impossible")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-8 text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-texture opacity-40" />
      <section className="relative w-full max-w-md rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl border border-primary/50 bg-primary/10 text-primary glow-cyan">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Secure clinical gateway</p>
            <p className="mt-1 text-xs text-muted-foreground">SovereignNet · Bénin</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold leading-tight text-gradient-brand glow-text-cyan sm:text-3xl">
          MalariaScan OS — Portail Clinique Sécurisé
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Authentification requise — MLOps National Bénin
        </p>
        <form onSubmit={submitLogin} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Identifiant Professionnel</span>
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-xl border border-border bg-background/70 py-3 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary/70"
                placeholder="Votre identifiant"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Mot de passe de session</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-border bg-background/70 py-3 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary/70"
                placeholder="Mot de passe sécurisé"
              />
            </span>
          </label>
          {errorMsg && (
            <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 font-mono text-xs text-red-300">
              {errorMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            <ShieldCheck className="size-4" />
            {isLoading ? "Vérification sécurisée..." : "Activer la session médicale"}
          </button>
        </form>
      </section>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* scoped theme + animations + custom utilities                        */
/* Requires Tailwind (v4) to be present for layout utility classes.    */
/* ------------------------------------------------------------------ */
const ThemeStyles = () => (
  <style>{`
    :root {
      color-scheme: dark;
      --background: oklch(0.16 0.02 250);
      --foreground: oklch(0.95 0.01 230);
      --card: oklch(0.21 0.025 255);
      --primary: oklch(0.85 0.15 200);
      --primary-foreground: oklch(0.15 0.02 250);
      --secondary: oklch(0.27 0.03 255);
      --muted-foreground: oklch(0.68 0.03 240);
      --accent: oklch(0.68 0.24 350);
      --border: oklch(0.4 0.04 240 / 22%);
      --sidebar: oklch(0.18 0.022 255);
      --cyan: #00f2fe;
      --magenta: #ff2e97;
      --radius: 0.9rem;
    }

    body {
      background-color: var(--background);
      color: var(--foreground);
      background-image:
        radial-gradient(ellipse 60% 50% at 15% 0%, oklch(0.85 0.15 200 / 0.08), transparent 60%),
        radial-gradient(ellipse 50% 50% at 100% 100%, oklch(0.68 0.24 350 / 0.08), transparent 55%),
        linear-gradient(to bottom, transparent 0%, oklch(0.13 0.02 255 / 0.5) 100%);
      background-attachment: fixed;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    .font-mono { font-family: ui-monospace, "JetBrains Mono", monospace; }

    /* color tokens */
    .bg-background { background-color: var(--background); }
    .text-foreground { color: var(--foreground); }
    .text-primary { color: var(--primary); }
    .text-accent { color: var(--accent); }
    .text-muted-foreground { color: var(--muted-foreground); }
    .border-border { border-color: var(--border); }

    /* custom utilities */
    .text-gradient-brand {
      background-image: linear-gradient(100deg, var(--cyan), var(--magenta));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .glow-cyan {
      box-shadow: 0 0 0 1px oklch(0.85 0.15 200 / 0.35), 0 0 24px oklch(0.85 0.15 200 / 0.25);
    }
    .glow-text-cyan { text-shadow: 0 0 18px oklch(0.85 0.15 200 / 0.55); }
    .grid-texture {
      background-image:
        linear-gradient(oklch(0.85 0.15 200 / 0.05) 1px, transparent 1px),
        linear-gradient(90deg, oklch(0.85 0.15 200 / 0.05) 1px, transparent 1px);
      background-size: 34px 34px;
    }

    .animate-scan { animation: scan 2.4s ease-in-out infinite; }
    .animate-flicker { animation: flicker 4s linear infinite; }
    .animate-fade-up { animation: fadeUp 0.6s ease-out both; }
    @keyframes scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
    @keyframes flicker { 0%,100% { opacity: 1; } 48% { opacity: 1; } 50% { opacity: 0.55; } 52% { opacity: 1; } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
)

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */
const NAV = [
  { id: "central", label: "Système central", icon: Cpu },
  { id: "scanner", label: "Scanner PyTorch", icon: ScanLine },
  { id: "nlp", label: "Pipeline NLP", icon: FileText },
  { id: "data", label: "Données analytiques", icon: BarChart3 },
  { id: "about", label: "À propos", icon: Trophy },
]

function Sidebar({ currentTab, onNavigate, operatorName }) {
  return (
    <aside className="flex shrink-0 flex-col gap-8 border-r border-border bg-sidebar/60 px-4 py-6 backdrop-blur-xl lg:w-64 lg:px-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary glow-cyan">
          <Microscope className="size-5" />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight text-foreground lg:block">
          MalariaScan
          <span className="block font-mono text-[11px] font-normal text-muted-foreground">
            v3.4 · edge build
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
        <ShieldCheck className="size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Opérateur connecté</p>
          <p className="truncate text-xs font-semibold text-primary">{operatorName}</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        <p className="mb-2 hidden px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground lg:block">
          Navigation
        </p>
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = currentTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-primary/10 text-primary glow-cyan"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4.5 transition-transform duration-300 group-hover:scale-110",
                  isActive && "drop-shadow-[0_0_6px_var(--cyan)]"
                )}
              />
              <span className="hidden lg:inline">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto hidden rounded-xl border border-border bg-card/60 p-4 lg:block">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="size-3.5 text-primary" />
          <span className="font-mono">Cluster Load</span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-primary to-accent" />
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          62% · 4 nodes online
        </p>
      </div>
    </aside>
  )
}

function NLPZone({ authToken }) {
  const [text, setText] = useState("")
  const [result, setResult] = useState(null)
  const [phase, setPhase] = useState("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const analyzeText = async (event) => {
    event.preventDefault()
    if (!text.trim()) return
    setPhase("loading")
    setErrorMsg("")
    try {
      const response = await fetch(NLP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} — ${response.statusText}`)
      setResult(await response.json())
      setPhase("done")
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Analyse NLP échouée")
      setPhase("error")
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">Analyse de texte clinique</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Normalisation, extraction d'entités médicales, mots-clés et résumé extractif.
      </p>
      <form onSubmit={analyzeText} className="mt-4 space-y-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ex. Le patient présente une fièvre et des frissons..."
          maxLength={20000}
          rows={7}
          className="w-full resize-y rounded-xl border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">{text.length} / 20000 caractères</span>
          <button
            type="submit"
            disabled={phase === "loading" || !text.trim()}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-4" />
            {phase === "loading" ? "Analyse..." : "Analyser le texte"}
          </button>
        </div>
      </form>

      {phase === "error" && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 font-mono text-xs text-accent">
          {errorMsg}. Vérifiez que l'API FastAPI est démarrée.
        </p>
      )}

      {result && phase === "done" && (
        <div className="mt-5 space-y-4 animate-fade-up">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(result.statistics).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center">
                <p className="font-mono text-lg font-bold text-primary">{value}</p>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label.replace("_", " ")}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Languages className="size-4" /> Résumé · langue {result.language}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{result.summary || "Aucun résumé disponible."}</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entités médicales</p>
            <div className="flex flex-wrap gap-2">
              {result.entities.length ? result.entities.map((entity, index) => (
                <span key={`${entity.text}-${index}`} className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-xs text-accent">
                  {entity.text} · {entity.type}
                </span>
              )) : <span className="text-xs text-muted-foreground">Aucune entité détectée.</span>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mots-clés</p>
            <div className="flex flex-wrap gap-2">
              {result.keywords.map((keyword) => (
                <span key={keyword.term} className="rounded-lg border border-border bg-secondary/50 px-2.5 py-1 font-mono text-xs text-foreground">
                  {keyword.term} <span className="text-primary">×{keyword.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
function DashboardHeader({ title, subtitle }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          <span className="text-gradient-brand glow-text-cyan">{title}</span>
        </h1>
        <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2.5 self-start rounded-full border border-primary/30 bg-card/70 px-4 py-2 backdrop-blur-md sm:self-auto">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
        <span className="font-mono text-xs text-foreground">
          System Status: <span className="text-primary">Online</span>
        </span>
        <span className="hidden h-4 w-px bg-border sm:block" />
        <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground sm:flex">
          <Wifi className="size-3.5" />
          Distributed MLOps Benin
        </span>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Stats cards                                                         */
/* ------------------------------------------------------------------ */
const STATS = [
  { value: "3.4M", label: "Backbone Parameters", subtext: "MobileNetV3-Small", icon: Layers },
  { value: "98.4%", label: "Target Accuracy", subtext: "NIH Malaria Dataset", icon: Target },
  { value: "< 14ms", label: "Inference Latency", subtext: "PyTorch AMP Optimized", icon: Zap },
]

function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {STATS.map(({ value, label, subtext, icon: Icon }) => (
        <div
          key={label}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:glow-cyan"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
          <div className="flex items-center justify-between">
            <span className="grid size-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
              <Icon className="size-4.5" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              live
            </span>
          </div>
          <p className="mt-5 font-mono text-3xl font-bold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary group-hover:glow-text-cyan">
            {value}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{subtext}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Scanner zone (live FastAPI inference)                               */
/* ------------------------------------------------------------------ */
function ScannerZone({ authToken }) {
  const [phase, setPhase] = useState("idle") // 'idle' | 'scanning' | 'done' | 'error'
  const [image, setImage] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [clinicalNotes, setClinicalNotes] = useState("")
  const inputRef = useRef(null)

  // ---- Live prediction state adapté aux clés réelles de l'API Python ----
  const [prediction, setPrediction] = useState(null)     // string: "Infected" ou "Uninfected"
  const [confidence, setConfidence] = useState(null)     // string déjà formatée: "98.74%"
  const [latency, setLatency] = useState(null)           // float/number: 11.40
  const [caseId, setCaseId] = useState(null)             // string: "MSOS-12345EA"

  const runInference = useCallback(async (file, previewSrc) => {
    setImage(previewSrc)
    setErrorMsg("")
    setPrediction(null)
    setConfidence(null)
    setLatency(null)
    setCaseId(null)
    setPhase("scanning")

    try {
      if (clinicalNotes.trim()) {
        const nlpResponse = await fetch(NLP_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ text: clinicalNotes.trim() }),
        })
        if (!nlpResponse.ok) {
          throw new Error(`Analyse des notes impossible (HTTP ${nlpResponse.status})`)
        }
      }

      const formData = new FormData()
      formData.append("file", file, file.name || "cellule.png")

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} — ${response.statusText}`)
      }

      const data = await response.json()
      // Liaison exacte avec les clés JSON de l'API FastAPI
      setPrediction(data.prediction)
      setConfidence(data.confidence_percentage) // "98.74%"
      setLatency(data.inference_time_ms)        // 11.40
      setCaseId(data.case_id)                   // "MSOS-12345EA"
      setPhase("done")
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Requête vers l'API échouée"
      )
      setPhase("error")
    }
  }, [clinicalNotes, authToken])

  const handleFile = useCallback(
    (file) => {
      if (!file || !file.type.startsWith("image/")) return
      const reader = new FileReader()
      reader.onload = () => runInference(file, reader.result)
      reader.readAsDataURL(file)
    },
    [runInference]
  )

  const useSample = useCallback(async () => {
    try {
      const res = await fetch("/sample-blood-smear.png")
      const blob = await res.blob()
      const file = new File([blob], "sample-blood-smear.png", { type: blob.type })
      runInference(file, "/sample-blood-smear.png")
    } catch {
      setErrorMsg("Impossible de charger l'échantillon de démonstration")
      setPhase("error")
    }
  }, [runInference])

  const reset = () => {
    setPhase("idle")
    setImage(null)
    setErrorMsg("")
    setClinicalNotes("")
    setPrediction(null)
    setConfidence(null)
    setLatency(null)
    setCaseId(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const isInfected = prediction === "Infected"

  const downloadReport = async () => {
    const response = await fetch(PDF_URL, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (!response.ok) {
      setErrorMsg("Téléchargement du rapport refusé par la session médicale")
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Rapport_${caseId || "clinique"}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section
      aria-label="Blood microscopy scanner"
      className="flex flex-col rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="size-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Scanner de microscopie</h2>
        </div>
        {phase !== "idle" && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <RotateCcw className="size-3" />
            Réinitialiser
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {phase === "idle" && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <label htmlFor="clinical-notes" className="text-xs font-semibold uppercase tracking-wide text-primary">
            Notes cliniques du médecin <span className="font-normal text-muted-foreground">(Optionnel)</span>
          </label>
          <textarea
            id="clinical-notes"
            value={clinicalNotes}
            onChange={(event) => setClinicalNotes(event.target.value)}
            rows={3}
            maxLength={20000}
            placeholder="Symptômes, contexte ou observations du praticien..."
            className="mt-2 w-full resize-y rounded-lg border border-border bg-background/60 px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
          />
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            Ces notes seront analysées avant le scan et fusionnées dans le rapport PDF.
          </p>
        </div>
      )}

      {phase === "idle" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          className={cn(
            "mt-4 grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed transition-all duration-300 grid-texture",
            dragging ? "border-primary bg-primary/5 glow-cyan" : "border-border"
          )}
        >
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="group grid size-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary transition-all duration-300 animate-flicker hover:scale-105 hover:bg-primary/20 hover:glow-cyan"
              aria-label="Téléverser une image de frottis sanguin"
            >
              <UploadCloud className="size-7 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </button>
            <p className="text-sm font-medium text-foreground">Déposez une image de frottis sanguin</p>
            <p className="max-w-[15rem] text-pretty font-mono text-xs text-muted-foreground">
              Glissez-déposez, ou utilisez les boutons ci-dessous pour lancer
              l'inférence sur un échantillon
            </p>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 font-mono text-[11px] text-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                Parcourir
              </button>
              <button
                type="button"
                onClick={useSample}
                className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/20"
              >
                Échantillon test
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-primary/30">
            <img
              src={image ?? "/sample-blood-smear.png"}
              alt="Échantillon de microscopie téléversé"
              className="absolute inset-0 size-full object-cover"
            />
            <div
              className={cn(
                "absolute inset-0 bg-background/30 transition-opacity duration-500",
                phase === "done" && "opacity-0"
              )}
            />
            {phase === "scanning" && (
              <>
                <div className="absolute inset-x-0 top-0 -translate-y-1/2 animate-scan">
                  <div className="h-0.5 w-full bg-primary shadow-[0_0_20px_6px_var(--cyan)]" />
                  <div className="h-16 w-full bg-gradient-to-b from-primary/25 to-transparent" />
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-primary/40 bg-background/70 px-2.5 py-1 backdrop-blur-sm">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  <span className="font-mono text-[11px] text-primary">
                    Inférence PyTorch en cours…
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ---- RÉSULTATS DYNAMIQUES ALIGNÉS AVEC L'API FASTAPI ---- */}
          {phase === "done" && prediction !== null && (
            <div className="animate-fade-up space-y-3">
              <div
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-4 py-4 text-center",
                  isInfected
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-green-500/10 border-green-500/30 text-green-400"
                )}
              >
                <p className="text-base font-semibold">
                  {prediction === "Infected"
                    ? "🔴 Parasité (Infected)"
                    : "🟢 Sain (Uninfected)"}
                </p>
                <p className="font-mono text-sm">
                  Confiance : <span className="font-bold">{confidence}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={downloadReport}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-medium text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/30"
              >
                <FileDown className="size-4.5" />
                Télécharger le rapport clinique (PDF)
              </button>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center">
                  <p className="font-mono text-sm font-bold text-primary">{confidence}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Confiance
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center">
                  <p className="font-mono text-sm font-bold text-primary">
                    {latency !== null ? `${latency} ms` : "—"}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Latence
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center">
                  <p className="truncate font-mono text-sm font-bold text-primary" title={caseId ?? ""}>
                    {caseId || "—"}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Cas
                  </p>
                </div>
              </div>

              <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-primary" />
                Réponse live de l'API PyTorch · {API_URL}
              </p>

              {caseId && (
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Hash className="size-3.5 text-primary" />
                  Identifiant du cas : <span className="text-foreground">{caseId}</span>
                </p>
              )}
            </div>
          )}

          {phase === "error" && (
            <div className="animate-fade-up flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
              <ServerCrash className="mt-0.5 size-5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  API injoignable
                </p>
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {errorMsg}. Vérifiez que le serveur FastAPI tourne sur{" "}
                  <span className="text-accent">{API_URL}</span> et que le CORS
                  autorise cette origine.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */
const CLUSTERS = [
  { city: "Cotonou", scans: "12,480", progress: 88, status: "high" },
  { city: "Porto-Novo", scans: "8,210", progress: 64, status: "active" },
  { city: "Parakou", scans: "5,940", progress: 47, status: "active" },
  { city: "Abomey-Calavi", scans: "3,120", progress: 29, status: "idle" },
]

const STATUS_STYLES = {
  high: "bg-accent shadow-[0_0_8px_2px_var(--magenta)]",
  active: "bg-primary shadow-[0_0_8px_2px_var(--cyan)]",
  idle: "bg-muted-foreground",
}

function AnalyticsInsights() {
  return (
    <section
      aria-label="Active screening clusters"
      className="flex flex-col rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">
            Groupes de dépistage actifs
          </h2>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary">
          <TrendingUp className="size-3" />
          +18.2%
        </span>
      </div>

      <p className="mt-1 font-mono text-xs text-muted-foreground">
        République du Bénin · débit temps réel
      </p>

      <div className="mt-5 flex flex-col gap-5">
        {CLUSTERS.map((c) => (
          <div key={c.city}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 animate-pulse rounded-full", STATUS_STYLES[c.status])} />
                <span className="text-sm font-medium text-foreground">{c.city}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {c.scans} scans
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary/60">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  c.status === "high"
                    ? "bg-gradient-to-r from-primary to-accent"
                    : "bg-gradient-to-r from-primary/70 to-primary"
                )}
                style={{ width: `${c.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5">
        <div>
          <p className="font-mono text-2xl font-bold text-foreground">29,750</p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Dépistages totaux
          </p>
        </div>
        <div>
          <p className="font-mono text-2xl font-bold text-accent glow-text-cyan">4.1%</p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Taux de positivité
          </p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* About / Hackathon card                                              */
/* ------------------------------------------------------------------ */
const ABOUT_STACK = ["PyTorch", "FastAPI", "MobileNetV3", "React", "Docker", "ONNX Runtime"]
const ABOUT_HIGHLIGHTS = [
  { icon: Award, title: "Hackathon Capitol", text: "Projet finaliste — santé & IA embarquée" },
  { icon: Users, title: "Impact terrain", text: "Dépistage assisté pour les cliniques du Bénin" },
  { icon: GitBranch, title: "MLOps distribué", text: "Pipeline entraînement → edge inference reproductible" },
]

function AboutCard() {
  return (
    <section className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-md">
      <div className="relative border-b border-border p-6 grid-texture sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-primary/10 blur-3xl" />
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent">
          <Trophy className="size-3.5" />
          Hackathon Capitol
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          <span className="text-gradient-brand glow-text-cyan">MalariaScan OS</span>
        </h2>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Un système de détection du paludisme en temps réel à partir d'images
          de microscopie sanguine. Le modèle PyTorch (MobileNetV3-Small,
          quantifié pour l'edge) est servi par une API FastAPI et interrogé en
          direct depuis cette interface — pensé pour assister le diagnostic dans
          les zones à ressources limitées.
        </p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
        {ABOUT_HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-secondary/30 p-4 transition-all duration-300 hover:border-primary/50 hover:glow-cyan"
          >
            <span className="grid size-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Icon className="size-4.5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-pretty text-xs leading-relaxed text-muted-foreground">
              {text}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-6 pb-6 sm:px-8 sm:pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Stack technique
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ABOUT_STACK.map((tech) => (
            <span
              key={tech}
              className="rounded-lg border border-border bg-card/60 px-3 py-1.5 font-mono text-xs text-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Tab views                                                           */
/* ------------------------------------------------------------------ */
const TAB_META = {
  central: {
    title: "MalariaScan OS",
    subtitle: "Pipeline MLOps distribué pour la détection du paludisme en temps réel à partir d'imagerie microscopique.",
  },
  scanner: {
    title: "Scanner PyTorch",
    subtitle: "Téléversez un frottis sanguin pour lancer une inférence live sur le modèle PyTorch servi par FastAPI.",
  },
  nlp: {
    title: "Pipeline NLP",
    subtitle: "Transformez une observation clinique en données structurées grâce à l'analyse locale du texte.",
  },
  data: {
    title: "Données analytiques",
    subtitle: "Suivi temps réel des campagnes de dépistage à travers la République du Bénin.",
  },
  about: {
    title: "À propos du projet",
    subtitle: "Présentation de MalariaScan OS pour le Hackathon Capitol.",
  },
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */
export default function App() {
  const [currentTab, setCurrentTab] = useState("central")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [operatorName, setOperatorName] = useState("")
  const [authToken, setAuthToken] = useState("")
  const meta = TAB_META[currentTab]

  return (
    <>
      <ThemeStyles />
      {!isAuthenticated ? (
        <LoginScreen
          onAuthenticated={(session) => {
            setIsAuthenticated(true)
            setOperatorName(session.operator_name)
            setAuthToken(session.access_token)
          }}
        />
      ) : (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar currentTab={currentTab} onNavigate={setCurrentTab} operatorName={operatorName} />

        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <DashboardHeader title={meta.title} subtitle={meta.subtitle} />

            {currentTab === "central" && (
              <>
                <StatsCards />
                <div className="grid gap-6 lg:grid-cols-2">
                  <ScannerZone authToken={authToken} />
                  <AnalyticsInsights />
                </div>
              </>
            )}

            {currentTab === "scanner" && (
              <div className="mx-auto w-full max-w-xl">
                <ScannerZone authToken={authToken} />
              </div>
            )}

            {currentTab === "nlp" && (
              <div className="mx-auto w-full max-w-4xl">
                <NLPZone authToken={authToken} />
              </div>
            )}

            {currentTab === "data" && (
              <>
                <StatsCards />
                <AnalyticsInsights />
              </>
            )}

            {currentTab === "about" && <AboutCard />}
          </div>
        </main>
      </div>
      )}
    </>
  )
}