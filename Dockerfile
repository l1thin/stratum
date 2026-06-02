# ==========================================
# Stage 1: Build the React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend config files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source files and build
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Create the Python Runner
# ==========================================
FROM python:3.11-slim AS backend-runner
WORKDIR /app

# Install system dependencies (Tesseract, OpenCV/graphics libraries) with retry logic for network resilience
RUN apt-get clean && \
    (apt-get update || (sleep 5 && apt-get update)) && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY image-to-psd-backend/requirements.txt ./
RUN pip install --no-cache-dir torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY image-to-psd-backend/ ./

# Copy built frontend static assets from Stage 1 into the backend's static directory
COPY --from=frontend-builder /app/frontend/dist ./static

# Ensure outputs directory exists and is writable by any user
RUN mkdir -p outputs && chmod 777 outputs

# Set writable cache directories for AI models (rembg, EasyOCR, torch)
ENV U2NET_HOME=/tmp/.u2net \
    EASYOCR_MODULE_PATH=/tmp/.EasyOCR \
    TORCH_HOME=/tmp/.torch \
    NUMBA_CACHE_DIR=/tmp

# Expose server port (FastAPI default, overridden dynamically by cloud hosts via $PORT)
EXPOSE 7860
ENV PORT=7860

# Start server using Gunicorn with Uvicorn workers for production performance
CMD ["sh", "-c", "gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT}"]
