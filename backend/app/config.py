from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    anthropic_api_key: str
    upload_dir: str = "./uploads"

    model_config = {"env_file": ".env"}


settings = Settings()
