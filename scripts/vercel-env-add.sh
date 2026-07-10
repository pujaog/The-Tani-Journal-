#!/usr/bin/env bash
set -euo pipefail

# vercel-env-add.sh
# Read variables from a .env file (defaults to .env) or prompt interactively,
# then add them to your Vercel project using the Vercel CLI.
# Usage: ./vercel-env-add.sh [path-to-env-file]

ENV_FILE="${1:-.env}"
	required_vars=(
	  "MONGO_URL"
	  "DB_NAME"
	  "NEXT_PUBLIC_FIREBASE_API_KEY"
	  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
	  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
	  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
	  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
	  "NEXT_PUBLIC_FIREBASE_APP_ID"
	  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"
	  "ADMIN_EMAILS"
	  "CORS_ORIGINS"
	)

if ! command -v vercel >/dev/null 2>&1; then
  echo "Error: vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Note: env file '$ENV_FILE' not found. Script will prompt for values interactively."
fi

# Which environments to add to (comma-separated)
read -rp "Environments to add (comma-separated, default: production,preview): " envs_input
envs_input=${envs_input:-production,preview}
# normalize to array
IFS=',' read -ra ENV_LIST <<< "${envs_input// /}"

# Use VERCEL_TOKEN if present for non-interactive auth
VC_TOKEN_ARG=()
if [ -n "${VERCEL_TOKEN-}" ]; then
  VC_TOKEN_ARG=(--token "$VERCEL_TOKEN")
fi

add_var() {
  local name="$1" value="$2"
  for env in "${ENV_LIST[@]}"; do
    env_trim=$(echo "$env" | tr -d '[:space:]')
    if [ -z "$env_trim" ]; then continue; fi
    echo "Adding $name to Vercel environment: $env_trim"
    # Try direct non-interactive form first
    if [ -n "${VERCEL_TOKEN-}" ]; then
      if vercel env add "$name" "$value" "$env_trim" --token "$VERCEL_TOKEN" >/dev/null 2>&1; then
        echo "  OK ($env_trim)"
      else
        echo "  Failed (non-interactive). Falling back to interactive add for $name/$env_trim."
        vercel env add "$name" "$env_trim"
      fi
    else
      # Without token, call interactive CLI which will require you to be logged in
      if vercel env add "$name" "$value" "$env_trim" >/dev/null 2>&1; then
        echo "  OK ($env_trim)"
      else
        echo "  Interactive fallback: launching vercel env add $name $env_trim"
        vercel env add "$name" "$env_trim"
      fi
    fi
  done
}

# Helper to read from env file
get_from_envfile() {
  local key="$1" file="$2"
  if [ ! -f "$file" ]; then echo ""; return; fi
  # match lines like KEY=VALUE, allow quoted values
  local line
  line=$(grep -m1 -E "^${key}=" "$file" || true)
  if [ -z "$line" ]; then echo ""; return; fi
  local val=${line#*=}
  # Remove surrounding quotes if present
  val=$(echo "$val" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  echo "$val"
}

for key in "${required_vars[@]}"; do
  # try to get from env file
  val=""
  if [ -f "$ENV_FILE" ]; then
    val=$(get_from_envfile "$key" "$ENV_FILE")
  fi
  if [ -z "$val" ]; then
    # prompt (hide input for sensitive-looking keys)
    if [[ "$key" =~ (KEY|SECRET|PASSWORD|TOKEN|MONGO|API) ]]; then
      read -rsp "Enter value for $key (input hidden, leave blank to skip): " val
      echo
    else
      read -rp "Enter value for $key (leave blank to skip): " val
    fi
  else
    echo "Found $key in $ENV_FILE"
  fi
  if [ -z "$val" ]; then
    echo "Skipping $key (no value provided)."
    continue
  fi
  add_var "$key" "$val"
done

echo "All done. Verify variables in the Vercel Dashboard or with 'vercel env ls'."
