#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create scheduler_job_user if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'scheduler_job_user') THEN
            CREATE USER scheduler_job_user WITH PASSWORD 'scheduler_job_pwd';
        END IF;
    END
    \$\$;

    -- Create scheduler_agent_user if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'scheduler_agent_user') THEN
            CREATE USER scheduler_agent_user WITH PASSWORD 'scheduler_agent_pwd';
        END IF;
    END
    \$\$;

    -- Grant privileges on the database to both users
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO scheduler_job_user;
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO scheduler_agent_user;
EOSQL

# Grant schema privileges (need to connect to the specific database)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    GRANT ALL ON SCHEMA public TO scheduler_job_user;
    GRANT ALL ON SCHEMA public TO scheduler_agent_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO scheduler_job_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO scheduler_agent_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO scheduler_job_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO scheduler_agent_user;
EOSQL

