FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app/backend

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

RUN useradd --create-home --uid 1000 ajuvet \
    && mkdir -p /app/backend/.arquivos \
    && chown ajuvet:ajuvet /app/backend/.arquivos

COPY supabase /app/supabase
COPY backend/app ./app
COPY backend/banco ./banco
COPY backend/scripts ./scripts
COPY --chmod=755 backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER ajuvet
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4)"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
