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

# Start the VOICEVOX engine used to generate pronunciation audio (Docker)
voicevox:
    docker run -d --rm --name voicevox -p 50021:50021 voicevox/voicevox_engine:cpu-latest

# Generate pronunciation audio for all voices in scripts/voices.json (needs `just voicevox`)
audio:
    npx tsx scripts/generate-audio.ts

# Build voice-preview/index.html to compare VOICEVOX voices (needs `just voicevox`)
voice-preview:
    npx tsx scripts/generate-audio.ts --preview

# Build voice-preview/styles.html to compare how single kana are spoken (needs `just voicevox`)
voice-preview-styles:
    npx tsx scripts/generate-audio.ts --preview-styles

# Re-process sound effects from scripts/sfx-sources
sfx:
    npx tsx scripts/process-sfx.ts

# Download stroke-order data from KanjiVG
kanjivg:
    npx tsx scripts/fetch-kanjivg.ts

# Trace the memory-hint drawings from Tofugu's Learn Hiragana and Katakana books (needs poppler and potrace)
tofugu:
    npx tsx scripts/tofugu-drawings.ts

# Build drawings-preview/index.html to compare the traced drawings with the originals
tofugu-preview:
    npx tsx scripts/tofugu-drawings.ts --preview

# Download and subset the Japanese fonts
fonts:
    npx tsx scripts/subset-fonts.ts

# Re-process background photos from scripts/photo-sources
photos:
    npx tsx scripts/process-photos.ts

# Regenerate the app icons
icons:
    npx tsx scripts/make-icons.ts

# ── Speech model (ml/, see docs/plan-kana-speech-model.md) ──────────────────────

# Write ml/classes.json, the model's sound classes, from the app's kana
ml-classes:
    npx tsx scripts/ml-classes.ts

# Start six VOICEVOX engines (ports 50021–50026) for generating training speech
ml-engines:
    for p in 50021 50022 50023 50024 50025 50026; do docker run -d --rm --name voicevox-$p -p $p:50021 voicevox/voicevox_engine:cpu-latest /opt/voicevox_engine/run --host 0.0.0.0 --cpu_num_threads 2; done

# Stop the engines started by `just ml-engines`
ml-engines-stop:
    docker stop voicevox-50021 voicevox-50022 voicevox-50023 voicevox-50024 voicevox-50025 voicevox-50026

# Generate training speech for the voices in ml/voices.json (needs `just ml-engines`; resumable)
ml-data:
    cd ml && uv run python -m kana_speech.generate --engines 50021,50022,50023,50024,50025,50026 --jobs 2

# Train the speech model (on the M4's GPU)
ml-train name="v1" *args="":
    cd ml && uv run python -m kana_speech.train --name {{name}} {{args}}

# Evaluate the speech model on the held-out voices; writes ml/reports/<name>.md
ml-eval name="v1":
    cd ml && uv run python -m kana_speech.evaluate --name {{name}}

# Export the speech model to public/models/
ml-export name="v1":
    cd ml && uv run python -m kana_speech.export --name {{name}}

# Write the golden files the TypeScript speech tests compare against
ml-fixtures:
    cd ml && uv run python -m kana_speech.fixtures

# Run the Python tests and linter
ml-test:
    cd ml && uv run pytest -q && uv run ruff check kana_speech tests && uv run ruff format --check kana_speech tests
