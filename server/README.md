# SmartCaisse Local Agent (fingerprint reader)

> Windows only: the Suprema BioMini 2 SDK (`UFScanner.dll`, etc.) and `ctypes.windll` require Windows.

This package runs on the PC where the Suprema BioMini 2 reader is connected.
It polls the backend and performs fingerprint capture/enrollment/verification.

## Setup (uv)
```bash
cd server
cp .env.example .env
# fill AGENT_API_KEY, TEMPLATE_KEY (same as backend)
uv sync
```

## Run
```bash
uv run agent.py
```

## Test SDK capture
```bash
uv run python test.py
```

## Environment variables
- `BACKEND_URL` (default `http://localhost:8000`)
- `AGENT_API_KEY` (shared secret, must match backend)
- `TEMPLATE_KEY` is used only by the backend; the agent sends raw captures.
- `POLL_INTERVAL` (seconds, default 2)
- `UFSCANNER_DLL` (path to `UFScanner.dll`, default `./UFScanner.dll`)

## Notes
- `test.py` is kept usable as-is and is the reference for SDK calls.
- Template extraction / 1:1 matching are not covered by `test.py`: see TODOs in `scanner.py` and `agent.py`.