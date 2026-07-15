from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "WiFi DensePose API"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:3000", "http://frontend:3000"]
    ws_fps: float = 15.0
    n_rx_antennas: int = 3
    n_tx_antennas: int = 3
    n_subcarriers: int = 56
    n_timestamps: int = 100
    room_width: float = 4.0
    room_depth: float = 3.5
    room_height: float = 2.5

    class Config:
        env_file = ".env"


settings = Settings()
