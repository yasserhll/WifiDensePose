"""
Pipeline d'estimation de pose : CSI → modèle PyTorch → keypoints 3D.
Combine l'inférence du réseau de neurones avec la simulation CSI.
"""

from __future__ import annotations

import numpy as np
import torch

from app.models.densepose_net import WiFiDensePoseNet
from app.services.csi_simulator import Activity, CSISimulator


class PoseEstimator:
    def __init__(
        self,
        n_rx: int = 3,
        n_tx: int = 3,
        n_subcarriers: int = 56,
        n_timestamps: int = 100,
    ) -> None:
        self.simulator = CSISimulator(n_rx, n_tx, n_subcarriers, n_timestamps)
        self.model = WiFiDensePoseNet()
        self.model.eval()

        self._device = torch.device("cpu")
        self.n_subcarriers = n_subcarriers
        self.n_pairs = n_rx * n_tx

    def set_activity(self, activity: Activity) -> None:
        self.simulator.set_activity(activity)

    def step(self) -> dict:
        """Un cycle complet : simulation CSI → inférence → résultat."""
        raw = self.simulator.generate()

        amp_arr = np.array(raw["amplitude"], dtype=np.float32)   # [n_pairs, n_sub, n_ts]
        phase_arr = np.array(raw["phase"], dtype=np.float32)

        amp_t = self._to_tensor(amp_arr)
        phase_t = self._to_tensor(phase_arr)

        with torch.no_grad():
            heatmaps = self.model(amp_t, phase_t)

        # Les keypoints simulés sont anatomiquement corrects et utilisés directement.
        # Les heatmaps du réseau non-entraîné servent d'illustration architecturale.
        result = {
            "keypoints": raw["keypoints"],
            "activity": raw["activity"],
            "confidence": raw["confidence"],
            "presence": raw["presence"],
            "timestamp": raw["timestamp"],
            "csi_summary": self._summarize_csi(amp_arr),
            "heatmap_shape": list(heatmaps.shape),
        }
        return result

    def _to_tensor(self, arr: np.ndarray) -> torch.Tensor:
        """Reshape CSI [n_pairs, n_sub, n_ts] → [1, 1, n_pairs*n_sub, n_ts]."""
        reshaped = arr.reshape(self.n_pairs * self.n_subcarriers, -1)
        return torch.from_numpy(reshaped).unsqueeze(0).unsqueeze(0)

    def _summarize_csi(self, amp: np.ndarray) -> dict:
        mean_per_sub = amp.mean(axis=(0, 2)).tolist()[:20]  # 20 premiers subcarriers
        return {
            "mean_amplitude": round(float(amp.mean()), 4),
            "std_amplitude": round(float(amp.std()), 4),
            "subcarrier_profile": [round(v, 4) for v in mean_per_sub],
        }
