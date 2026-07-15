"""
Simulateur CSI (Channel State Information) pour WiFi DensePose.
Génère des données réalistes d'amplitude et de phase WiFi 802.11n
basées sur des activités humaines simulées.

En production : remplacer generate() par la lecture réelle depuis
une carte WiFi compatible CSI (Intel 5300, ESP32, Nexmon, etc.)
"""

from __future__ import annotations

import math
import time
from enum import Enum

import numpy as np


class Activity(str, Enum):
    STANDING = "standing"
    SITTING = "sitting"
    SLEEPING = "sleeping"
    WALKING = "walking"
    EXERCISING = "exercising"
    ABSENT = "absent"


# Poses anatomiques en coordonnées 3D de la chambre (x, y, z) en mètres
# Chambre : 4m × 3.5m × 2.5m | Origine : coin avant-gauche-sol
_BASE_POSES: dict[Activity, list[tuple[float, float, float]]] = {
    Activity.STANDING: [
        (2.0, 1.72, 1.75),   # nose
        (1.95, 1.74, 1.80),  # left_eye
        (2.05, 1.74, 1.80),  # right_eye
        (1.90, 1.72, 1.75),  # left_ear
        (2.10, 1.72, 1.75),  # right_ear
        (1.75, 1.52, 1.75),  # left_shoulder
        (2.25, 1.52, 1.75),  # right_shoulder
        (1.60, 1.25, 1.75),  # left_elbow
        (2.40, 1.25, 1.75),  # right_elbow
        (1.50, 0.98, 1.75),  # left_wrist
        (2.50, 0.98, 1.75),  # right_wrist
        (1.85, 0.95, 1.75),  # left_hip
        (2.15, 0.95, 1.75),  # right_hip
        (1.85, 0.52, 1.75),  # left_knee
        (2.15, 0.52, 1.75),  # right_knee
        (1.85, 0.05, 1.75),  # left_ankle
        (2.15, 0.05, 1.75),  # right_ankle
    ],
    Activity.SITTING: [
        (2.0, 1.32, 1.75),
        (1.95, 1.34, 1.80),
        (2.05, 1.34, 1.80),
        (1.90, 1.32, 1.75),
        (2.10, 1.32, 1.75),
        (1.75, 1.12, 1.75),
        (2.25, 1.12, 1.75),
        (1.60, 0.85, 1.75),
        (2.40, 0.85, 1.75),
        (1.68, 0.62, 1.75),
        (2.32, 0.62, 1.75),
        (1.88, 0.60, 1.75),
        (2.12, 0.60, 1.75),
        (1.70, 0.28, 1.75),  # knees forward
        (2.30, 0.28, 1.75),
        (1.68, 0.04, 1.75),
        (2.32, 0.04, 1.75),
    ],
    Activity.SLEEPING: [
        (0.85, 0.58, 1.75),  # lying on bed - nose
        (0.85, 0.60, 1.80),
        (0.85, 0.60, 1.70),
        (0.85, 0.58, 1.82),
        (0.85, 0.58, 1.68),
        (0.85, 0.45, 1.60),  # left_shoulder
        (0.85, 0.45, 1.90),  # right_shoulder
        (0.85, 0.42, 1.45),
        (0.85, 0.42, 2.05),
        (0.85, 0.40, 1.35),
        (0.85, 0.40, 2.15),
        (0.85, 0.40, 1.70),
        (0.85, 0.40, 1.80),
        (0.85, 0.38, 1.70),
        (0.85, 0.38, 1.80),
        (0.85, 0.36, 1.70),
        (0.85, 0.36, 1.80),
    ],
    Activity.WALKING: [
        (2.0, 1.72, 1.75),
        (1.95, 1.74, 1.80),
        (2.05, 1.74, 1.80),
        (1.90, 1.72, 1.75),
        (2.10, 1.72, 1.75),
        (1.75, 1.52, 1.75),
        (2.25, 1.52, 1.75),
        (1.55, 1.22, 1.75),
        (2.45, 1.22, 1.75),
        (1.42, 0.95, 1.75),
        (2.58, 0.95, 1.75),
        (1.85, 0.95, 1.75),
        (2.15, 0.95, 1.75),
        (1.85, 0.52, 1.75),
        (2.15, 0.52, 1.75),
        (1.85, 0.05, 1.75),
        (2.15, 0.05, 1.75),
    ],
    Activity.EXERCISING: [
        (2.0, 1.62, 1.75),
        (1.95, 1.64, 1.80),
        (2.05, 1.64, 1.80),
        (1.90, 1.62, 1.75),
        (2.10, 1.62, 1.75),
        (1.68, 1.42, 1.75),
        (2.32, 1.42, 1.75),
        (1.42, 1.62, 1.75),  # arms raised
        (2.58, 1.62, 1.75),
        (1.28, 1.85, 1.75),
        (2.72, 1.85, 1.75),
        (1.85, 0.92, 1.75),
        (2.15, 0.92, 1.75),
        (1.78, 0.48, 1.75),
        (2.22, 0.48, 1.75),
        (1.82, 0.05, 1.75),
        (2.18, 0.05, 1.75),
    ],
    Activity.ABSENT: [(2.0, 0.0, 1.75)] * 17,
}

