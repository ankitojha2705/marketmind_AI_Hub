import asyncio
from typing import Any

from app.job import run_scheduler_job


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    # EventBridge/Lambda entrypoint.
    return asyncio.run(run_scheduler_job(trigger="lambda"))
