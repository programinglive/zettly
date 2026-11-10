#!/usr/bin/env bash
#
# Deploy Zettly with safe tag/branch targeting and atomic asset rebuild.
#
# Usage:
#   sudo /var/www/zettly/scripts/deploy.sh [options]
#
#   --branch=<name>   Branch to deploy (default: main)
#   --tag=<tag>       Deploy this exact tag instead of branch tip
#   --no-migrate      Skip migrations
#   --dry-run         Show what would happen, change nothing
#   --help            Show this help
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Re-exec from a temp copy so git reset --hard does not alter running script.
# ---------------------------------------------------------------------------
if [ "${ZETTLY_DEPLOY_REEXEC:-}" != "1" ]; then
    TMP_SCRIPT="$(mktemp /tmp/zettly-deploy.XXXXXX.sh)"
    cp "$0" "$TMP_SCRIPT"
    chmod 700 "$TMP_SCRIPT"
    export ZETTLY_DEPLOY_TMP="$TMP_SCRIPT"
    trap 'rm -f "${ZETTLY_DEPLOY_TMP:-}"' EXIT
    ZETTLY_DEPLOY_REEXEC=1 exec bash "$TMP_SCRIPT" "$@"
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

BRANCH="main"
DEPLOY_TAG=""
RUN_MIGRATIONS=1
DRY_RUN=0

for arg in "$@"; do
    case "$arg" in
        --branch=*) BRANCH="${arg#*=}" ;;
        --tag=*) DEPLOY_TAG="${arg#*=}" ;;
        --no-migrate) RUN_MIGRATIONS=0 ;;
        --dry-run) DRY_RUN=1 ;;
        --help|-h)
            sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "Unknown option: $arg" >&2
            exit 2
            ;;
    esac
done

BEFORE_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo '')"

if [ -n "$DEPLOY_TAG" ]; then
    echo "[deploy] Fetching origin tags for $DEPLOY_TAG..."
    git fetch origin --tags --quiet

    if ! TARGET_COMMIT="$(git rev-parse --verify --quiet "refs/tags/$DEPLOY_TAG^{commit}")"; then
        echo "[deploy] ERROR: Tag '$DEPLOY_TAG' cannot be resolved." >&2
        exit 1
    fi
else
    echo "[deploy] Fetching origin/$BRANCH..."
    git fetch origin "$BRANCH" --quiet
    TARGET_COMMIT="$(git rev-parse "origin/$BRANCH")"
fi

echo "[deploy] Before: ${BEFORE_COMMIT:0:7} | Target: ${TARGET_COMMIT:0:7} (${DEPLOY_TAG:-origin/$BRANCH})"

if [ "$TARGET_COMMIT" = "$BEFORE_COMMIT" ]; then
    echo "[deploy] Already at target ($TARGET_COMMIT). Nothing to deploy."
    exit 0
fi

if [ "$DRY_RUN" -eq 1 ]; then
    echo "[deploy] [dry-run] Would reset to $TARGET_COMMIT"
    echo "[deploy] [dry-run] Would run composer install --no-dev"
    echo "[deploy] [dry-run] Would run php artisan migrate --force"
    echo "[deploy] [dry-run] Would run bash scripts/build-assets.sh"
    echo "[deploy] [dry-run] Would rebuild route and config caches"
    exit 0
fi

echo "[deploy] 1. Resetting git working tree to $TARGET_COMMIT..."
git reset --hard "$TARGET_COMMIT"

if [ -f "composer.json" ] && command -v composer >/dev/null 2>&1; then
    echo "[deploy] 2. Updating composer dependencies..."
    composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --quiet || true
fi

if [ "$RUN_MIGRATIONS" -eq 1 ]; then
    echo "[deploy] 3. Running database migrations..."
    php artisan migrate --force
fi

if [ -f "scripts/build-assets.sh" ]; then
    echo "[deploy] 4. Building frontend atomic assets..."
    bash scripts/build-assets.sh
fi

echo "[deploy] 5. Refreshing caches..."
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

php artisan config:cache
php artisan route:cache
php artisan view:cache

MARKER_DIR="/var/lib/deploy-tags/deployed"
if [ -d "$(dirname "$MARKER_DIR")" ]; then
    mkdir -p "$MARKER_DIR" 2>/dev/null || true
    if [ -w "$MARKER_DIR" ]; then
        {
            if [ -n "$DEPLOY_TAG" ]; then
                printf '%s\n' "$DEPLOY_TAG"
            else
                printf '<%s>\n' "$BRANCH"
            fi
            printf '%s\n' "$TARGET_COMMIT"
        } > "$MARKER_DIR/zettly" 2>/dev/null || true
        echo "[deploy] Version marker recorded: ${DEPLOY_TAG:-<$BRANCH>} @ ${TARGET_COMMIT:0:7}"
    fi
fi

echo "[deploy] SUCCESS: Deployed ${DEPLOY_TAG:-<$BRANCH>} (${TARGET_COMMIT:0:7})"
