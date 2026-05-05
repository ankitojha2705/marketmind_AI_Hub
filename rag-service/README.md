# MarketMind RAG Service

FastAPI service for knowledge documents, embeddings, and RAG chat. Uses **PostgreSQL** with the **[pgvector](https://github.com/pgvector/pgvector)** extension.

## Requirements

- Python 3.11+
- PostgreSQL **with `pgvector`** installed (see below)
- OpenAI API key (`OPENAI_API_KEY`)

## PostgreSQL on Windows (no Docker)

### 1. Install PostgreSQL

Install from [PostgreSQL Windows downloads](https://www.postgresql.org/download/windows/) (run the EDB installer), or:

```powershell
winget install PostgreSQL.PostgreSQL
```

During setup, set a password for the built-in **`postgres`** superuser and note the port (default **5432**). Add the `bin` folder to your PATH if the installer does not, for example:

`C:\Program Files\PostgreSQL\17\bin`  
(The folder name may be `16` or `17` depending on the version.)

Ensure the service is running:

```powershell
Get-Service -Name postgresql*
# If needed (name may vary):
# Start-Service postgresql-x64-17
```

### 2. Install pgvector

The stock Windows installer does **not** include pgvector. The RAG service runs `CREATE EXTENSION vector` on startup, so the extension must exist on the server.

- Follow the **[pgvector Windows instructions](https://github.com/pgvector/pgvector#windows)** (copy `vector.dll` into the PostgreSQL `lib` folder and extension files into `share/extension`), **or**
- Use a managed Postgres that already provides pgvector (e.g. Neon, Supabase) and put that URI in `DATABASE_URL` instead of `localhost`.

If `CREATE EXTENSION vector` fails locally, use a host that ships pgvector or complete the Windows file install from the pgvector repo.

### 3. Create database user, database, and extension

Open **SQL Shell (psql)** from the Start menu, or in PowerShell (adjust the version folder if needed):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -p 5432
```

Run the following in `psql` (pick your own password and use the same value in `.env`; avoid `@`, `#`, and `/` in the password or [URL-encode](https://www.urlencoder.org/) it in `DATABASE_URL`):

```sql
CREATE USER marketmind WITH PASSWORD 'changeme_local_dev_only';
CREATE DATABASE marketmind_rag OWNER marketmind;
\c marketmind_rag
CREATE EXTENSION IF NOT EXISTS vector;
GRANT ALL PRIVILEGES ON SCHEMA public TO marketmind;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO marketmind;
\q
```

### 4. Application credentials

Copy the example env file and set the URL to match step 3:

```powershell
cd rag-service
copy .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://marketmind:changeme_local_dev_only@localhost:5432/marketmind_rag
```

If you use a different user, password, host, port, or database name, change the URL accordingly.

## Setup (Python)

```powershell
cd rag-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env`: `DATABASE_URL`, `OPENAI_API_KEY`, and optional `PORT` (default **8003**).

## Run

```powershell
uvicorn app.main:app --reload --port 8003
```

- OpenAPI: `http://localhost:8003/docs`

## macOS (optional, Homebrew)

If you use Homebrew, you can install Postgres and pgvector together, then create the same role and database as in step 3:

```bash
brew install postgresql@16 pgvector
brew services start postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
psql postgres -c "CREATE USER marketmind WITH PASSWORD 'changeme_local_dev_only';"
psql postgres -c "CREATE DATABASE marketmind_rag OWNER marketmind;"
psql marketmind_rag -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Use the same `DATABASE_URL` format in `.env` (host may be `localhost`).
