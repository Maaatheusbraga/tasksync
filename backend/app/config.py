from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "TaskSync Corporate Kanban"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    database_url: str = (
        "mssql+pyodbc://sa:YourStrong!Passw0rd@localhost/TaskSyncDB"
        "?driver=ODBC+Driver+17+for+SQL+Server"
    )
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_pool_recycle_seconds: int = 1800


settings = Settings()
