# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS web-dependencies
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci

FROM web-dependencies AS web-builder
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
COPY . .
RUN npm run build

FROM python:3.11-slim-bookworm AS jarvis-builder
WORKDIR /source
COPY deployment/jarvis/pyproject.toml ./pyproject.toml
COPY deployment/jarvis/src ./src
RUN python -m pip wheel --no-cache-dir --wheel-dir /wheelhouse .

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    TEMA_DATA_ROOT=/data/tema \
    JARVIS_BRIDGE_PATH=/data/university-os-bridge \
    JARVIS_DB_PATH=/data/jarvis/jarvis.db \
    JARVIS_CONTEXT_PATH=/data/jarvis/ACADEMIC_CONTEXT.md \
    UNAB_OS_BRIDGE_PATH=/data/university-os-bridge

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates gosu python3 python3-venv tini tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 unab \
    && useradd --uid 10001 --gid unab --create-home --shell /usr/sbin/nologin unab \
    && python3 -m venv /opt/jarvis-venv

COPY --from=jarvis-builder /wheelhouse /tmp/wheelhouse
RUN /opt/jarvis-venv/bin/pip install --no-cache-dir --no-index --find-links=/tmp/wheelhouse jarvis-telegram \
    && rm -rf /tmp/wheelhouse

WORKDIR /app
COPY --from=web-builder --chown=unab:unab /workspace/public ./public
COPY --from=web-builder --chown=unab:unab /workspace/.next/standalone ./
COPY --from=web-builder --chown=unab:unab /workspace/.next/static ./.next/static
COPY --chown=unab:unab deployment/jarvis/ACADEMIC_CONTEXT.default.md /opt/jarvis/ACADEMIC_CONTEXT.default.md
COPY deployment/railway/entrypoint.sh /usr/local/bin/unab-os-entrypoint
RUN tr -d '\r' < /usr/local/bin/unab-os-entrypoint > /tmp/entrypoint.sh \
    && mv /tmp/entrypoint.sh /usr/local/bin/unab-os-entrypoint \
    && chmod 0555 /usr/local/bin/unab-os-entrypoint

EXPOSE 3000
ENTRYPOINT ["tini", "--", "/bin/bash", "/usr/local/bin/unab-os-entrypoint"]

