# SmartCaisse Local Agent (fingerprint reader)

> **Windows only.** The Suprema BioMini 2 SDK (`UFScanner.dll`, `UFMatcher.dll`, etc.) and `ctypes.windll` require Windows. A **32-bit Python** interpreter is required to load the SDK DLLs and talk to the fingerprint pad.

This package runs on the PC where the Suprema BioMini 2 reader is connected. It polls the backend and performs fingerprint capture / enrollment / verification.

## Prerequisites

- Windows with the BioMini 2 reader connected and its driver installed.
- [uv](https://docs.astral.sh/uv/) installed.
- `AGENT_API_KEY` matching the backend configuration.

## Setup

There is a **single `.env.example` for the whole project** at the repository root. It holds the backend settings and the agent settings (`BACKEND_URL`, `AGENT_API_KEY`, `POLL_INTERVAL`, `UFSCANNER_DLL`, ...). Copy it once at the root:

```bash
# From the repository root
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
# Then fill in AGENT_API_KEY and TEMPLATE_KEY
```

Then install the agent dependencies from `server/`:

```bash
cd server

# Install the 32-bit CPython build required by the fingerprint SDK DLLs
uv python install cpython-3.12-windows-x86

# Install dependencies
uv sync
```

> The x86 build is mandatory: a 64-bit Python process cannot load the 32-bit Suprema DLLs shipped in this folder, so the agent would not be able to connect to the reader. The agent loads the root `.env` automatically via `load_dotenv()`.

## Run

From the repository root, enter `server/` first (the paths below are relative to that folder):

```bash
cd server

# Start the polling agent
uv run python src/agent.py

# Test a single SDK capture (saves empreinte_test.bmp)
uv run python src/test.py
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `BACKEND_URL` | Base URL of the FastAPI backend | `http://localhost:8000` |
| `AGENT_API_KEY` | Shared secret, must match the backend | *(empty)* |
| `POLL_INTERVAL` | Polling interval in seconds | `2` |
| `UFSCANNER_DLL` | Path to `UFScanner.dll` | `./UFScanner.dll` |

`TEMPLATE_KEY` is used only by the backend; the agent sends raw captures.

## Notes

- `src/test.py` is kept usable as-is and is the reference for SDK calls.
- Template extraction and 1:1 matching are not covered by `src/test.py`: see the TODOs in `src/scanner.py` and `src/agent.py`.
