# Skip Get Started onboarding — login first

**Date:** 2026-07-15

## Change

Removed first-launch Cline onboarding wizard ("How will you use Axline?", provider config, etc.). Fresh installs now show `AccountWelcomeView` (Sign in to Axline) directly.

## Files

- `apps/vscode/webview-ui/src/App.tsx` — route `showWelcome` to `AccountView`; complete welcome after sign-in
- `apps/vscode/webview-ui/src/components/account/AccountView.tsx` — `isWelcomeFlow` hides header until signed in
- `apps/vscode/webview-ui/src/App.stories.tsx` — stories updated for login-first flow
