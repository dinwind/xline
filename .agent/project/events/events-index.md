# Events index

> **Role**: `.agent/project/events/` holds **cross-project change notices** that other local projects may need to react to.
> **Entry point for AI/MCP**: Update this file whenever you add a new event markdown so agents can discover local linkage work.
> **Scope**: Use this directory for API/schema changes, breaking behavior, shared dependency changes, process changes, or any update that may affect another local project.

## How to use

1. **Write** a new event as `events/<topic>.md` or `events/<yyyy-mm-dd>-<topic>.md`.
2. **Register** the event in the table below (path relative to `project/events/`).
3. **Targets** should name affected local projects or relations. Supported forms:
   - project directory names, e.g. `frontend`, `wsync`
   - `project:<name>`, e.g. `project:frontend`
   - `relation:<name>`, e.g. `relation:shared-api`
   - `all-local` for broad local-machine impact
4. **Status** should be one of `open`, `acknowledged`, `resolved`, or `superseded`.
5. **Read** this index when checking cross-project impact or preparing a linked change.

## Index

| Event | File | Kind | Targets | Status | Updated | Summary |
|-------|------|------|---------|--------|---------|---------|
| *(add rows as you create events)* | | | | | | |

---

*Generated/maintained by cokodo-agent — run `co scaffold` to create missing dirs.*
