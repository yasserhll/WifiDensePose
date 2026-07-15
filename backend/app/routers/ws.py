"""WebSocket endpoint — diffuse les données de pose en temps réel."""

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.services.pose_estimator import PoseEstimator

logger = logging.getLogger(__name__)
router = APIRouter()

_estimator = PoseEstimator(
    n_rx=settings.n_rx_antennas,
    n_tx=settings.n_tx_antennas,
    n_subcarriers=settings.n_subcarriers,
    n_timestamps=settings.n_timestamps,
)


class _ConnectionManager:
    def __init__(self) -> None:
        self._active: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._active.add(ws)
        logger.info("Client connecté — total : %d", len(self._active))

    def disconnect(self, ws: WebSocket) -> None:
        self._active.discard(ws)
        logger.info("Client déconnecté — total : %d", len(self._active))

    async def send(self, ws: WebSocket, data: Any) -> None:
        await ws.send_text(json.dumps(data))


_manager = _ConnectionManager()


@router.websocket("/ws/pose")
async def pose_stream(websocket: WebSocket) -> None:
    await _manager.connect(websocket)
    interval = 1.0 / settings.ws_fps
    try:
        while True:
            # Lire les commandes entrantes (non-bloquant)
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                _handle_command(json.loads(msg))
            except asyncio.TimeoutError:
                pass

            payload = _estimator.step()
            await _manager.send(websocket, payload)
            await asyncio.sleep(interval)

    except WebSocketDisconnect:
        _manager.disconnect(websocket)
    except Exception as exc:
        logger.exception("Erreur WebSocket : %s", exc)
        _manager.disconnect(websocket)


def _handle_command(msg: dict) -> None:
    from app.services.csi_simulator import Activity

    if msg.get("type") == "set_activity":
        try:
            act = Activity(msg["activity"])
            _estimator.set_activity(act)
            logger.info("Activité changée → %s", act.value)
        except (KeyError, ValueError):
            pass
