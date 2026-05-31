from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Viáticos App"
    SECRET_KEY: str = "cambia-esta-clave-en-produccion-min32chars!!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas
    DATABASE_URL: str = "sqlite:///./viaticos.db"
    UPLOADS_DIR: str = "uploads"

    class Config:
        env_file = ".env"


settings = Settings()
