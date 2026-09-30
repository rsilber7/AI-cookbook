"""Caps on AI requests so a public demo can't run up the OpenAI bill.

Counts are kept in memory, which is right for a single server process. They
reset if the server restarts, so the OpenAI project's monthly budget stays the
hard backstop.
"""
import math
import time
from collections import defaultdict, deque
from threading import Lock
from fastapi import HTTPException, status
from app.config import settings

MINUTE = 60
DAY = 24 * 60 * 60


class SlidingWindow:
    """At most `limit` hits per key within any `seconds`-long window."""

    def __init__(self, limit: int, seconds: int):
        self.limit = limit
        self.seconds = seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def wait_time(self, key: str, now: float) -> float:
        """Seconds until another hit is allowed (0 if allowed now)."""
        hits = self._hits[key]
        while hits and hits[0] <= now - self.seconds:
            hits.popleft()
        return 0 if len(hits) < self.limit else hits[0] + self.seconds - now

    def record(self, key: str, now: float) -> None:
        self._hits[key].append(now)


_per_user_minute = SlidingWindow(settings.ai_limit_per_user_per_minute, MINUTE)
_per_user_day = SlidingWindow(settings.ai_limit_per_user_per_day, DAY)
_global_day = SlidingWindow(settings.ai_limit_global_per_day, DAY)
_lock = Lock()


def check_ai_limits(user_id: str, now: float) -> None:
    """429 if any limit is reached; otherwise count this request against all of them."""
    checks = [
        (_per_user_minute, user_id, "You're going a little fast. Try again in a minute."),
        (_per_user_day, user_id, "You've reached today's AI limit. Try again tomorrow."),
        (_global_day, "all", "The cookbook's AI has reached its daily limit. Try again tomorrow."),
    ]
    with _lock:
        for window, key, message in checks:
            wait = window.wait_time(key, now)
            if wait > 0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=message,
                    headers={"Retry-After": str(math.ceil(wait))},
                )
        # Only count the request once every limit has passed
        for window, key, _ in checks:
            window.record(key, now)


def enforce_ai_limit(user_id: str) -> None:
    """Call first thing inside AI endpoints. (Not a dependency: dependencies run before
    request validation, so invalid requests would use up the quota.)"""
    check_ai_limits(user_id, time.time())
