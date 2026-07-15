"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Activity, PoseFrame, RoomState } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/pose";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface UseWifiPoseReturn {
  frame: PoseFrame | null;
  roomState: RoomState | null;
  connected: boolean;
  fps: number;
  setActivity: (activity: Activity) => void;
  updateRoom: (patch: Partial<RoomState>) => Promise<void>;
}

export function useWifiPose(): UseWifiPoseReturn {
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const [fps, setFps] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();

    ws.onmessage = (ev) => {
      const data: PoseFrame = JSON.parse(ev.data as string);
      setFrame(data);

      frameCountRef.current++;
      const now = Date.now();
      const elapsed = now - lastFpsUpdateRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }
    };

    wsRef.current = ws;
    return ws;
  }, []);

  useEffect(() => {
    const ws = connect();
    return () => ws.close();
  }, [connect]);

  // Charger l'état initial de la chambre
  useEffect(() => {
    fetch(`${API_URL}/api/room/state`)
      .then((r) => r.json())
      .then(setRoomState)
      .catch(() => null);
  }, []);

  const setActivity = useCallback((activity: Activity) => {
    wsRef.current?.send(JSON.stringify({ type: "set_activity", activity }));
    fetch(`${API_URL}/api/room/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity }),
    })
      .then((r) => r.json())
      .then((d) => setRoomState(d.state))
      .catch(() => null);
  }, []);

  const updateRoom = useCallback(async (patch: Partial<RoomState>) => {
    const res = await fetch(`${API_URL}/api/room/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setRoomState(await res.json());
  }, []);

  return { frame, roomState, connected, fps, setActivity, updateRoom };
}
