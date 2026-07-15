"""REST API — contrôles de la chambre intelligente et état système."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.csi_simulator import Activity
from app.routers.ws import _estimator

router = APIRouter(prefix="/api/room", tags=["smart-room"])


# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------

class RoomState(BaseModel):
    lighting: float = Field(0.7, ge=0.0, le=1.0, description="Intensité lumineuse 0–1")
    temperature: float = Field(21.0, ge=15.0, le=30.0, description="Température °C")
    blinds: float = Field(0.5, ge=0.0, le=1.0, description="Store : 0=fermé 1=ouvert")
    music: bool = False
    white_noise: bool = False
    alert_fall: bool = False

class RoomStateUpdate(BaseModel):
    lighting: float | None = Field(None, ge=0.0, le=1.0)
    temperature: float | None = Field(None, ge=15.0, le=30.0)
    blinds: float | None = Field(None, ge=0.0, le=1.0)
    music: bool | None = None
    white_noise: bool | None = None

class ActivityCommand(BaseModel):
    activity: Activity

class SystemInfo(BaseModel):
    model: str
    n_rx: int
    n_tx: int
    n_subcarriers: int
    fps: float
    room_dimensions: dict[str, float]
    data_source: str


# ------------------------------------------------------------------
# State singleton (in-memory pour la démo)
# ------------------------------------------------------------------

_state = RoomState()


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------

@router.get("/state", response_model=RoomState)
async def get_state() -> RoomState:
    return _state


@router.patch("/state", response_model=RoomState)
async def update_state(update: RoomStateUpdate) -> RoomState:
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(_state, field, value)
    return _state


@router.post("/activity")
async def set_activity(cmd: ActivityCommand) -> dict:
    _estimator.set_activity(cmd.activity)
    _auto_adjust_room(cmd.activity)
    return {"activity": cmd.activity.value, "state": _state.model_dump()}


@router.get("/system", response_model=SystemInfo)
async def system_info() -> SystemInfo:
    return SystemInfo(
        model="WiFiDensePoseNet (CNN dual-branch)",
        n_rx=settings.n_rx_antennas,
        n_tx=settings.n_tx_antennas,
        n_subcarriers=settings.n_subcarriers,
        fps=settings.ws_fps,
        room_dimensions={
            "width": settings.room_width,
            "depth": settings.room_depth,
            "height": settings.room_height,
        },
        data_source="CSI Simulator (802.11n) — branchez une carte Intel 5300 / ESP32 pour les données réelles",
    )


# ------------------------------------------------------------------
# Smart room automation
# ------------------------------------------------------------------

def _auto_adjust_room(activity: Activity) -> None:
    """Ajustements automatiques de la chambre selon l'activité détectée."""
    presets = {
        Activity.SLEEPING: RoomStateUpdate(lighting=0.0, temperature=19.0, blinds=0.0, white_noise=True, music=False),
        Activity.SITTING: RoomStateUpdate(lighting=0.8, temperature=21.0, blinds=0.6, music=False),
        Activity.STANDING: RoomStateUpdate(lighting=0.9, temperature=21.0, blinds=0.7),
        Activity.WALKING: RoomStateUpdate(lighting=1.0, temperature=21.0),
        Activity.EXERCISING: RoomStateUpdate(lighting=1.0, temperature=19.0, blinds=0.5, music=True),
        Activity.ABSENT: RoomStateUpdate(lighting=0.0, temperature=18.0, blinds=0.0, music=False, white_noise=False),
    }
    preset = presets.get(activity)
    if preset:
        for field, value in preset.model_dump(exclude_none=True).items():
            setattr(_state, field, value)
