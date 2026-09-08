# ── Mengistu Furniture — application image ───────────────────────────────────
FROM node:20-alpine

# Small init so signals (Ctrl-C, docker stop) are handled cleanly
RUN apk add --no-cache tini

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

# Uploads live here; make sure the directory exists and is owned by the node user
RUN mkdir -p uploads/products && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/server.js"]
