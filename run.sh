#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Build frontend if node_modules exist
if [ -d "frontend/node_modules" ]; then
  echo "Building frontend..."
  (cd frontend && npm run build)
fi

# Check static assets exist
if [ ! -f "static/index.html" ]; then
  echo "Error: static/index.html not found. Run 'cd frontend && npm install && npm run build' first."
  exit 1
fi

# Activate venv if present
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
fi

PORT="${PORT:-5000}"
echo "Starting BrickBuilder on http://localhost:$PORT"

if command -v gunicorn &> /dev/null; then
  gunicorn app:app --bind "0.0.0.0:$PORT" --workers 2
else
  python3 -c "from app import app; app.run(host='0.0.0.0', port=$PORT)"
fi
