# SENTE SPEAK

SENTE SPEAK is an assistive web application that identifies six Ugandan Shilling banknote
denominations from a camera capture or an uploaded image, using the project's trained
MobileNetV2 model, and speaks the result.

It identifies **denominations only**. It does **not** authenticate banknotes or detect counterfeits.

## What is implemented

- React + TypeScript + Tailwind CSS frontend with a minimal, accessibility-first interface.
- FastAPI backend running the real exported TensorFlow Lite model via `ai-edge-litert`.
- Camera capture (with permission handling, switch and cancel) and JPG/PNG upload with preview.
- Structured "recognized" and "uncertain" results; uncertain results never show a denomination.
- Speech synthesis with voice detection, repetition, replay, and honest failure reporting.
- English speech strings; explicit placeholders and English fallback for Luganda and Ateso.
- Configurable rejection policy (confidence + top-two margin).
- Persisted accessibility preferences: text size, high contrast, reduced motion, speech settings.
- Automated backend and frontend tests, TypeScript checks and accessibility lint rules.

## Architecture

```
Browser (React SPA)
  ├─ UI components / pages        src/components, src/pages
  ├─ camera + upload handling     src/hooks/useCamera.ts, src/components/UploadPanel.tsx
  ├─ speech + language config     src/hooks/useSpeech.ts, src/config/languages.ts
  ├─ accessibility preferences    src/context/AccessibilityContext.tsx
  └─ API client                   src/config/api.ts
        │  POST /api/recognize (multipart/form-data)
        ▼
FastAPI backend
  ├─ image validation + decode    app/preprocessing.py
  ├─ model loading + inference    app/inference.py
  ├─ prediction interpretation    app/policy.py
  ├─ class map                    app/denominations.py
  └─ configuration                app/config.py
        │
        ▼
backend/models/sente_speak_float32.tflite
```

## Project structure

```
sente-speak/
├── backend/
│   ├── app/                  FastAPI application modules
│   ├── models/               model artifacts (copied from ../export)
│   ├── tests/                pytest suite
│   ├── .env.example
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── src/components/       reusable accessible UI components
│   ├── src/config/           API client, languages, denominations
│   ├── src/context/          announcer + accessibility preferences
│   ├── src/hooks/            speech, camera, recognition
│   ├── src/pages/            Home, Settings, About
│   ├── src/test/             Vitest tests
│   ├── .env.example
│   └── package.json
└── docs/                     API, model and accessibility documentation
```

## Prerequisites

- Python 3.11 or newer (development verified on Python 3.14).
- Node.js 20 or newer (development verified on Node 24).
- A modern browser with `getUserMedia` and `SpeechSynthesis` support for camera and speech.
- Camera access requires `localhost` or HTTPS.

## Installation

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env

# Frontend (new terminal)
cd frontend
npm install
Copy-Item .env.example .env
```

### Model placement

The exported artifacts from the project's `export/` folder have been copied into
`backend/models/`:

```
backend/models/sente_speak_float32.tflite
backend/models/sente_speak_dynamic_range.tflite
backend/models/labels.txt
backend/models/model_metadata.json
```

The float32 artifact is the default. To use the dynamic-range artifact, set
`SENTE_MODEL_FILE=sente_speak_dynamic_range.tflite`. The `.keras` file is only needed for
retraining/export and is not used at runtime. The service falls back to `../export` when
`backend/models` is absent, or you can set `SENTE_MODEL_DIR` to an absolute path.

If the model is missing or invalid, `/api/health` reports `"model_unavailable"`, the home screen
shows a clear message, and recognition is disabled. No predictions are fabricated.

## Development

Terminal 1 — backend:

```powershell
cd backend
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 — frontend:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.
Interactive API documentation is at `http://127.0.0.1:8000/docs`.

Set `VITE_API_URL=http://localhost:8000` in `frontend/.env` if you want the browser to call the
backend directly instead of using the proxy.

## Production

1. Build the frontend: `cd frontend; npm run build` (output in `frontend/dist`).
2. Serve `frontend/dist` with any static web server.
3. Reverse-proxy `/api` to the FastAPI backend, or set `VITE_API_URL` to the backend origin before
   building and include that origin in `SENTE_CORS_ORIGINS`.
4. Run the backend with a production ASGI server, for example:
   `uvicorn app.main:app --host 127.0.0.1 --port 8000`.
5. Serve the site over HTTPS when using the camera on non-localhost hosts.

## Configuration

See `backend/.env.example` and `frontend/.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SENTE_MODEL_DIR` | auto | Folder containing the `.tflite` model and labels |
| `SENTE_MODEL_FILE` | `sente_speak_float32.tflite` | Model artifact to load |
| `SENTE_INPUT_MODE` | `raw_0_255` | Model input contract (see `docs/MODEL.md`) |
| `SENTE_MIN_CONFIDENCE` | `0.60` | Provisional top-class acceptance threshold |
| `SENTE_MIN_MARGIN` | `0.20` | Provisional top-two gap threshold |
| `SENTE_MAX_UPLOAD_BYTES` | `12582912` | Upload size limit |
| `SENTE_CORS_ORIGINS` | localhost:5173 | Allowed browser origins |
| `VITE_API_URL` | empty (proxy) | Backend origin for the built frontend |

## Verification

```powershell
cd backend; .\.venv\Scripts\python -m pytest
cd frontend; npm test
cd frontend; npm run typecheck
cd frontend; npm run lint
cd frontend; npm run build
```

At the time of writing: 28 backend tests, 7 frontend tests, typecheck, lint and production build
all pass. A real validation image (`10k/cls_UGX_genuine_0088.jpg`) returns `UGX 10,000` with
confidence `0.998` through the HTTP API.

## Speech languages

- **English (`en`)**: verified denomination strings.
- **Luganda (`lg`)** and **Ateso (`teo`)**: placeholder entries (`null`) with visible notices.
  English audio is used as a fallback and the UI states this explicitly until verified
  translations are supplied. No translations were invented.

If a browser has no speech synthesis or no suitable voice, the UI reports that speech is
unavailable or that a fallback voice was used. It never reports success after playback failure.

## Important notes

- The confidence thresholds are provisional starting points and must be tuned on validation data
  before operational use.
- See `docs/API.md` for the API contract, `docs/MODEL.md` for the preprocessing verification, and
  `docs/ACCESSIBILITY.md` for the accessibility checklist.
- There is no browser-only/offline inference in this version; the backend service is required.
