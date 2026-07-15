"use client";

import type { RoomState } from "@/lib/types";

interface Props {
  state: RoomState | null;
  onChange: (patch: Partial<RoomState>) => void;
}

function Slider({
  label, value, min, max, step, unit, color, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; color: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-gray-400">{label}</span>
        <span style={{ color }}>{value.toFixed(step < 1 ? 0 : 1)}{unit}</span>
      </div>
      <div className="relative h-1.5 bg-surface-border rounded-full">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, background: color }}
        />
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

function Toggle({
  label, value, color, onChange,
}: { label: string; value: boolean; color: string; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all duration-150 text-xs font-mono"
      style={{
        background: value ? `${color}18` : "transparent",
        border: `1px solid ${value ? color : "#21262d"}`,
        color: value ? color : "#6b7280",
      }}
    >
      <span>{label}</span>
      <span
        className="w-7 h-4 rounded-full flex items-center transition-all duration-200"
        style={{ background: value ? color : "#374151", paddingLeft: value ? "14px" : "2px" }}
      >
        <span className="w-3 h-3 rounded-full bg-white" />
      </span>
    </button>
  );
}

export default function SmartRoomPanel({ state, onChange }: Props) {
  if (!state) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <div className="text-xs text-gray-500 font-mono text-center py-4">
          Connexion en cours...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-5">
      <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
        Contrôles chambre intelligente
      </span>

      <div className="space-y-4">
        <Slider
          label="Luminosité"
          value={Math.round(state.lighting * 100)}
          min={0} max={100} step={1} unit="%"
          color="#f0a500"
          onChange={(v) => onChange({ lighting: v / 100 })}
        />
        <Slider
          label="Température"
          value={state.temperature}
          min={15} max={30} step={0.5} unit="°C"
          color="#f85149"
          onChange={(v) => onChange({ temperature: v })}
        />
        <Slider
          label="Store"
          value={Math.round(state.blinds * 100)}
          min={0} max={100} step={1} unit="%"
          color="#7c5cff"
          onChange={(v) => onChange({ blinds: v / 100 })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Toggle
          label="Musique"
          value={state.music}
          color="#39d353"
          onChange={(v) => onChange({ music: v })}
        />
        <Toggle
          label="Bruit blanc"
          value={state.white_noise}
          color="#00d4ff"
          onChange={(v) => onChange({ white_noise: v })}
        />
      </div>

      {/* Indicateurs visuels état chambre */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <RoomIndicator label="Lumière" value={state.lighting} color="#f0a500" />
        <RoomIndicator label="Temp." value={(state.temperature - 15) / 15} color="#f85149" />
        <RoomIndicator label="Store" value={state.blinds} color="#7c5cff" />
      </div>
    </div>
  );
}

function RoomIndicator({
  label, value, color,
}: { label: string; value: number; color: string }) {
  const bars = 5;
  const filled = Math.round(value * bars);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: bars }, (_, i) => (
          <div
            key={i}
            className="w-1.5 rounded-sm"
            style={{
              height: `${8 + i * 3}px`,
              background: i < filled ? color : "#21262d",
              opacity: i < filled ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono text-gray-500">{label}</span>
    </div>
  );
}
