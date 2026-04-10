# FuelEU Maritime Compliance Platform

A full-stack implementation of **FuelEU Maritime Regulation (EU) 2023/1805** compliance features with:
- route management
- compliance balance calculation
- banking (Art. 20)
- pooling (Art. 21)

## Repository Structure

- `/backend` — Express + TypeScript + PostgreSQL implementation
- `/frontend` — React + TypeScript + Vite UI

## Architecture Overview

Both backend and frontend follow a hexagonal style:
- `core` contains pure business/domain logic
- `ports` define interfaces
- `adapters` implement framework-specific behavior

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2. Configure backend

Create `backend/.env` with values similar to:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fueleu
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
```

### 3. Configure frontend

Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:3001
```

This value is optional if the frontend is served from the same origin as the backend.

### 4. Prepare the database

```bash
psql -U postgres -c "CREATE DATABASE fueleu;"
cd backend
npm run db:migrate
npm run db:seed
```

## Run locally

### Backend

```bash
cd backend
npm run dev
```

Backend listens on `http://localhost:3001` by default.

### Frontend

```bash
cd frontend
npm run dev
```

Frontend listens on `http://localhost:3000` by default.

## Build

### Backend

```bash
cd backend
npm run build
```

### Frontend

```bash
cd frontend
npm run build
```

## Tests

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

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

## Example requests

```bash
curl "http://localhost:3001/compliance/cb?shipId=R002&year=2024"

curl -X POST http://localhost:3001/banking/bank \
  -H "Content-Type: application/json" \
  -d '{"shipId":"R002","year":2024}'

curl -X POST http://localhost:3001/pools \
  -H "Content-Type: application/json" \
  -d '{"year":2024,"shipIds":["R001","R002","R004"]}'
```

## Seed data

| routeId | vesselType | fuelType | year | ghgIntensity | baseline |
|---|---|---|---|---|---|
| R001 | Container | HFO | 2024 | 91.0 | yes |
| R002 | BulkCarrier | LNG | 2024 | 88.0 | no |
| R003 | Tanker | MGO | 2024 | 93.5 | no |
| R004 | RoRo | HFO | 2025 | 89.2 | no |
| R005 | Container | LNG | 2025 | 90.5 | no |
