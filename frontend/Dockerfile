# Frontend Dockerfile (dev)
FROM node:20-alpine
WORKDIR /app

# Install deps (use lockfile if present)
COPY frontend/package*.json /app/
RUN npm ci || npm install

# Copy source
COPY frontend /app
EXPOSE 5173
# Run Vite dev server on 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host"]
