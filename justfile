# kana — common development tasks. Run `just` to list them.

default:
    @just --list

# Install dependencies
install:
    npm install

# Start the development server (http://localhost:5173/kana/)
dev:
    npm run dev

# Alias for `dev`
serve: dev

# Build the production bundle into dist/
build:
    npm run build

# Build and serve the production bundle locally
preview: build
    npm run preview

# Type-check Svelte and TypeScript
check:
    npm run check

# Lint and check formatting
lint:
    npm run lint

# Format all files
format:
    npm run format

# Run unit tests
test:
    npm test

# Run unit tests in watch mode
test-watch:
    npm run test:watch

# Run end-to-end tests (installs the browser on first run)
e2e:
    npx playwright install chromium
    npm run test:e2e

# Run everything CI runs
ci: lint check test build e2e

# Re-download and process the pronunciation audio from Wikimedia Commons
audio:
    npx tsx scripts/fetch-audio.ts

# Re-process sound effects from scripts/sfx-sources
sfx:
    npx tsx scripts/process-sfx.ts

# Download stroke-order data from KanjiVG
kanjivg:
    npx tsx scripts/fetch-kanjivg.ts

# Download and subset the Japanese fonts
fonts:
    npx tsx scripts/subset-fonts.ts

# Re-process background photos from scripts/photo-sources
photos:
    npx tsx scripts/process-photos.ts
