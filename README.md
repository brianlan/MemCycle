# MemCycle

A macOS menu bar flashcard app with spaced repetition scheduling.

## Features

- **Menu Bar App**: Lives in your menu bar, not the Dock
- **Spaced Repetition**: SM-2 and Leitner algorithms for optimal learning
- **Periodic Reviews**: Configurable popup intervals (default: 25 minutes)
- **Auto-Dismiss**: Smart defer after 30 seconds of no response
- **Two Card Frontends**: Manual form or AI-powered Collins Dictionary
- **LLM Integration**: OpenAI-compatible API for generating definitions
- **Data Privacy**: Local SQLite database with optional PostgreSQL remote
- **Export/Import**: JSON backup with full scheduling state
- **Keyboard Shortcuts**: Rate cards with 1-4 keys, reveal with Space

## Screenshots

### Review Popup
- Front → Reveal → Rate flow
- Countdown timer
- Keyboard-driven

### Deck Management
- Create, edit, delete decks
- Card count and due count
- Markdown preview

### Settings
- Algorithm selection (SM-2 / Leitner)
- Timer configuration
- Database mode (Local/Remote)
- LLM API configuration

## Installation

### From Release

1. Download `MemCycle_1.0.0_aarch64.dmg` from releases
2. Open the DMG file
3. Drag MemCycle to Applications
4. Launch from Applications or menu bar

### From Source

```bash
# Install dependencies
bun install

# Development mode
bun run tauri dev

# Production build
bun run tauri build
```

## Usage

### First Launch
1. Onboarding wizard guides you to create your first deck and card
2. Configure popup interval in Settings (default: 25 min)
3. Optionally configure LLM API for AI card generation

### Daily Workflow
1. App shows popup at configured interval
2. Review flashcard: Press Space/Enter to reveal answer
3. Rate recall: Press 1-4 (Again/Hard/Good/Easy)
4. Card scheduled for next review based on algorithm

### Keyboard Shortcuts

| Context | Shortcut | Action |
|---------|----------|--------|
| Review | Space / Enter | Reveal answer |
| Review | 1-4 | Rate card (Again/Hard/Good/Easy) |
| Review | Escape | Dismiss (no response) |
| Form | Cmd+Enter | Save card |
| Form | Escape | Cancel |
| App | Cmd+, | Open settings |

## Configuration

### Algorithm Settings
- **SM-2**: SuperMemo 2 - standard algorithm with ease factor
- **Leitner**: Box-based system - simpler but effective

### Database
- **Local**: SQLite (default) - stored in app data directory
- **Remote**: PostgreSQL - configure host, port, credentials

### LLM Integration
Supports any OpenAI-compatible API:
- Endpoint: `https://api.openai.com/v1/chat/completions`
- API Key: Your API key (stored encrypted)
- Model: `gpt-4o-mini` (default, configurable)

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Tauri v2 (Rust)
- **Database**: SQLite via @tauri-apps/plugin-sql
- **UI**: shadcn/ui + Tailwind CSS
- **Testing**: Vitest + Playwright

## Development

```bash
# Run tests
bun test           # Unit tests
bun run test:e2e  # E2E tests

# Lint
bun run lint

# Build
bun run build     # Frontend only
bun run tauri build  # Full app
```

## License

MIT
