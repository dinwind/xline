# Axline VS Code extension — build & optional install (Windows wrapper).
# Ensures bun is on PATH, then delegates to the cross-platform script.
#
# Usage:
#   .\scripts\axline-vscode-build.ps1
#   .\scripts\axline-vscode-build.ps1 -Install
#   .\scripts\axline-vscode-build.ps1 -SkipDeps -SkipSdk

param(
    [switch]$Install,
    [switch]$SkipDeps,
    [switch]$SkipSdk
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$BunBin = Join-Path $env:USERPROFILE ".bun\bin"

if (Test-Path $BunBin) {
    $env:Path = "$BunBin;$env:Path"
}

$Args = @("$RepoRoot\scripts\axline-vscode-build.mjs")
if ($Install) { $Args += "--install" }
if ($SkipDeps) { $Args += "--skip-deps" }
if ($SkipSdk) { $Args += "--skip-sdk" }

& bun @Args
exit $LASTEXITCODE
