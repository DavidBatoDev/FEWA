"""
SSE endpoint the frontend subscribes to for real-time tool event updates.
GET /events/{channel_name} streams tool-fired events as Server-Sent Events.
"""
import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.event_bus import EventBus

router = APIRouter(prefix="/events", tags=["events"])
logger = logging.getLogger(__name__)


@router.get("/{channel_name}")
async def tool_event_stream(channel_name: str):
    logger.info("SSE client connected: channel=%r", channel_name)

    async def generate():
        try:
            yield "data: {\"type\":\"connected\"}\n\n"
            async for event in EventBus.subscribe(channel_name):
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            logger.info("SSE client disconnected: channel=%r", channel_name)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
