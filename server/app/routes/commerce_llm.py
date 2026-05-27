"""
Custom LLM endpoint that Agora Conversational AI calls for the Commerce Agent (Maya).
Mirrors routes/llm.py but uses MAYA_SYSTEM_PROMPT + COMMERCE_TOOLS + commerce_tool_executor.
"""
import asyncio
import json
import logging
import time
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from app.config import settings
from app.services.commerce_agent import (
    COMMERCE_TOOL_INSTRUCTIONS,
    COMMERCE_TOOLS,
    MAYA_SYSTEM_PROMPT,
)
from app.services.commerce_tool_executor import run as run_tool, save_transcript_turn

router = APIRouter(tags=["commerce-llm"])
logger = logging.getLogger(__name__)

_FULL_SYSTEM_PROMPT = COMMERCE_TOOL_INSTRUCTIONS + "\n\n" + MAYA_SYSTEM_PROMPT

_openai_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


TOOL_DETECTION_MODEL = "gpt-4o-mini"
RESPONSE_MODEL = "gpt-4o-mini"


def _make_chunk(content: str, model: str, finish_reason: str | None = None) -> str:
    chunk = {
        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "delta": {"content": content} if content else {},
                "finish_reason": finish_reason,
            }
        ],
    }
    return f"data: {json.dumps(chunk)}\n\n"


async def _stream_openai(
    messages: list[dict],
    channel: str,
) -> AsyncGenerator[str, None]:
    user_text = next(
        (m.get("content", "") for m in reversed(messages) if m.get("role") == "user"),
        "",
    )

    try:
        t0 = time.monotonic()
        client = _get_openai_client()
        response = await client.chat.completions.create(
            model=TOOL_DETECTION_MODEL,
            messages=messages,
            tools=COMMERCE_TOOLS,
            tool_choice="required",
            temperature=0,
            max_tokens=500,
        )
        msg = response.choices[0].message
        tool_names = [tc.function.name for tc in msg.tool_calls] if msg.tool_calls else []
        logger.info(
            "Commerce LLM Round 1 (%s, %.1fs): finish=%r tools=%s",
            TOOL_DETECTION_MODEL, time.monotonic() - t0,
            response.choices[0].finish_reason, tool_names or "none",
        )

        if msg.tool_calls:
            tool_call_list = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ]
            messages.append({"role": "assistant", "tool_calls": tool_call_list})

            async def _exec(tc):
                logger.info("Commerce tool call: %s args=%s", tc.function.name, tc.function.arguments[:200])
                result = await run_tool(tc.function.name, tc.function.arguments, channel)
                logger.info("Commerce tool result: %s -> %s", tc.function.name, json.dumps(result, default=str)[:200])
                return tc.id, result

            tool_results = await asyncio.gather(*[_exec(tc) for tc in msg.tool_calls])

            for tool_call_id, result in tool_results:
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": json.dumps(result, default=str),
                })

            stream = await client.chat.completions.create(
                model=RESPONSE_MODEL,
                messages=messages,
                stream=True,
                max_tokens=500,
            )
        else:
            assistant_text = msg.content or ""
            if assistant_text:
                yield _make_chunk(assistant_text, RESPONSE_MODEL)
            yield _make_chunk("", RESPONSE_MODEL, finish_reason="stop")
            yield "data: [DONE]\n\n"
            if user_text or assistant_text:
                asyncio.create_task(save_transcript_turn(channel, user_text, assistant_text))
            return

        assistant_parts: list[str] = []
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                assistant_parts.append(delta)
            yield f"data: {chunk.model_dump_json()}\n\n"

        yield "data: [DONE]\n\n"

        assistant_text = "".join(assistant_parts)
        if user_text or assistant_text:
            asyncio.create_task(save_transcript_turn(channel, user_text, assistant_text))

    except Exception as exc:
        logger.exception("Error in commerce _stream_openai: %s", exc)
        raise


@router.post("/commerce/chat/completions")
async def commerce_chat_completions(
    request: Request,
    channel: str = Query(default=""),
    authorization: str | None = Header(default=None),
):
    if settings.custom_llm_api_key:
        expected = f"Bearer {settings.custom_llm_api_key}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    messages: list[dict] = body.get("messages", [])

    logger.info(
        "/commerce/chat/completions called: channel=%r messages=%d auth=%s",
        channel, len(messages), authorization is not None,
    )

    if not messages:
        raise HTTPException(status_code=400, detail="messages is required")

    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    if not messages or messages[0].get("role") != "system":
        messages = [{"role": "system", "content": _FULL_SYSTEM_PROMPT}] + messages
    else:
        messages[0] = {"role": "system", "content": COMMERCE_TOOL_INSTRUCTIONS + "\n\n" + messages[0]["content"]}

    working_messages = list(messages)

    return StreamingResponse(
        _stream_openai(working_messages, channel),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
