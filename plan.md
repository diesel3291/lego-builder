## Goal
Deploy `lego-builder` to a public URL without router access and with zero setup on client devices.

## Chosen approach
Use a single Dockerized web service on Render:
- Build frontend assets with Node during image build.
- Serve frontend + API from Flask/Gunicorn in one container.
- Expose one public HTTPS URL.

## Steps
1. Add `Dockerfile` for Python + Node multi-stage build.
2. Add `.dockerignore` to keep image lean.
3. Add short deploy instructions to `README.md`.
4. Verify locally:
   - frontend build works
   - app starts via gunicorn command

## Verification
- `npm run build` in `frontend`
- `python -m pip install -r requirements.txt` (already done)
- `python -c "from app import app; print('ok')"` import check
- confirm `static/index.html` exists after build
