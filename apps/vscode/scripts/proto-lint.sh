#!/bin/bash
set -eu
exec node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/proto-lint.mjs" "$@"
