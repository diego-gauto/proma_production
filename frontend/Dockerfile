FROM node:22-alpine AS build

WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile --filter frontend...

COPY frontend ./frontend
RUN pnpm --dir frontend run build

FROM node:22-alpine AS runtime

WORKDIR /repo
ENV NODE_ENV=production
RUN corepack enable

COPY --from=build /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/frontend/package.json ./frontend/package.json
COPY --from=build /repo/frontend/node_modules ./frontend/node_modules
COPY --from=build /repo/frontend/.next ./frontend/.next
COPY --from=build /repo/frontend/public ./frontend/public
COPY --from=build /repo/frontend/next.config.ts ./frontend/next.config.ts

EXPOSE 3000
CMD ["pnpm", "--dir", "frontend", "run", "start"]
