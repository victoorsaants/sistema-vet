#!/bin/sh
set -e

if [ -z "$JWT_SEGREDO" ]; then
  echo "Defina JWT_SEGREDO no arquivo .env da raiz do projeto (veja .env.example)." >&2
  exit 1
fi

if [ "$CARREGAR_DADOS_EXEMPLO" = "true" ]; then
  python -m scripts.migrar --seed-se-vazio
else
  python -m scripts.migrar
fi

exec "$@"
