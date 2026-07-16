import tempfile
import os

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

model = WhisperModel("small", device="cpu", compute_type="int8")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if audio.content_type not in ("audio/webm", "audio/wav", "audio/mpeg", "audio/mp4"):
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {audio.content_type}")

    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        segments, _info = model.transcribe(tmp_path, beam_size=5)
        text = " ".join(segment.text.strip() for segment in segments)
    finally:
        os.unlink(tmp_path)

    return {"text": text.strip()}
