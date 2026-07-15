# WiFi DensePose — Chambre Intelligente

> Estimation de pose humaine en temps réel via signaux WiFi (CSI), sans caméra, pour transformer une chambre ordinaire en environnement intelligent.

---

## L'idée

Les caméras classiques posent un problème fondamental dans l'espace privé : **la vie privée**. Ce projet explore une alternative radicale — utiliser le signal WiFi déjà présent dans votre chambre pour détecter et analyser la posture et l'activité humaine, sans aucune caméra.

Le principe s'appuie sur la recherche **"DensePose From WiFi"** (Meta AI / CMU, 2023) : le corps humain perturbe les ondes radio de manière mesurable et reproductible. En analysant ces perturbations (appelées **CSI — Channel State Information**), un réseau de neurones peut reconstruire la pose du corps avec 17 points clés.

```
Routeur WiFi  ──►  Perturbation du signal  ──►  CNN dual-branch  ──►  Squelette 3D
  (émetteur)         par le corps humain          (amplitude+phase)     (17 keypoints)
```

L'application présente ensuite cette détection dans un **dashboard chambre intelligente** : la pièce s'adapte automatiquement à l'activité détectée (endormi → lumières éteintes, exercice → musique activée, etc.).

---

## Comment ça marche

### 1. Capture du signal WiFi (CSI)

Le WiFi 802.11n communique sur plusieurs sous-porteuses de fréquence (56 pour une bande 20 MHz). Chaque sous-porteuse transporte une information de canal complexe :

```
CSI[antenne_rx, antenne_tx, sous-porteuse] = amplitude + phase
```

Avec 3 antennes RX × 3 antennes TX = **9 paires**, on obtient une matrice riche en information spatiale. Quand un corps humain bouge, il modifie le trajet des ondes (réflexions, diffractions) → la matrice CSI change de manière caractéristique selon l'activité.

| Activité   | Fréquence de variation | Amplitude typique |
|------------|------------------------|-------------------|
| Respiration (couché) | 0.2 Hz | faible |
| Debout (statique) | 0.3 Hz | faible |
| Marche | 1.6 Hz | moyenne |
| Exercice | 2.5 Hz | forte |

### 2. Le réseau de neurones — WiFiDensePoseNet

```
CSI amplitude [B, 1, N_pairs×N_sub, T]  ──►  Encodeur CNN (3 blocs conv)  ──►  Feat. 64ch
                                                                                          │
CSI phase     [B, 1, N_pairs×N_sub, T]  ──►  Encodeur CNN (3 blocs conv)  ──►  Feat. 64ch
                                                                                          │
                                                               Fusion bimodale (128 → 64ch)
                                                                                          │
                                                         Décodeur upsampling (heatmaps 17)
                                                                                          │
                                                    17 heatmaps  ──►  17 keypoints (x, y, conf)
```

Les **17 keypoints COCO** couvrent le corps entier :
`nez · yeux · oreilles · épaules · coudes · poignets · hanches · genoux · chevilles`

### 3. Automatisation de la chambre (Smart Room)

La détection d'activité déclenche des ajustements automatiques :

| Activité détectée | Luminosité | Température | Store | Audio |
|-------------------|-----------|-------------|-------|-------|
| Debout            | 90%       | 21°C        | 70%   | —     |
| Assis             | 80%       | 21°C        | 60%   | —     |
| Endormi           | 0%        | 19°C        | 0%    | Bruit blanc |
| Marche            | 100%      | 21°C        | —     | —     |
| Exercice          | 100%      | 19°C        | 50%   | Musique |
| Absent            | 0%        | 18°C        | 0%    | —     |

---

## Architecture technique

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Next.js 15 · React Three Fiber · Tailwind CSS             │
│                                                             │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  Room3D.tsx  │  │ Skeleton3D  │  │ SmartRoomPanel   │  │
│  │  (Three.js)  │  │ (17 joints) │  │ (contrôles auto) │  │
│  └──────────────┘  └─────────────┘  └──────────────────┘  │
│          │                │                  │              │
│          └────────────────┴──────────────────┘             │
│                     useWifiPose.ts                          │
│                    WebSocket client                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket ws://localhost:8000/ws/pose
                           │ REST      http://localhost:8000/api/room
