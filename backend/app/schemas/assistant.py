from pydantic import BaseModel


class AssistantMessage(BaseModel):
    role: str   # user | assistant
    content: str
    language: str = "en"


class AssistantRequest(BaseModel):
    message: str
    language: str = "en"   # en | ar | fr
    session_id: str = ""


class AssistantResponse(BaseModel):
    reply: str
    language: str
    session_id: str
    suggested_actions: list[str] = []
