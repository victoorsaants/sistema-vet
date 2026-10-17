FROM node:24-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS construcao
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    SAIDA_STANDALONE=true
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS execucao
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S ajuvet && adduser -S ajuvet -G ajuvet

COPY --from=construcao --chown=ajuvet:ajuvet /app/public ./public
COPY --from=construcao --chown=ajuvet:ajuvet /app/.next/standalone ./
COPY --from=construcao --chown=ajuvet:ajuvet /app/.next/static ./.next/static

USER ajuvet
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/login || exit 1

CMD ["node", "server.js"]
