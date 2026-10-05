# Battle log ingester

Fetches the player's battle log from the Clash Royale API (through the RoyaleAPI proxy) and saves new matches to Postgres. The dashboard reads from the same database.

`main.py` is deployed as the Cloud Run function `battle-log-ingester` (project `clash-royale-479900`, region `us-west1`, entry point `cloud_trigger`). The Cloud Scheduler job `daily-battle-log-fetch` calls it daily at 12:00 UTC. Inserts skip matches that already exist, so triggering it again is safe.

## Configuration

Set as environment variables on the Cloud Run service:

- `API_TOKEN`: Clash Royale API key. Keys are restricted by IP, so the key must allow the RoyaleAPI proxy, `45.79.218.79`. The dashboard uses the same key as `CLASH_ROYALE_API_TOKEN`.
- `PLAYER_TAG`: the player tag to ingest.
- `DB_CONNECTION_STRING`: Postgres connection string.

## Deploy

From this directory:

```powershell
gcloud run deploy battle-log-ingester --source . --function cloud_trigger --base-image python313 --region us-west1 --project clash-royale-479900
```

Deploying keeps the service's existing environment variables.

## Rotate the API key

Prompts for the new key and updates only `API_TOKEN` on the service:

```powershell
.\update_api_key.ps1
```

Then update `CLASH_ROYALE_API_TOKEN` for the dashboard in Vercel and `.env.local`.

## Run locally

With the three variables set in your environment:

```powershell
pip install -r requirements.txt
python main.py
```
