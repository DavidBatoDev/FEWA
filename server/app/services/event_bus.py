import asyncio
from collections import defaultdict
from typing import AsyncGenerator


class EventBus:
    _subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)

    @classmethod
    async def publish(cls, channel: str, event: dict) -> None:
        dead = []
        for q in cls._subscribers[channel]:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            cls._subscribers[channel].remove(q)

    @classmethod
    async def subscribe(cls, channel: str) -> AsyncGenerator[dict, None]:
        q: asyncio.Queue = asyncio.Queue(maxsize=50)
        cls._subscribers[channel].append(q)
        try:
            while True:
                event = await q.get()
                if event is None:
                    break
                yield event
        finally:
            try:
                cls._subscribers[channel].remove(q)
            except ValueError:
                pass
