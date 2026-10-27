# Static build served by nginx, for Coolify. Pass VITE_UMAMI_WEBSITE_ID as a build variable to turn on analytics.
FROM node:22-alpine AS build
WORKDIR /app
# the pnpm the lockfile was made with; newer majors stop reading package.json's build allowlist
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_UMAMI_HOST
RUN pnpm build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
