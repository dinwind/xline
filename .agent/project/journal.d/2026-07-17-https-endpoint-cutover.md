# HTTPS endpoint cutover (AxGate + AuthNexus)

- Defaults: AxGate `https://auth.mtsilicon.com:6343`; AuthNexus `https://auth.mtsilicon.com:3443`.
- Reject remote plain HTTP for `axgateBaseUrl` / `authNexusBaseUrl` (localhost HTTP still allowed).
- Auto-migrate known retired bases (`:6100` / `:3000` HTTP) in `~/.axline/endpoints.json` on startup.
- Removed `AXLINE_FEEDBACK_ALLOW_HTTP` dogfood bypass.
- Updated examples, SOP/spec/skill/deploy, user handbook, publish config loader.
