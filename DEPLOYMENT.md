# Production Deployment Guide: Cloud Hosting (Render / Railway + Vercel)

This document provides exact, step-by-step instructions to deploy the **Automotive Lead Management System** to production using **Render / Railway** (for Backend API & PostgreSQL) and **Vercel** (for the React Frontend).

---

## Architecture Overview
- **Database**: Managed PostgreSQL (Render PostgreSQL / Railway / Supabase)
- **Backend API**: Node.js & Express (`backend/`) on Render or Railway
- **Frontend SPA**: Vite + React (`frontend/`) on Vercel

---

## Step 1: Push Code to GitHub / GitLab
Ensure your project repository is committed and pushed to GitHub:
```bash
git add .
git commit -m "feat: production deployment configuration"
git push origin main
```

---

## Step 2: Deploy Database & Backend on Render

### Option A: Using the Render Blueprint (Fastest, 1-Click)
1. Log in to [Render](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml` and automatically configure:
   - **Database**: `automotive-lms-db` (PostgreSQL)
   - **Web Service**: `automotive-lms-backend` (Node.js)
5. Click **Apply**.
6. Once deployed, note down your backend URL (e.g., `https://automotive-lms-backend.onrender.com`).

### Option B: Manual Web Service on Render / Railway
If creating manually:
1. **Create PostgreSQL Database**:
   - Go to Render Dashboard -> **New +** -> **PostgreSQL**.
   - Note the **Internal Database URL** (or External Connection String).
2. **Create Web Service**:
   - Go to Render Dashboard -> **New +** -> **Web Service**.
   - Select your repo.
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma db push && node dist/src/server.js`
3. **Set Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `DATABASE_URL`: *(Your PostgreSQL connection string)*
   - `JWT_SECRET`: *(A random 64-character string)*
   - `CORS_ORIGIN`: `*` (or your frontend Vercel URL)

---

## Step 3: Seed Production Data (53 Vehicles & 105 Leads)
Once your database is created on Render or Railway:
1. Connect via pgAdmin or the Render Web Shell.
2. In the Render Dashboard under **Shell**, run:
   ```bash
   npx ts-node -r dotenv/config prisma/seed_large.ts
   ```
   *Alternatively*, open your database in pgAdmin using the External Connection String and execute `backend/prisma/seed_bulk.sql`.

---

## Step 4: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   Add the following variable:
   - `VITE_API_URL`: Your backend URL from Step 2 (e.g. `https://automotive-lms-backend.onrender.com`)
6. Click **Deploy**.
7. In ~60 seconds, your site will be live at `https://your-project.vercel.app`!

---

## Step 5: Verify Production Deployment
1. Visit your live Vercel URL.
2. Log in using the default credentials:
   - **Admin**: `admin@dealership.com` / `admin123`
   - **Sales Manager**: `manager@dealership.com` / `manager123`
   - **Sales Executive**: `salman@dealership.com` / `sales123`
3. Test all sections:
   - **Showroom Grid (`/inventory`)**: Displays all 53 vehicles with page-size options.
   - **Pipeline Board (`/requirements`)**: Displays all leads distributed across stages.
   - **Vehicle Matching (`/matching`)**: Shows matched vehicles with dynamic green and red criteria chips.
