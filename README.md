# FuelEU Maritime Compliance Platform

## Overview

A full-stack implementation of the **FuelEU Maritime Regulation (EU) 2023/1805** compliance module. The project provides:
- route registry and baseline selection
- year-aware GHG intensity compliance checks
- compliance balance calculation
- banking of surplus CB (Art. 20)
- pooling of adjusted CB across same-year ships (Art. 21)
- a React frontend and an Express + PostgreSQL backend

## Architecture summary

This project follows a hexagonal-style structure.

### Backend

- `backend/src/core/domain/` — pure domain logic and regulatory formulas
- `backend/src/core/application/` — use-cases that orchestrate business rules
- `backend/src/core/ports/` — repository interfaces (ports)
- `backend/src/adapters/outbound/` — PostgreSQL repository implementations
- `backend/src/adapters/inbound/` — Express HTTP handlers
- `backend/src/infrastructure/` — DB connection, migrations, seed, server setup
- `backend/src/shared/` — shared utilities or types if needed

### Frontend

- `frontend/src/core/domain/` — shared domain types
- `frontend/src/core/ports/` — API adapter interfaces
- `frontend/src/adapters/infrastructure/` — HTTP adapters to backend APIs
- `frontend/src/adapters/ui/` — React UI components and tabs
- `frontend/src/shared/` — shared styles or utilities

## Setup & Run

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### 1. Install dependencies

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fueleu
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

### 3. Prepare the database

```bash
psql -U postgres -c "CREATE DATABASE fueleu;"
cd backend
npm run db:migrate
npm run db:seed
```

### 4. Start the backend

```bash
cd backend
npm run dev
```

The backend runs at `http://localhost:3001`.

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

The frontend runs at `http://localhost:3000`.

## How to execute tests

### Backend tests

```bash
cd backend
npm test
```

### Frontend tests

```bash
cd frontend
npm test
```

## Outcomes

- Backend tests: `24/24` passed
- Frontend tests: `8/8` passed
- Backend build: success
- Frontend build: success
- Local UI: `http://localhost:3000`
- Backend health: `http://localhost:3001/health`

## API Reference

### Routes

| Method | Path | Description |
|---|---|---|
| GET | `/routes` | Get all routes |
| POST | `/routes/:id/baseline` | Mark a route as baseline |
| GET | `/routes/comparison` | Compare same-year routes against the selected baseline |

### Compliance

| Method | Path | Description |
|---|---|---|
| GET | `/compliance/cb?year=YYYY` | Compute compliance balances for all routes in the year |
| GET | `/compliance/cb?shipId=R001&year=YYYY` | Get compliance balance for a single ship/year |
| GET | `/compliance/adjusted-cb?year=YYYY` | Get adjusted CB values for all ships in the year |
| GET | `/compliance/adjusted-cb?shipId=R001&year=YYYY` | Get adjusted CB for a single ship/year |

### Banking

| Method | Path | Description |
|---|---|---|
| GET | `/banking/records?shipId&year` | Retrieve bank ledger records |
| POST | `/banking/bank` | Bank a positive CB `{ shipId, year }` |
| POST | `/banking/apply` | Apply banked CB `{ shipId, year, amount }` |

### Pooling

| Method | Path | Description |
|---|---|---|
| GET | `/pools` | List all pools |
| POST | `/pools` | Create a pooling agreement `{ year, shipIds }` |

## Sample requests / responses

### Get compliance balance for a ship

```bash
curl "http://localhost:3001/compliance/cb?shipId=R002&year=2024"
```

Sample response:

```json
{
  "shipId": "R002",
  "year": 2024,
  "cb": 87308000,
  "energyInScope": 196800000,
  "targetIntensity": 89.3368,
  "actualIntensity": 88.0
}
```

### Bank surplus for a ship

```bash
curl -X POST http://localhost:3001/banking/bank \
  -H "Content-Type: application/json" \
  -d '{"shipId":"R001","year":2024}'
```

Sample response:

```json
{
  "banked": 8200000,
  "entry": {
    "id": "...",
    "shipId": "R001",
    "year": 2024,
    "amountGco2eq": 8200000,
    "createdAt": "2026-04-10T..."
  }
}
```

### Create a pooling agreement

```bash
curl -X POST http://localhost:3001/pools \
  -H "Content-Type: application/json" \
  -d '{"year":2024,"shipIds":["R001","R002","R003"]}'
```

Sample response:

```json
{
  "id": "...",
  "year": 2024,
  "members": [
    { "shipId": "R002", "cbBefore": 1234000, "cbAfter": 0 },
    { "shipId": "R003", "cbBefore": -4500000, "cbAfter": -3266000 }
  ],
  "createdAt": "2026-04-10T..."
}
```

## Seed data

| routeId | vesselType | fuelType | year | ghgIntensity | baseline |
|---|---|---|---|---|---|
| R001 | Container | HFO | 2024 | 91.0 | yes |
| R002 | BulkCarrier | LNG | 2024 | 88.0 | no |
| R003 | Tanker | MGO | 2024 | 93.5 | no |
| R004 | RoRo | HFO | 2025 | 89.2 | no |
| R005 | Container | LNG | 2025 | 90.5 | no |
