# Specs (Living Documentation)

This directory holds **functional specifications by domain** — the current
truth for what the system SHALL do. Organize by capability, e.g.:

```
specs/
├── README.md
├── auth/
│   └── spec.md
└── checkout/
    └── spec.md
```

Each `spec.md` should use requirements and scenarios (GIVEN/WHEN/THEN).
Create domains as needed; there is no required initial structure beyond this file.

See also: `../changes/` for active change proposals.

Register each living spec in **specs-index.md** so AI/MCP can discover them.
