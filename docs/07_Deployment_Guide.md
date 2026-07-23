# 07. Deployment Guide

This document describes the environment prerequisites, local development configurations, Dockerization containers, production deployment strategies, and continuous integration workflows.

---

## 1. Prerequisites
Ensure the target deployment server or local computer contains:
* **Node.js** v18.0 or higher
* **Python** v3.10 or higher
* **MongoDB** v6.0 or higher (or a MongoDB Atlas connection string)
* **Docker** & **Docker Compose** (optional, for containerized environments)

---

## 2. Local Development Environment Setup

### 2.1 Backend Setup
1. Open a terminal in the `backend` directory.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file under `backend/` using the following variables:
   ```env
   MONGO_URI=mongodb://localhost:27017/finance_reimbursement
   JWT_SECRET=super_secret_key_change_in_production
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   OCR_PROVIDER=tesseract  # or google_document_ai
   LLM_API_KEY=your_llm_api_key
   PORT=8000
   ```
5. Run the development server:
   ```bash
   uvicorn server:app --reload --port 8000
   ```

### 2.2 Frontend Setup
1. Open a terminal in the `frontend` directory.
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Run the hot-reloading development server:
   ```bash
   npm run dev
   ```
   > **Note**: If you encounter ESLint warnings related to a Jest plugin version mismatch during development, add `DISABLE_ESLINT_PLUGIN=true` to `frontend/.env`. This suppresses the warnings without affecting functionality or production builds.
4. Access the client portal at `http://localhost:3000`.

---

## 3. Dockerization

### 3.1 Docker Compose Configuration
To run the full suite locally inside Docker, use the following `docker-compose.yml` file placed at the project root:

```yaml
version: '3.8'

services:
  database:
    image: mongo:6.0
    container_name: finance-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    container_name: finance-backend
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=mongodb://database:27017/finance_reimbursement
      - JWT_SECRET=prod_secret_key_xyz
      - LLM_API_KEY=your_key_here
    depends_on:
      - database

  frontend:
    build: ./frontend
    container_name: finance-frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongo_data:
```

---

## 4. Production Deployment

### 4.1 Database Setup (MongoDB Atlas)
1. Register a cluster on MongoDB Atlas.
2. Whitelist the IP addresses of your hosting servers.
3. Retrieve the SRV connection string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/finance_reimbursement`
4. Set the connection string in the backend `.env` variables.

### 4.2 Application Hosting
* **Backend**: Deploy FastAPI to services like Render, AWS App Runner, or Heroku. Ensure you configure your hosting service's environment variables to override the local `.env` variables.
* **Frontend**: Deploy the static React build to netlify, Vercel, or AWS S3 + CloudFront:
  ```bash
  # Generate build package
  npm run build
  ```

---

## 5. CI/CD Pipeline (GitHub Actions)

Create a workflow file `.github/workflows/deploy.yml` to automate tests and container builds:

```yaml
name: CI/CD Build and Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
      - name: Run Backend Tests
        run: |
          pytest backend/

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install and Build Frontend
        run: |
          cd frontend
          npm install
          npm run build
```
