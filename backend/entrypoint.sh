#!/bin/sh
set -eu

alembic -c backend/alembic.ini upgrade head
python backend/seed_users.py
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
