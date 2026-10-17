from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PASTA_BACKEND = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql://postgres@localhost:5433/ajuvet"
    jwt_segredo: str = ""
    jwt_minutos_access: int = 60
    dias_refresh: int = 30
    fuso_horario: str = "America/Maceio"
    pasta_arquivos: Path = PASTA_BACKEND / ".arquivos"
    tamanho_maximo_anexo_mb: int = 10
    nome_clinica: str = "AjuVet+ Clínica Veterinária"
    contato_clinica: str = ""
    envio_automatico_notificacoes: bool = True
    intervalo_envio_segundos: int = 60
    email_remetente: str = "AjuVet+ <nao-responda@ajuvet.local>"
    smtp_host: str = ""
    smtp_porta: int = 587
    smtp_usuario: str = ""
    smtp_senha: str = ""
    smtp_tls: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    @property
    def pasta_emails(self) -> Path:
        return self.pasta_arquivos / "emails"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
