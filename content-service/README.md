# MarketMind Content Service

FastAPI service for **campaigns** (and future post/content APIs). Uses the **same MongoDB** as Auth Service (`marketmind` database) but keeps domain logic separate.

## Requirements

- Python 3.11+
- MongoDB URI with database name in the path (e.g. `.../marketmind?...`)
- **`JWT_SECRET` must match** `Auth_Service` so `Authorization: Bearer <token>` from the frontend validates here.

## Setup

```bash
cd content-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env   # then edit .env
```

Set `MONGODB_URI` and `JWT_SECRET` (same values as Auth Service).

## Run

```bash
uvicorn app.main:app --reload --port 8002
```

- Health: `GET http://localhost:8002/health`
- OpenAPI: `http://localhost:8002/docs`

## API (all require `Authorization: Bearer <JWT>`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/brands/{brandId}/campaigns` | List campaigns for brand |
| POST | `/api/brands/{brandId}/campaigns` | Create campaign |
| GET | `/api/brands/{brandId}/campaigns/{campaignId}` | Get one |
| PATCH | `/api/brands/{brandId}/campaigns/{campaignId}` | Update |
| DELETE | `/api/brands/{brandId}/campaigns/{campaignId}` | Delete |

Membership is checked against the **`brandmembers`** collection (same as Mongoose `BrandMember`).

## Campaign document (MongoDB `campaigns` collection)

- `brand` (ObjectId), `createdBy` (ObjectId)
- `name`, `brief`, `platforms[]`, `status`, `objective`
- `startDate`, `endDate` (UTC datetimes), `timezone`
- `audience`: `{ location, ageMin, ageMax, interests[], languages[] }`
- `budget`, `spent`
- `createdAt`, `updatedAt`

## Frontend

Point the app at this service with an env var such as `VITE_CONTENT_API_URL=http://localhost:8002` and send the same JWT as for Auth.
