# Ticket Seguros

A ticket resell app with a NestJS backend and React frontend.

## Project Structure

```
ticketseguros/
├── backend/     # NestJS backend with TypeScript
└── frontend/    # React frontend with TypeScript
```

## Getting Started

### Quick Start (Recommended)

From the root directory, you can manage both backend and frontend:

1. Install all dependencies:
```bash
npm run install:all
```

2. Start both servers in development mode:
```bash
npm run dev
```

This will start:
- Backend on `http://localhost:3000`
- Frontend on `http://localhost:5173`

### Individual Project Setup

You can also work with each project independently:

#### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run start:dev
```

The backend will run on `http://localhost:3000`

#### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### Root-Level Commands

From the root directory:

- `npm run install:all` - Install dependencies for root, backend, and frontend
- `npm run install:backend` - Install only backend dependencies
- `npm run install:frontend` - Install only frontend dependencies
- `npm run dev` - Start both backend and frontend in development mode
- `npm run dev:backend` - Start only backend in development mode
- `npm run dev:frontend` - Start only frontend in development mode
- `npm run build` - Build both projects for production
- `npm run build:backend` - Build only backend
- `npm run build:frontend` - Build only frontend
- `npm run start` - Start both projects in production mode

## Features

### Backend
- `/health` endpoint for health checks
- CORS enabled for frontend communication

### Frontend
- Landing page with search functionality
- Event cards displaying:
  - Event name
  - Date
  - Location
  - Venue name
- Minimal, high-contrast UI design
- Responsive grid layout

## Design System

The app uses a minimal, high-contrast color scheme:
- Background: #FAFAFA
- Surface/Cards: #FFFFFF
- Primary Text: #111111
- Secondary Text: #6B7280
- Borders: #E5E7EB
- Primary Accent: #0F766E

