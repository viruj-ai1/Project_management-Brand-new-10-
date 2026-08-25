# Viruj Chematrix (Decoupled Architecture)

A project management application tailored for Pharmaceutical & Specialty Chemical R&D, separated into a modern Next.js frontend (Vercel) and a fast Python backend (Render).

## 🚀 Local Development

### 1. Backend (FastAPI)
1. Ensure you have Python 3.11+ installed.
2. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up `.env` (requires `GROQ_API_KEY` for AI features).
5. Start the server:
   ```bash
   uvicorn main:app --reload --port 5000
   ```

### 2. Frontend (Next.js)
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file and add the backend URL:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## ☁️ Deployment Guide

### Backend (Render)
1. Connect your repository to Render.
2. Create a **New Web Service**.
3. Render should auto-detect the `render.yaml` configuration in the root directory. If not, use the following:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Make sure to add `CORS_ORIGINS` to the Vercel URL once the frontend is deployed.

### Frontend (Vercel)
1. Connect your repository to Vercel.
2. Select the `frontend` directory as the Root Directory.
3. Vercel will auto-detect Next.js and configure build settings.
4. Add the `NEXT_PUBLIC_API_URL` environment variable pointing to the Render backend URL (e.g., `https://your-backend.onrender.com`).
5. Deploy!
