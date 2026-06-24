FROM node:20-alpine
WORKDIR /app
COPY package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
ENV PORT=11000
EXPOSE 11000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:11000/health || exit 1
CMD ["node", "src/index.js"]
