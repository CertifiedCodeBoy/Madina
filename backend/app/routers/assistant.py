from fastapi import APIRouter

from app.schemas.assistant import AssistantRequest, AssistantResponse
from app.services.nlp_assistant import get_assistant_reply

router = APIRouter(prefix="/assistant", tags=["AI Municipal Assistant"])


@router.post("/chat", response_model=AssistantResponse)
async def chat(payload: AssistantRequest):
    """
    Multilingual AI municipal assistant (Arabic / French / English).
    Handles procedure guidance, document requirements, appointments, utility queries.
    """
    reply, suggested_actions = await get_assistant_reply(
        message=payload.message,
        language=payload.language,
        session_id=payload.session_id,
    )
    return AssistantResponse(
        reply=reply,
        language=payload.language,
        session_id=payload.session_id or "default",
        suggested_actions=suggested_actions,
    )
