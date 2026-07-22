# Event: AuthNexus HTTPS port 3443 → 443

| Field | Value |
|-------|-------|
| Kind | infra / endpoint |
| Status | open |
| Updated | 2026-07-21 |
| Targets | project:AuthNexus, project:Axline, project:AxGate (clients using AuthNexus base URL) |

## Change

AuthNexus production HTTPS working port moved from **3443** to **443**.

- Canonical base: `https://auth.mtsilicon.com` (standard HTTPS; no `:port`)
- Retired for clients: `https://auth.mtsilicon.com:3443` (and HTTP `:3000` / `:3443` variants)

## Axline reaction

- Default `authNexusBaseUrl` + `AXLINE_ENDPOINT_URL_MIGRATIONS` rewrite `:3443` → `https://auth.mtsilicon.com`
- Publish/verify scripts (`load-axline-config.mjs`) aligned
- Local `~/.axline/endpoints.json` updated; `verify-private-update` OK on `:443`

## Note for other projects

Update any hard-coded `:3443` AuthNexus base URLs. Download URLs returned by AuthNexus latest API now use host without `:3443`.
