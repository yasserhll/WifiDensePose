"""
WiFi DensePose Neural Network
Architecture: dual-branch CNN encoder (amplitude + phase) → fusion → decoder → 17 COCO keypoint heatmaps
Reference: "DensePose From WiFi" (Geng et al., 2023, Meta AI / CMU)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class _ConvBnRelu(nn.Sequential):
    def __init__(self, in_c: int, out_c: int, k: int = 3, s: int = 1):
        super().__init__(
            nn.Conv2d(in_c, out_c, k, stride=s, padding=k // 2, bias=False),
            nn.BatchNorm2d(out_c),
            nn.ReLU(inplace=True),
        )


class _CSIEncoder(nn.Module):
    """Single-branch encoder for one CSI stream (amplitude or phase)."""

    def __init__(self) -> None:
        super().__init__()
        self.block1 = nn.Sequential(_ConvBnRelu(1, 16), _ConvBnRelu(16, 16), nn.MaxPool2d(2))
        self.block2 = nn.Sequential(_ConvBnRelu(16, 32), _ConvBnRelu(32, 32), nn.MaxPool2d(2))
        self.block3 = nn.Sequential(_ConvBnRelu(32, 64), _ConvBnRelu(64, 64))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        return x


class WiFiDensePoseNet(nn.Module):
    """
    Lightweight WiFi DensePose model.
    Input:  amplitude [B,1,H,W] + phase [B,1,H,W]  (H=n_pairs, W=n_subcarriers)
    Output: heatmaps [B,17,H',W']  (one per COCO keypoint)
    """

    N_KEYPOINTS = 17

    KEYPOINT_NAMES = [
        "nose", "left_eye", "right_eye", "left_ear", "right_ear",
        "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
        "left_wrist", "right_wrist", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle",
    ]

    SKELETON = [
        [15, 13], [13, 11], [16, 14], [14, 12], [11, 12],
        [5, 11], [6, 12], [5, 6],
        [5, 7], [6, 8], [7, 9], [8, 10],
        [1, 2], [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
    ]

    def __init__(self) -> None:
        super().__init__()
        self.amp_encoder = _CSIEncoder()
        self.phase_encoder = _CSIEncoder()

        self.fusion = nn.Sequential(
            nn.Conv2d(128, 64, 1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
        )

        self.decoder = nn.Sequential(
            nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False),
            _ConvBnRelu(64, 32),
            nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False),
            _ConvBnRelu(32, 16),
            nn.Conv2d(16, self.N_KEYPOINTS, 1),
        )

    def forward(self, amplitude: torch.Tensor, phase: torch.Tensor) -> torch.Tensor:
        amp_feat = self.amp_encoder(amplitude)
        phase_feat = self.phase_encoder(phase)
        fused = self.fusion(torch.cat([amp_feat, phase_feat], dim=1))
        heatmaps = self.decoder(fused)
        return heatmaps

    @torch.no_grad()
    def predict_keypoints(
        self, amplitude: torch.Tensor, phase: torch.Tensor
    ) -> list[dict]:
        """Return list of {name, x, y, confidence} for each keypoint."""
        heatmaps = self.forward(amplitude, phase)
        heatmaps = torch.sigmoid(heatmaps)

        B, K, H, W = heatmaps.shape
        flat = heatmaps.view(B, K, -1)
        idx = flat.argmax(dim=-1)
        conf = flat.max(dim=-1).values

        ys = (idx // W).float() / H
        xs = (idx % W).float() / W

        results = []
        for k in range(K):
            results.append(
                {
                    "name": self.KEYPOINT_NAMES[k],
                    "x": xs[0, k].item(),
                    "y": ys[0, k].item(),
                    "confidence": conf[0, k].item(),
                }
            )
        return results
