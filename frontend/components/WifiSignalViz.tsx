"use client";

import { useMemo } from "react";
import type { PoseFrame } from "@/lib/types";

interface Props {
  frame: PoseFrame | null;
}

export default function WifiSignalViz({ frame }: Props) {
  const profile = frame?.csi_summary?.subcarrier_profile ?? [];
  const maxVal = useMemo(() => Math.max(...profile, 0.001), [profile]);

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
          Profil CSI — Sous-porteuses
        </span>
        <div className="flex gap-3 text-xs font-mono">
          <span className="text-gray-500">
            μ <span className="text-accent-cyan">{frame?.csi_summary?.mean_amplitude?.toFixed(3) ?? "—"}</span>
          </span>
          <span className="text-gray-500">
            σ <span className="text-accent-purple">{frame?.csi_summary?.std_amplitude?.toFixed(3) ?? "—"}</span>
          </span>
        </div>
      </div>

      {/* Barres d'amplitude */}
      <div className="flex items-end gap-px h-16">
        {profile.length > 0
          ? profile.map((v, i) => {
              const pct = Math.max(4, (v / maxVal) * 100);
              const hue = 180 + (i / profile.length) * 60;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-100"
                  style={{
                    height: `${pct}%`,
                    background: `hsl(${hue}, 80%, 55%)`,
                    opacity: 0.75,
                  }}
                />
              );
            })
          : Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-surface-border"
                style={{ height: "20%" }}
              />
            ))}
      </div>

      <div className="flex justify-between mt-1 text-xs text-gray-600 font-mono">
        <span>2.4 GHz</span>
        <span>5.8 GHz</span>
      </div>
    </div>
  );
}
