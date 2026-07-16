# whisper-service

Local transcription microservice for Fulcrum voice intake.

## Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

## Run
uvicorn main:app --host 0.0.0.0 --port 8000

First run downloads the "small" faster-whisper model (~500MB) — expect a delay before /health responds.

## Notes

`faster-whisper` is pinned to 1.1.1, not the plan's original 1.0.3 — 1.0.3's PyAV dependency fails to build against FFmpeg 8.1.2 on macOS. 1.1.1 has no relevant API changes for this service's usage.
