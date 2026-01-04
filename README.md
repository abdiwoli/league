# Football League Manager

A comprehensive, production-ready web application for managing a 4-team football league.

![Project Screenshot](https://via.placeholder.com/800x400?text=League+Manager+UI)

## Features

- **League Management**: Automatically calculates table standings (Points, GD, GF).
- **Match Scheduling**: Auto-generates a balanced Round Robin schedule (Home/Away).
- **Admin Dashboard**: sophisticated interface for managing teams and entering scores.
- **Authentication**: Secure Admin/Viewer login with JWT and HttpOnly cookies.
- **Responsive Design**: Mobile-first UI built with Tailwind CSS and glassmorphism.

## Tech Stack

### Frontend
- **React 19** linked with Vite
- **TypeScript**
- **Tailwind CSS** (v3.4)
- **TanStack Query** (State Management)
- **Axios**

### Backend
- **Node.js** & **Express**
- **Prisma ORM**
- **PostgreSQL** (Production) / SQLite (Dev)
- **JWT** Authentication

## getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or use SQLite for local dev)

### Installation

1.  **Clone the repo**
    ```bash
    git clone git@github.com:abdiwoli/league.git
    cd league
    ```

2.  **Install Dependencies**
    ```bash
    # Install server dependencies
    cd server
    npm install

    # Install frontend dependencies
    cd ../frontend
    npm install
    ```

3.  **Environment Setup**
    - Create `server/.env` and add:
      ```env
      DATABASE_URL="postgresql://user:pass@localhost:5432/league"
      JWT_SECRET="super-secret-key"
      CLIENT_URL="http://localhost:5173"
      PORT=5000
      ```

4.  **Run Locally**
    ```bash
    # Start Backend
    cd server
    npx prisma generate
    npx prisma db push
    npm run dev

    # Start Frontend (in new terminal)
    cd frontend
    npm run dev
    ```

## Deployment

Refer to the included `deployment_guide.md` for instructions on deploying to **Vercel**, **Render**, and **Neon**.
