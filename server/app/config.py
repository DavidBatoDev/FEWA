from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openai_api_key: str = ""

    couchbase_connection_string: str = ""
    couchbase_username: str = ""
    couchbase_password: str = ""
    couchbase_bucket: str = "workflow_ph"
    couchbase_scope: str = "sales_agent"
    offers_cache_ttl_seconds: int = 300

    agora_app_id: str = ""
    agora_app_certificate: str = ""
    agora_convo_api_base: str = "https://api.agora.io"
    agora_convo_default_pipeline_id: str = ""
    agora_convo_default_preset: str = "openai_gpt_4o_mini,openai_tts_1"
    agora_convo_default_tts_voice: str = "coral"
    agora_convo_default_audio_scenario: str = "aiserver"
    agora_convo_default_idle_timeout: int = 0


settings = Settings()
