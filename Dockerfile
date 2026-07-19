# check=skip=SecretsUsedInArgOrEnv
# WEB_CLERK_PUBLISHABLE_KEY is intentionally public browser configuration.
FROM node:22-bookworm-slim AS build

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/chess-domain/package.json packages/chess-domain/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN npm ci

COPY angular.json tsconfig.base.json ./
COPY apps/api apps/api
COPY apps/web apps/web
COPY packages/chess-domain packages/chess-domain
COPY packages/contracts packages/contracts

ARG WEB_API_BASE_URL=/api
ARG WEB_CLERK_PUBLISHABLE_KEY

RUN npm run build:domain \
    && npm run build:contracts \
    && npm run build:api \
    && WEB_API_BASE_URL="${WEB_API_BASE_URL}" \
       WEB_CLERK_PUBLISHABLE_KEY="${WEB_CLERK_PUBLISHABLE_KEY}" \
       npm run build:web \
    && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

LABEL org.opencontainers.image.source="https://github.com/vokerg/chess_repertoir_trainer"

RUN apt-get update \
    && apt-get install --yes --no-install-recommends nginx openssl \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

WORKDIR /workspace

COPY --from=build /workspace/package.json /workspace/package-lock.json ./
COPY --from=build /workspace/apps/api/package.json apps/api/package.json
COPY --from=build /workspace/apps/web/package.json apps/web/package.json
COPY --from=build /workspace/apps/mobile/package.json apps/mobile/package.json
COPY --from=build /workspace/packages/chess-domain/package.json packages/chess-domain/package.json
COPY --from=build /workspace/packages/contracts/package.json packages/contracts/package.json
COPY --from=build /workspace/node_modules node_modules
COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/apps/api/prisma apps/api/prisma
COPY --from=build /workspace/packages/chess-domain/dist packages/chess-domain/dist
COPY --from=build /workspace/packages/contracts/dist packages/contracts/dist
COPY --from=build /workspace/dist/apps/web /usr/share/nginx/html
COPY deploy/docker/nginx.conf /etc/nginx/nginx.conf

CMD ["nginx", "-g", "daemon off;"]
