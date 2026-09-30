from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    openai_api_key: str
    openai_model: str = "gpt-6-luna"

    # Comma-separated websites allowed to call the API (add the deployed frontend URL)
    cors_origins: str = "http://localhost:5173"

    # Caps on AI requests (generate + import) so a public demo can't run up the OpenAI bill
    ai_limit_per_user_per_minute: int = 5
    ai_limit_per_user_per_day: int = 50
    ai_limit_global_per_day: int = 500

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
