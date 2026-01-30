# AO Armor Optimization Engine
# Usage: just --list
#
# All dev lifecycle commands go through just.
# Node/npm are managed by mise — never use system node directly.

export PATH := `mise bin-path 2>/dev/null || echo $PATH` + ":" + env("PATH")

default:
    @just --list

# ---------- Setup ----------

# First-time setup (mise + deps)
setup:
    mise trust
    mise install
    npm ci
    @echo "Ready. Run 'just check' to verify."

# Install dependencies
install:
    npm ci

# ---------- Quality Gates ----------

# Run ALL quality gates (typecheck + lint + test)
check:
    just typecheck
    just lint-check
    just test

# Type-check only (no emit)
typecheck:
    npx tsc --noEmit

# Lint (strict, no auto-fix — used by check)
lint-check:
    npx eslint src/

# Lint with auto-fix (use during development)
lint:
    npx eslint src/ --fix

# Run tests
test:
    npx vitest run

# Run tests in watch mode
test-watch:
    npx vitest

# ---------- Dev Server ----------

# Start dev server
dev:
    npx vite

# ---------- Build ----------

# Production build
build:
    npx tsc -b && npx vite build

# Preview production build locally
preview:
    npx vite preview

# ---------- Utilities ----------

# Add a shadcn/ui component (e.g., just add-component button)
add-component name:
    npx shadcn@latest add {{name}}

# Remove build artifacts
clean:
    rm -rf dist node_modules/.tmp coverage

# Merge a user data export into bundled equipment.json
merge-export file:
    node scripts/merge-user-export.cjs {{file}}
