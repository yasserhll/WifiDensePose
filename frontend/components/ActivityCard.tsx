"use client";

import type { Activity } from "@/lib/types";
import { ACTIVITY_LABELS, ACTIVITY_COLORS } from "@/lib/types";

interface Props {
  currentActivity: Activity;
  onSelect: (a: Activity) => void;
  confidence: number;
}

const ACTIVITIES: Activity[] = [
  "standing", "sitting", "sleeping", "walking", "exercising", "absent",
];

const ACTIVITY_ICONS: Record<Activity, string> = {
  standing: "⬆",
  sitting: "⬛",
  sleeping: "▬",
  walking: "▷",
  exercising: "◆",
  absent: "○",
};

export default function ActivityCard({ currentActivity, onSelect, confidence }: Props) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
          Activité détectée
        </span>
        <span className="text-xs font-mono text-gray-500">
          Confiance{" "}
          <span
            className="font-semibold"
            style={{ color: confidence > 0.85 ? "#39d353" : confidence > 0.65 ? "#f0a500" : "#f85149" }}
          >
            {(confidence * 100).toFixed(0)}%
          </span>
        </span>
      </div>

      {/* Activité courante */}
      <div
        className="flex items-center gap-3 mb-4 p-3 rounded-lg"
        style={{
          background: `${ACTIVITY_COLORS[currentActivity]}18`,
          border: `1px solid ${ACTIVITY_COLORS[currentActivity]}40`,
        }}
      >
        <span className="text-2xl" style={{ color: ACTIVITY_COLORS[currentActivity] }}>
          {ACTIVITY_ICONS[currentActivity]}
        </span>
        <div>
          <div className="font-semibold text-white text-sm">
            {ACTIVITY_LABELS[currentActivity]}
          </div>
          <div className="text-xs text-gray-500">Détection WiFi DensePose</div>
        </div>
        <div className="ml-auto">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: ACTIVITY_COLORS[currentActivity] }}
          />
        </div>
      </div>

      {/* Sélecteur d'activité */}
      <div className="grid grid-cols-3 gap-1.5">
        {ACTIVITIES.map((act) => {
          const isActive = act === currentActivity;
          return (
            <button
              key={act}
              onClick={() => onSelect(act)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all duration-150"
              style={{
                background: isActive ? `${ACTIVITY_COLORS[act]}22` : "transparent",
                border: `1px solid ${isActive ? ACTIVITY_COLORS[act] : "#21262d"}`,
                color: isActive ? ACTIVITY_COLORS[act] : "#6b7280",
              }}
            >
              <span className="text-base">{ACTIVITY_ICONS[act]}</span>
              <span className="font-mono">{ACTIVITY_LABELS[act]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
