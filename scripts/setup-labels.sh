#!/usr/bin/env bash
# Creates or updates a repo's pipeline labels. Idempotent. Needs gh, authenticated.
#
#   scripts/setup-labels.sh <owner/repo> [labels.txt]
#
# Without a labels file the framework's defaults (scripts/labels.txt) are used: the size, risk,
# pipeline, needs-human, blocked and type labels. Area labels are the project's — add them to a
# copy of labels.txt, one `name|color|description` per line.
set -euo pipefail
repo=${1:?usage: setup-labels.sh <owner/repo> [labels.txt]}
file=${2:-"$(dirname "$0")/labels.txt"}
while IFS='|' read -r name color desc; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  gh label create "$name" -R "$repo" --color "$color" --description "$desc" --force >/dev/null && echo "label $name"
done < "$file"
