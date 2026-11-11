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

ORIGINAL_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ZETTLY_APP_DIR="${ZETTLY_APP_DIR:-$(cd "$ORIGINAL_SCRIPT_DIR/.." && pwd)}"

# ---------------------------------------------------------------------------
# Re-exec from a temp copy so git reset --hard does not alter running script.
#
# Two stages, on purpose:
#   1. the copy taken here is the PREVIOUS release's script;
#   2. after the reset, the script shipped by the target commit is executed.
# Stage 2 is what makes a newly added deploy step apply in the release that
# introduces it instead of one release later.
# ---------------------------------------------------------------------------
if [ "${ZETTLY_DEPLOY_REEXEC:-}" != "1" ]; then
    TMP_SCRIPT="$(mktemp /tmp/zettly-deploy.XXXXXX.sh)"
    cp "$0" "$TMP_SCRIPT"
    chmod 700 "$TMP_SCRIPT"
    export ZETTLY_DEPLOY_TMP="$TMP_SCRIPT"
    trap 'rm -f "${ZETTLY_DEPLOY_TMP:-}"' EXIT
    ZETTLY_DEPLOY_REEXEC=1 exec bash "$TMP_SCRIPT" "$@"
fi

# The copy above is the PREVIOUS release's script, because it is taken before
# `git reset --hard`. Any step added to this file therefore used to take effect
# one release late: v0.12.32 added `queue:restart`, but the cycle that installed
# it still ran v0.12.31's copy and never restarted the workers. Keep the temp
# copy (bash reads a script incrementally, so resetting it mid-run is unsafe),
# and clean it up in whichever stage ends up running.
if [ -n "${ZETTLY_DEPLOY_TMP:-}" ]; then
    trap 'rm -f "${ZETTLY_DEPLOY_TMP:-}"' EXIT
fi

APP_DIR="$ZETTLY_APP_DIR"
cd "$APP_DIR"

# ---------------------------------------------------------------------------
# Run artisan as the web user.
#
# The deploy itself runs as root (auto-deploy cron, or `sudo scripts/deploy.sh`).
# Running `php artisan view:cache` as root leaves compiled views owned by root,
# and the web user then cannot rewrite them: the next request fails with
# "touch(): Utime failed: Operation not permitted" (Sentry POS-CLINIC-EB, 49
# events). Every artisan call below goes through this helper so the files it
# writes stay owned by the user that serves them.
# ---------------------------------------------------------------------------
artisan() {
    if [ "$(id -u)" -eq 0 ] && id -u www-data >/dev/null 2>&1; then
        sudo -u www-data php artisan "$@"
    else
        command php artisan "$@"
    fi
}

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

if [ "$TARGET_COMMIT" = "$BEFORE_COMMIT" ] && [ "${ZETTLY_DEPLOY_RESET_DONE:-}" != "1" ]; then
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

if [ "${ZETTLY_DEPLOY_RESET_DONE:-}" != "1" ]; then
    echo "[deploy] 1. Resetting git working tree to $TARGET_COMMIT..."
    git reset --hard "$TARGET_COMMIT"

    # git runs as root here, so every tracked file it writes is owned by root.
    # The app only needs to write storage/ and bootstrap/cache/, but leaving
    # those root-owned is what produced "touch(): Utime failed" before. Hand
    # them back to the web user right after the reset.
    if [ "$(id -u)" -eq 0 ] && id -u www-data >/dev/null 2>&1; then
        chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
    fi
fi

# Now that the working tree is the target release, run the deploy script that
# release actually ships. Without this the steps below are always the previous
# release's steps, so a newly added step silently waits one release to apply.
if [ "${ZETTLY_DEPLOY_STAGE2:-}" != "1" ]; then
    NEW_SCRIPT="$APP_DIR/scripts/deploy.sh"
    if [ -f "$NEW_SCRIPT" ] && ! cmp -s "$NEW_SCRIPT" "${ZETTLY_DEPLOY_TMP:-/dev/null}"; then
        TMP2="$(mktemp /tmp/zettly-deploy-stage2.XXXXXX.sh)"
        cp "$NEW_SCRIPT" "$TMP2"
        chmod 700 "$TMP2"
        echo "[deploy] Re-executing the deploy script shipped by $TARGET_COMMIT..."
        # Hand the cleanup of the first copy to this stage; after exec the old
        # trap is gone, so without this the /tmp file would be left behind.
        rm -f "${ZETTLY_DEPLOY_TMP:-}" 2>/dev/null || true
        ZETTLY_DEPLOY_STAGE2=1 ZETTLY_DEPLOY_RESET_DONE=1 ZETTLY_DEPLOY_TMP="$TMP2" \
            exec bash "$TMP2" "$@"
    fi
fi

if [ -f "composer.json" ] && command -v composer >/dev/null 2>&1; then
    echo "[deploy] 2. Updating composer dependencies..."
    composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --quiet || true
fi

if [ "$RUN_MIGRATIONS" -eq 1 ]; then
    echo "[deploy] 3. Running database migrations..."
    artisan migrate --force
fi

if [ -f "scripts/build-assets.sh" ]; then
    echo "[deploy] 4. Building frontend atomic assets..."
    bash scripts/build-assets.sh
fi

echo "[deploy] 5. Refreshing caches..."
artisan config:clear
artisan route:clear
artisan view:clear
artisan cache:clear

artisan config:cache
artisan route:cache
artisan view:cache

# Queue workers hold the job classes they booted with in memory, so a release
# that changes a job would keep running the old code until someone restarted
# supervisor by hand. That happened on 11 November 2026: the report job fix was
# deployed and still failed with the previous exception for as long as the
# workers stayed up. queue:restart lets each worker finish its current job and
# exit, and supervisor starts it on the new release.
echo "[deploy] 6. Restarting queue workers..."
artisan queue:restart

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
