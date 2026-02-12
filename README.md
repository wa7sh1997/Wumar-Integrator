# Wumar Integrator

Wumar Integrator is a Codex-driven execution app that accepts natural-language prompts, routes them through a backend orchestration layer, performs real operations, and can return downloadable Excel artifacts.

## Features

- Single prompt input for user commands.
- Backend execution through OpenAI Codex-compatible Responses API.
- Real `.xlsx` generation with multiple sheets and formulas supported.
- Download endpoint for generated files.
- In-memory artifact registry with automatic cleanup.

## Local Setup

### Prerequisites

- Node.js 20+
- `OPENAI_API_KEY` environment variable

### Run backend

```bash
npm run server
```

Backend starts on `http://localhost:8787`.

### Run frontend

```bash
npm run dev
```

Frontend starts on `http://localhost:3000` and proxies `/api` to the backend.

## Environment variables

- `OPENAI_API_KEY` (required): API key for Codex execution.
- `CODEX_MODEL` (optional): defaults to `gpt-5-codex`.
- `PORT` (optional): backend port, defaults to `8787`.
