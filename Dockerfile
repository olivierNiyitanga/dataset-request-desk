FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY seed/ ./seed/

RUN chmod +x /app/backend/entrypoint.sh

ENV PYTHONPATH=/app/backend
EXPOSE 8000

CMD ["/app/backend/entrypoint.sh"]
