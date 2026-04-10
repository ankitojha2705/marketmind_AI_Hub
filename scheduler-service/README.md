# Scheduler Service

Runs one job: publish due posts where:
- `posts.status == "scheduled"`
- `posts.scheduledAt <= now`
- campaign status is `scheduled` or `active`

Shared core logic supports both:
- FastAPI endpoint (`POST /jobs/run`) for local/manual triggers
- AWS Lambda handler (`lambda_handler.handler`) for scheduled EventBridge runs

## Local run

1. Create and activate virtual environment.

Windows (CMD):

```bash
python -m venv venv
venv\Scripts\activate.bat
```

macOS/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies.

```bash
pip install -r requirements.txt
```

3. Create `.env` from `.env.example`.

4. Start API.

```bash
uvicorn app.main:app --reload --port 8010
```

Trigger job:

```bash
curl -X POST http://localhost:8010/jobs/run
```

If `SCHEDULER_TOKEN` is set:

```bash
curl -X POST http://localhost:8010/jobs/run -H "x-scheduler-token: <token>"
```

## Lambda run

Set handler to:

`lambda_handler.handler`

Use EventBridge schedule (e.g. every 30 minutes) to invoke Lambda.
