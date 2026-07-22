# 2026-07-21 — AuthNexus HTTPS port 3443 → 443

- Default `authNexusBaseUrl`: `https://auth.mtsilicon.com` (standard :443).
- Migrations: `:3000` / `:3443` / explicit `:443` → new base (runtime + publish scripts).
- Updated living SOP/spec/examples/handbook; left historical release-note download URLs as published.
- Local `~/.axline/endpoints.json` rewritten; `verify-private-update` Enroll/Latest/Download/SHA OK on `:443`.
- Event: `events/2026-07-21-authnexus-https-443.md`
