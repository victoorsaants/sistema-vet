"""Gera JWT_SECRET, ANON_KEY e SERVICE_ROLE_KEY para o Supabase local.

Uso: python scripts/gerar_chaves_supabase.py
Copie a saída para o arquivo .env na raiz do projeto.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time

DEZ_ANOS_EM_SEGUNDOS = 10 * 365 * 24 * 60 * 60


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def gerar_jwt(role: str, secret: str) -> str:
    agora = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"role": role, "iss": "supabase", "iat": agora, "exp": agora + DEZ_ANOS_EM_SEGUNDOS}
    signing_input = ".".join(
        _b64url(json.dumps(part, separators=(",", ":")).encode()) for part in (header, payload)
    )
    signature = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url(signature)}"


if __name__ == "__main__":
    jwt_secret = secrets.token_urlsafe(48)
    print(f"JWT_SECRET={jwt_secret}")
    print(f"ANON_KEY={gerar_jwt('anon', jwt_secret)}")
    print(f"SERVICE_ROLE_KEY={gerar_jwt('service_role', jwt_secret)}")
