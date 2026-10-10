FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci
COPY backend backend
COPY frontend frontend
ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_BRIDGE_URL=ws://127.0.0.1:8080
ARG VITE_BRIDGE_TOKEN
ENV VITE_API_URL=$VITE_API_URL VITE_WS_BRIDGE_URL=$VITE_WS_BRIDGE_URL VITE_BRIDGE_TOKEN=$VITE_BRIDGE_TOKEN
RUN npm run build

FROM node:22-bookworm-slim AS api
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/backend backend
COPY --from=build /app/package.json /app/package-lock.json ./
# Los secretos se inyectan al ejecutar; jamás se copian al contexto o a la imagen.
RUN touch .env && chown -R node:node /app
USER node
ENV NODE_ENV=production
CMD ["node", "backend/dist/main.js"]

FROM nginxinc/nginx-unprivileged:stable-alpine AS web
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
