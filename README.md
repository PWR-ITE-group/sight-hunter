# Sight Hunter

> **Note:** This project was developed during the **BestHacks 2026** hackathon.

**Sight Hunter** is a gamified urban exploration platform designed to turn sightseeing into an interactive quest. Focusing on landmarks in Wroclaw, Poland, the platform challenges users to discover real-world locations, verify their visits using AI-powered image recognition, complete quizzes, and compete on leaderboards.

---

## Overview

Sight Hunter bridges the gap between digital gaming and real-world tourism. Users receive quests and daily tasks to find specific architectural sights and cultural landmarks. When a user arrives at a location and takes a photo, our background ML worker validates the submission against curated reference images using Meta's `DINOv2` vision model alongside geolocation checks. Successful finds reward users with in-game currency, which can be spent in the virtual shop.

---

## Key Features

* **AI-Powered Visual Verification:** Asynchronous photo validation using `facebook/dinov2-base` visual embeddings to ensure users actually found the target landmark.
* **Geolocation Validation:** Spatial distance verification to confirm the user is physically present near the sight.
* **Quests & Quiz System:** Multi-step exploration quests and location-based trivia quizzes.
* **Daily Challenges:** Recurring daily tasks to drive user retention and consistent engagement.
* **Virtual Economy & Leaderboard:** Built-in wallet system, transaction history, virtual shop, and real-time Redis-backed leaderboards.
* **Social & Media Sharing:** Support for user submissions, media uploads (S3-compatible storage), and social interactions.
* **Admin Dashboard:** Integrated administrative interface for managing places, quests, users, and game content.

---

## System Architecture & Tech Stack

The project is built as a multi-service architecture separating the client application, core API, background ML processing, and curated landmark dataset.

### 1. Backend API (`/api`)
* **Framework:** Python, FastAPI
* **Database & ORM:** PostgreSQL, SQLAlchemy (Async), Alembic (migrations)
* **Caching & Queues:** Redis (Rate limiting, Idempotency keys, Leaderboards, Task broker)
* **Object Storage:** S3-compatible storage (MinIO / AWS S3) for user media
* **Authentication:** JWT-based auth

### 2. ML Verification Worker (`/worker`)
* **Model:** `facebook/dinov2-base` (Vision Transformer for feature extraction and similarity scoring)
* **Role:** Consumes verification tasks from the queue, downloads user-submitted photos, computes cosine similarity against pre-calibrated reference embeddings, and returns validation results to the API.

### 3. Frontend Client (`/frontend`)
* **Role:** Cross-platform / Web user interface providing interactive maps, camera integration for sight capture, quest tracking, wallet management, and leaderboards.

### 4. Content & Calibration (`/content`)
* **Dataset:** Curated YAML definitions (`places.yaml`), reference imagery of Wroclaw landmarks (`refs/`), and DINOv2 threshold calibration reports (`calibration/`).

---

## Project Structure

```text
sight-hunter/
├── api/                        # Core FastAPI backend application
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── core/               # Config, DB, Redis, S3 storage, geo, security, rate-limiting
│   │   ├── modules/            # Domain modules:
│   │   │   ├── admin/          # Admin panel setup
│   │   │   ├── auth/           # Authentication & user management
│   │   │   ├── daily/          # Daily challenges
│   │   │   ├── finds/          # Sight submission & verification logic
│   │   │   ├── media/          # File uploads & S3 integration
│   │   │   ├── quests/         # Quests & quiz questions
│   │   │   ├── shop/           # Virtual item shop
│   │   │   ├── social/         # Social features & feeds
│   │   │   └── wallet/         # User balance, transactions & leaderboards
│   │   ├── main.py             # FastAPI application entrypoint
│   │   ├── seed.py             # Database seeding script
│   │   └── worker.py           # Worker task dispatch / integration
│   ├── tests/                  # Unit and E2E tests (including ML worker E2E)
│   ├── Dockerfile
│   └── pyproject.toml
├── worker/                     # Dedicated ML Worker service
│   ├── app/                    # DINOv2 model inference & embedding comparison
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/                   # User-facing client application (Web / Mobile)
│   ├── src/                    # UI components, screens, API client, state management
│   └── package.json
├── content/                    # Landmark data, reference photos & ML calibration
│   ├── calibration/            # DINOv2 model evaluation reports
│   ├── refs/                   # Reference images for Wroclaw landmarks
│   └── places.yaml             # Sights metadata, coordinates & descriptions
├── docker-compose.yml          # Multi-container orchestration
├── .env.example                # Environment variables template
└── README.md
```

---

## Getting Started

### Prerequisites

* **Docker** & **Docker Compose**
* **Python 3.11+** and **Poetry** (for local backend/worker development)
* **Node.js 18+** (for local frontend development)

### 1. Clone the Repository

```bash
git clone https://github.com/pwr-ite-group/sight-hunter.git
cd sight-hunter
```

### 2. Configure Environment Variables

Copy the example environment file and adjust the credentials if needed:

```bash
cp .env.example .env
```

### 3. Run with Docker Compose (Recommended)

Start all services (PostgreSQL, Redis, MinIO/S3, API, ML Worker, and Frontend):

```bash
docker compose up --build
```

### 4. Local Development Setup

#### Backend API
```bash
cd api
poetry install
poetry run alembic upgrade head
poetry run python -m app.seed
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Once running, interactive API documentation is available at `http://localhost:8000/docs`.

#### ML Worker
```bash
cd worker
poetry install
poetry run python -m app.main
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Running Tests

The backend includes a test suite covering authentication, content, quests, sight submissions, and end-to-end ML worker integration:

```bash
cd api
poetry run pytest
```

---

## License

This project is licensed under the terms specified in the `LICENSE` file.