# Fréquence des oscillations par activité (Hz) et amplitude
_ACTIVITY_MOTION: dict[Activity, tuple[float, float]] = {
    Activity.STANDING: (0.3, 0.015),
    Activity.SITTING: (0.25, 0.010),
    Activity.SLEEPING: (0.20, 0.008),
    Activity.WALKING: (1.60, 0.060),
    Activity.EXERCISING: (2.50, 0.090),
    Activity.ABSENT: (0.0, 0.0),
}

# Variation CSI par activité
_CSI_VARIATION: dict[Activity, tuple[float, float]] = {
    Activity.STANDING: (0.3, 0.08),   # (freq_hz, amplitude)
    Activity.SITTING: (0.25, 0.06),
    Activity.SLEEPING: (0.20, 0.03),
    Activity.WALKING: (1.60, 0.38),
    Activity.EXERCISING: (2.50, 0.60),
    Activity.ABSENT: (0.0, 0.01),
}


class CSISimulator:
    def __init__(
        self,
        n_rx: int = 3,
        n_tx: int = 3,
        n_subcarriers: int = 56,
        n_timestamps: int = 100,
    ) -> None:
        self.n_rx = n_rx
        self.n_tx = n_tx
        self.n_subcarriers = n_subcarriers
        self.n_timestamps = n_timestamps
        self.n_pairs = n_rx * n_tx

        self.activity = Activity.STANDING
        self._t = 0.0
        self._rng = np.random.default_rng(42)

        # Composantes statiques de multipath (invariantes)
        self._static_amp = self._rng.rayleigh(
            1.2, (self.n_pairs, n_subcarriers, n_timestamps)
        )
        self._static_phase = self._rng.uniform(
            -math.pi, math.pi, (self.n_pairs, n_subcarriers, n_timestamps)
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def set_activity(self, activity: Activity) -> None:
        self.activity = activity

    def generate(self) -> dict:
        amplitude, phase = self._compute_csi()
        keypoints = self._animated_keypoints()
        confidence = self._compute_confidence()

        self._t += 1.0 / 15.0  # 15 FPS

        return {
            "amplitude": amplitude.tolist(),
            "phase": phase.tolist(),
            "keypoints": keypoints,
            "activity": self.activity.value,
            "confidence": float(confidence),
            "presence": self.activity != Activity.ABSENT,
            "timestamp": time.time(),
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _compute_csi(self) -> tuple[np.ndarray, np.ndarray]:
        freq, var_amp = _CSI_VARIATION[self.activity]
        t_vec = np.linspace(self._t, self._t + 1.0, self.n_timestamps)

        if freq > 0:
            variation = var_amp * np.sin(2 * math.pi * freq * t_vec)
        else:
            variation = var_amp * self._rng.standard_normal(self.n_timestamps)

        noise_amp = self._rng.standard_normal(
            (self.n_pairs, self.n_subcarriers, self.n_timestamps)
        ) * 0.05
        noise_phase = self._rng.standard_normal(
            (self.n_pairs, self.n_subcarriers, self.n_timestamps)
        ) * 0.05

        amp = np.clip(
            self._static_amp + variation[np.newaxis, np.newaxis, :] + noise_amp,
            0.0, 3.0,
        )
        phase = self._static_phase + 0.4 * variation[np.newaxis, np.newaxis, :] + noise_phase

        return amp, phase

    def _animated_keypoints(self) -> list[dict]:
        base = _BASE_POSES[self.activity]
        freq, amp = _ACTIVITY_MOTION[self.activity]

        if self.activity == Activity.ABSENT:
            return [{"name": n, "x": 0.0, "y": 0.0, "z": 0.0, "confidence": 0.0}
                    for n in _KEYPOINT_NAMES]

        keypoints = []
        for i, (name, (bx, by, bz)) in enumerate(zip(_KEYPOINT_NAMES, base)):
            # Phase offset différent par articulation pour un mouvement naturel
            phase_offset = i * 0.35
            dx = amp * math.sin(2 * math.pi * freq * self._t + phase_offset)
            dy = amp * 0.5 * math.cos(2 * math.pi * freq * self._t + phase_offset)

            if self.activity == Activity.WALKING:
                # Oscillation latérale de la marche
                if i in (13, 15):  # genou/cheville gauche
                    dy = 0.08 * abs(math.sin(2 * math.pi * freq * self._t))
                if i in (14, 16):  # genou/cheville droite
                    dy = 0.08 * abs(math.sin(2 * math.pi * freq * self._t + math.pi))

            conf = 0.92 if self.activity != Activity.SLEEPING else 0.78
            conf += self._rng.uniform(-0.04, 0.04)

            keypoints.append({
                "name": name,
                "x": round(bx + dx, 4),
                "y": round(by + dy, 4),
                "z": round(bz, 4),
                "confidence": round(min(max(conf, 0.0), 1.0), 3),
            })

        return keypoints

    def _compute_confidence(self) -> float:
        base = {
            Activity.STANDING: 0.93,
            Activity.SITTING: 0.90,
            Activity.SLEEPING: 0.78,
            Activity.WALKING: 0.88,
            Activity.EXERCISING: 0.85,
            Activity.ABSENT: 0.0,
        }[self.activity]
        return round(base + self._rng.uniform(-0.03, 0.03), 3)


_KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]
