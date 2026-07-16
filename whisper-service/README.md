# whisper-service

Local transcription microservice for Fulcrum voice intake.

## Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

## Run
uvicorn main:app --host 0.0.0.0 --port 8000

First run downloads the "small" faster-whisper model (~500MB) — expect a delay before /health responds.
