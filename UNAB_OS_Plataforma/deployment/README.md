# deployment

Deployment assets for services that run beside the Next.js app.

- `jarvis/`: Python package (`pyproject.toml`, `src/`, `data/`) for the Jarvis academic bridge, with its default academic context file.
- `railway/entrypoint.sh`: container entrypoint used by the Railway setup.
- Build files for the TEMA sync worker are one level up (`Dockerfile.tema-sync`, `railway.tema-sync.json`).