┌──────────────────────────▼──────────────────────────────────┐
│                        BACKEND                              │
│  FastAPI · PyTorch · Python 3.12+                           │
│                                                             │
│  ┌───────────────┐    ┌──────────────────┐                 │
│  │ CSI Simulator │───►│ WiFiDensePoseNet  │                 │
│  │ (802.11n)     │    │ CNN dual-branch   │                 │
│  └───────────────┘    └──────────────────┘                 │
│         │                      │                            │
│         └──────────────────────►                            │
│                    PoseEstimator                            │
│                    WebSocket router (/ws/pose)              │
│                    Room API (/api/room/*)                   │
└─────────────────────────────────────────────────────────────┘
```

### Structure du projet

```
WifiDensePose/
├── backend/
│   ├── app/
│   │   ├── main.py                    # Point d'entrée FastAPI
│   │   ├── core/config.py             # Configuration (antennes, FPS, dimensions)
│   │   ├── models/densepose_net.py    # Réseau PyTorch WiFiDensePoseNet
│   │   ├── services/
│   │   │   ├── csi_simulator.py       # Simulateur CSI 802.11n
│   │   │   └── pose_estimator.py      # Pipeline CSI → keypoints
│   │   └── routers/
│   │       ├── ws.py                  # WebSocket streaming 15 FPS
│   │       └── room.py                # API REST chambre intelligente
│   └── requirements.txt
├── frontend/
│   ├── app/page.tsx                   # Dashboard principal
│   ├── components/
│   │   ├── Room3D.tsx                 # Scène Three.js (chambre + meubles)
│   │   ├── HumanSkeleton3D.tsx        # Squelette 3D animé
│   │   ├── ActivityCard.tsx           # Sélecteur + badge d'activité
│   │   ├── SmartRoomPanel.tsx         # Contrôles luminosité/temp/store
│   │   └── WifiSignalViz.tsx          # Profil CSI sous-porteuses
│   ├── hooks/useWifiPose.ts           # WebSocket + état temps réel
│   └── lib/types.ts                   # Types TypeScript partagés
├── docker-compose.yml
└── start.ps1                          # Script de démarrage rapide
```

---

## Démarrage rapide

### Prérequis

- Python 3.12+
- Node.js 22+
- (Optionnel) Docker + Docker Compose

### Mode développement

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Accès :
- **Dashboard** : http://localhost:3000
- **API Swagger** : http://localhost:8000/docs
- **WebSocket** : ws://localhost:8000/ws/pose

### Mode Docker

```bash
docker compose up --build
```

---

## Passer aux données WiFi réelles

Ce projet fonctionne actuellement avec un **simulateur CSI** réaliste. Pour brancher de vraies données WiFi :

### Option 1 — Carte Intel 5300 (Linux)

```bash
# Installer le driver CSI Tool
# https://dhalperi.github.io/linux-80211n-csitool/
pip install pyserial
```

Remplacer `CSISimulator.generate()` dans `backend/app/services/pose_estimator.py` par :

```python
def generate(self) -> dict:
    raw_csi = self.intel_5300_reader.read_frame()  # données réelles
    amplitude = np.abs(raw_csi)
    phase = np.angle(raw_csi)
    # ... reste du pipeline identique
```

### Option 2 — ESP32 avec Nexmon CSI

```bash
# Flash Nexmon CSI sur ESP32
# https://github.com/nexmonster/nexmon_csi
```

### Option 3 — PicoScenes (universel)

PicoScenes supporte plusieurs cartes WiFi commerciales et exporte directement en format numpy.
Documentation : https://ps.zpj.io

---

## Résultats visuels

Le dashboard affiche en temps réel :

- **Vue 3D** de la chambre avec squelette humain animé (17 keypoints COCO)
- **Pipeline de détection** : état de chaque étape du réseau de neurones
- **Profil CSI** : amplitude par sous-porteuse (2.4 GHz → 5.8 GHz)
- **Contrôles chambre** : luminosité, température, store, audio — ajustés automatiquement

---

## Références

- Geng, J. et al. — *"DensePose From WiFi"* (Meta AI / CMU, 2023) — [arXiv:2301.00250](https://arxiv.org/abs/2301.00250)
- Halperin, D. et al. — *"Tool Release: Gathering 802.11n Traces with Channel State Information"* — ACM SIGCOMM 2011
- [Nexmon CSI Extractor](https://github.com/seemoo-lab/nexmon_csi) — Extraction CSI sur matériel Broadcom
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) — Three.js pour React

---

## Licence

MIT
