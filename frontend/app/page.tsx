"use client";

import dynamic from "next/dynamic";
import { useWifiPose } from "@/hooks/useWifiPose";
import ActivityCard from "@/components/ActivityCard";
import SmartRoomPanel from "@/components/SmartRoomPanel";
import WifiSignalViz from "@/components/WifiSignalViz";
import type { Activity } from "@/lib/types";

// Room3D chargé côté client uniquement (Three.js ne supporte pas SSR)
const Room3D = dynamic(() => import("@/components/Room3D"), { ssr: false });

export default function Dashboard() {
  const { frame, roomState, connected, fps, setActivity, updateRoom } = useWifiPose();

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* En-tête */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-surface-border bg-surface-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30">
              W
            </span>
            <span className="font-semibold text-white text-sm tracking-tight">
              WiFi DensePose
            </span>
          </div>
          <span className="text-gray-600 text-xs">|</span>
          <span className="text-gray-400 text-xs font-mono">Chambre Intelligente</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-gray-500">FPS</span>
            <span className="text-accent-cyan">{fps}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-accent-green animate-pulse" : "bg-accent-red"
              }`}
            />
            <span className="text-xs font-mono text-gray-400">
              {connected ? "Connecté" : "Reconnexion..."}
            </span>
          </div>
          {frame && (
            <div className="text-xs font-mono text-gray-500">
              <span className="text-gray-400">Présence : </span>
              <span className={frame.presence ? "text-accent-green" : "text-gray-600"}>
                {frame.presence ? "Détectée" : "Aucune"}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Corps principal */}
      <main className="flex flex-1 overflow-hidden">
        {/* Vue 3D — zone principale */}
        <div className="flex-1 relative p-4 min-h-0">
          <div className="w-full h-full rounded-xl overflow-hidden border border-surface-border bg-gradient-to-br from-[#0d1117] to-[#111827]">
            <Room3D frame={frame} />
          </div>

          {/* Overlay info activité sur la vue 3D */}
          {frame && (
            <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none">
              <div className="backdrop-blur-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                <div className="text-xs font-mono text-gray-300">
                  <span className="text-gray-500">Modèle : </span>
                  WiFiDensePoseNet · 17 keypoints · COCO
                </div>
                <div className="text-xs font-mono text-gray-300 mt-0.5">
                  <span className="text-gray-500">Source : </span>
                  CSI 802.11n · 3×3 antennes · 56 sous-porteuses
                </div>
              </div>
            </div>
          )}

          {/* Légende skeleton */}
          <div className="absolute bottom-6 left-6 backdrop-blur-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2 pointer-events-none">
            <div className="text-xs font-mono text-gray-400">
              Rotation : clic gauche · Zoom : molette
            </div>
          </div>
        </div>

        {/* Panneau latéral droit */}
        <aside className="w-80 flex flex-col gap-3 p-4 border-l border-surface-border overflow-y-auto shrink-0">
          {/* Keypoints stats */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-4">
            <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">
              Pipeline de détection
            </div>
            <div className="space-y-1.5">
              <PipelineStep label="Capture CSI WiFi" status="active" value="802.11n · 9 paires" />
              <PipelineStep label="Encodeur amplitude" status="active" value="CNN · 64 filtres" />
              <PipelineStep label="Encodeur phase" status="active" value="CNN · 64 filtres" />
              <PipelineStep label="Fusion bimodale" status="active" value="128 → 64 canaux" />
              <PipelineStep label="Décodeur heatmaps" status="active" value="17 keypoints" />
              <PipelineStep
                label="Confiance globale"
                status={frame && frame.confidence > 0.8 ? "good" : "warn"}
                value={frame ? `${(frame.confidence * 100).toFixed(0)}%` : "—"}
              />
            </div>
          </div>

          {/* Activité */}
          <ActivityCard
            currentActivity={(frame?.activity ?? "standing") as Activity}
            onSelect={setActivity}
            confidence={frame?.confidence ?? 0}
          />

          {/* Signal WiFi CSI */}
          <WifiSignalViz frame={frame} />

          {/* Contrôles chambre intelligente */}
          <SmartRoomPanel state={roomState} onChange={updateRoom} />
        </aside>
      </main>
    </div>
  );
}

function PipelineStep({
  label, status, value,
}: { label: string; status: "active" | "good" | "warn" | "idle"; value: string }) {
  const colors = {
    active: "#00d4ff",
    good: "#39d353",
    warn: "#f0a500",
    idle: "#4a4f5a",
  };
  const color = colors[status];
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-xs font-mono text-gray-400">{label}</span>
      </div>
      <span className="text-xs font-mono" style={{ color }}>{value}</span>
    </div>
  );
}
