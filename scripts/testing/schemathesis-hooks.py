import itertools
import os
import time
import uuid

import schemathesis


_REGISTER_COUNTER = itertools.count()
_WALLET_COUNTER = itertools.count()


def _make_unique_email(index: int) -> str:
    timestamp = int(time.time() * 1000) % 100_000_000
    return f"c{timestamp:08d}{index:03d}@example.com"


def _make_unique_phone(index: int) -> str:
    timestamp = int(time.time() * 1000) % 100_000_000
    suffix = (timestamp + index) % 100_000_000
    return f"+2557{suffix:08d}"


def _make_unique_key(prefix: str, index: int) -> str:
    timestamp = int(time.time() * 1000) % 100_000_000
    safe_prefix = prefix.strip()[:24] or "key"
    return f"{safe_prefix}-{timestamp:08d}-{index:03d}"


@schemathesis.hook
def before_call(context, case, kwargs):
    if case.method.upper() != "POST" or not isinstance(case.body, dict):
        return

    body = dict(case.body)

    if case.path == "/api/auth/register":
        index = next(_REGISTER_COUNTER)
        phone_number = _make_unique_phone(index)

        body["email"] = _make_unique_email(index)
        body["phoneNumber"] = phone_number

        if "phone" in body:
            body["phone"] = phone_number

        case.body = body
        return

    if case.path.startswith("/api/wallet/wallets/") and "idempotencyKey" in body:
        index = next(_WALLET_COUNTER)
        idempotency_key = body.get("idempotencyKey")
        if isinstance(idempotency_key, str) and idempotency_key.strip():
            body["idempotencyKey"] = _make_unique_key(idempotency_key.strip(), index)
        body["correlationId"] = str(uuid.uuid4())
        case.body = body
