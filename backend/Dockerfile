FROM node:22-alpine AS build

WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile --filter backend...

COPY backend ./backend
RUN pnpm --dir backend run build

FROM node:22-alpine AS runtime

WORKDIR /repo
ENV NODE_ENV=production
RUN corepack enable

COPY --from=build /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/backend/package.json ./backend/package.json
COPY --from=build /repo/backend/node_modules ./backend/node_modules
COPY --from=build /repo/backend/dist ./backend/dist

EXPOSE 3001
CMD ["node", "backend/dist/main.js"]
