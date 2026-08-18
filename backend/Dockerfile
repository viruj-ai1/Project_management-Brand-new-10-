# Use minimal, secure Alpine Python runtime as base image
FROM python:3.11-alpine

# Set working directory
WORKDIR /app

# Prevent Python from writing .pyc files to disk & buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system security upgrades & dependencies
RUN apk update && apk upgrade --no-cache && apk add --no-cache \
    curl \
    gcc \
    musl-dev \
    libffi-dev

# Copy requirements file first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Health check endpoint verification
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Command to run FastAPI app using uvicorn binding to 0.0.0.0
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
