# Local/standalone image for the cpanel-whm-manager extension.
# In the in-process model the host mounts createRouter() directly; this image is
# for local dev, healthchecks, and the optional out-of-process fallback runner.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./package.json
RUN npm install --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=11000
# Least-privilege: run as the built-in non-root node user.
COPY package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
USER node
EXPOSE 11000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:11000/health || exit 1
CMD ["node", "dist/backend/standalone.js"]
