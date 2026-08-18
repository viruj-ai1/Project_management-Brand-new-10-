# Docker Setup & Operations Guide

This document provides complete instructions for building, running, inspecting, stopping, and maintaining the containerized **Project Management Portal** application using Docker and Docker Compose on Docker Desktop (Windows / Linux / macOS).

---

## Application Architecture Summary

- **Frontend**: Vite / React 19 (TypeScript, Tailwind CSS) served via **Nginx** reverse proxy on port `5173` (`0.0.0.0:5173 -> container:80`).
- **Backend**: Python 3.11 / **FastAPI** application served via **Uvicorn** on port `5000` (`0.0.0.0:5000 -> container:5000`).
- **Database**: External Supabase PostgreSQL cloud database connected via environment variables (`SUPABASE_URL` / `DATABASE_URL`). Local JSON data directory mounted at `/app/data`.
- **Health Check**: Backend includes `/health` and `/api/health` endpoints returning JSON `{"status": "ok"}`.

---

## Local URLs & Ports

- **Frontend Web Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger UI)**: [http://localhost:5000/docs](http://localhost:5000/docs)
- **Backend Health Check**: [http://localhost:5000/health](http://localhost:5000/health)
- **Nginx API Health Check**: [http://localhost:5173/api/health](http://localhost:5173/api/health)

---

## Prerequisites

- **Docker Desktop** installed and running on your system.
- Ensure Docker Compose (`v2+` or `v5+`) is enabled.

---

## Commands Reference

### 1. Build Individual Docker Images
To build a specific service image independently:
```bash
# Build backend image
docker build -t project_management_backend:latest ./backend

# Build frontend image
docker build -t project_management_frontend:latest ./frontend
```

### 2. Build All Compose Services
To build all images defined in `docker-compose.yml`:
```bash
docker compose build
```

### 3. Start Containers
To start all services in detached mode (background):
```bash
docker compose up -d
```

### 4. Stop Containers
To gracefully stop running containers without removing them:
```bash
docker compose stop
```

### 5. Restart Containers
To restart all services or a specific service:
```bash
# Restart all services
docker compose restart

# Restart backend only
docker compose restart backend

# Restart frontend only
docker compose restart frontend
```

### 6. View Running Containers
To inspect running containers, ports, and health status:
```bash
docker ps
# or
docker compose ps
```

### 7. View Logs
To view realtime application logs:
```bash
# Stream logs for all services
docker compose logs -f

# Stream logs for backend only
docker compose logs -f backend

# Stream logs for frontend only
docker compose logs -f frontend
```

### 8. Remove Containers
To stop and remove containers and associated networks:
```bash
docker compose down
```

To also remove volumes:
```bash
docker compose down -v
```

### 9. Remove Images
To remove built images:
```bash
docker rmi project_managementbrandnew10-frontend:latest project_managementbrandnew10-backend:latest
```
Or prune unused images:
```bash
docker image prune -f
```

### 10. Rebuild After Code Changes
When source code or dependencies are updated:
```bash
# Rebuild and restart containers with updated code
docker compose up -d --build
```

---

## Environment Variables Configuration

Copy `.env.example` to `backend/.env` or `.env` and populate your credentials:

```ini
GROQ_API_KEY=gsk_...
DATABASE_URL=postgresql://postgres:...
SUPABASE_URL=postgresql://postgres:...
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Verification in Docker Desktop

When running, Docker Desktop UI will show:
- **Containers**: `project_management_frontend` and `project_management_backend` grouped under the `project_managementbrandnew10` project stack.
- **Health**: `project_management_backend` status marked as `healthy`.
- **Logs**: View live stdout/stderr logs directly under the **Logs** tab in Docker Desktop.
- **Port Mapping**: Click `5173:80` to launch the frontend app directly in your browser.
