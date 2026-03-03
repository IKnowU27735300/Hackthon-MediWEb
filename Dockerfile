# --- Stage 1: Build Frontend ---
FROM node:18-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# --- Stage 2: Final Combined Image ---
FROM node:18-slim
WORKDIR /app

# Install Python and build dependencies for psycopg2/uvicorn
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Backend
COPY backend/requirements.txt ./backend/
RUN pip3 install --no-cache-dir -r backend/requirements.txt --break-system-packages

COPY backend ./backend

# Copy Built Frontend (Standalone)
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Copy Orchestrator
COPY run_app.py .

# Environment setup
ENV NODE_ENV=production
ENV PORT=8000
ENV BACKEND_PORT=8001

# Start the unified app
CMD ["python3", "run_app.py"]
