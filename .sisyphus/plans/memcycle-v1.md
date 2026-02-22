# MemCycle v1.0 - macOS Flashcard App

## TL;DR

> **Quick Summary**: Build a macOS menu bar flashcard app with popup-based spaced repetition reviews, supporting SM-2 and Leitner algorithms, markdown content, deck organization, and LLM-powered card creation.
> 
> **Deliverables**:
> - Tauri + React menu bar app for macOS
> - Flashcard review popup with front/back reveal flow
> - SM-2 and Leitner spaced repetition algorithms
> - Deck-based card organization
> - SQLite local database with optional PostgreSQL remote
> - JSON export/import with full memorization state
> - Two card creation frontends: Default form + CollinsDictionary LLM
> - Settings UI for timer, algorithm, LLM API configuration
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Scaffolding → Database → Algorithms → Popup → UI Integration

---

## Context

### Original Request
Build a macOS menu bar flashcard app with:
- Popup reviews every 25 minutes (configurable)
- Spaced repetition with user-selectable algorithms
- Markdown-formatted card content
- Local/remote database options
- Export/import with memorization status
- Multiple card creation "frontends" (form-based and LLM-powered)

### Interview Summary
**Key Decisions**:
- Tech stack: Tauri + React
- Algorithms: SM-2 + Leitner (FSRS deferred to v2)
- Popup timing: Configurable (5min-2hr, default 25min)
- Auto-dismiss: 30 seconds
- Card flow: Front → Reveal (space/enter) → Rate (1-4 keys)
- Organization: Decks/categories
- Database: SQLite local, PostgreSQL remote option
- Export: JSON format
- LLM: In-app settings UI, generate-on-button-click
- Menu bar: Dropdown with stats and quick actions
- Timer scope: Global (one interval for all decks)

**Research Findings**:
- Reference: `ahkohd/tauri-macos-menubar-app-example` (v2 branch)
- Database: `@tauri-apps/plugin-sql` with SQLite
- Positioning: `tauri-plugin-positioner` for popup near tray
- Dock hiding: `app.set_activation_policy(ActivationPolicy::Accessory)`
- SM-2 defaults: EF=2.5, first intervals 1d/6d
- Leitner defaults: Box 1 (start), intervals [1d, 3d, 7d, 14d, 30d]

### Metis Review
**Gaps Addressed**:
- Popup positioning: Near tray icon (using tauri-plugin-positioner)
- Multi-monitor: Follow menu bar monitor
- Card priority: Oldest due first, then by deck order
- Algorithm defaults: SM-2 EF=2.5, Leitner Box=1
- LLM errors: Show error toast, allow retry
- DB migrations: Versioned SQL migrations
- Keyboard shortcuts: App-focused only (not global hotkeys)
- First-run: Onboarding wizard (create first deck, add sample card)

---

## Work Objectives

### Core Objective
Deliver a polished macOS menu bar flashcard application that enables efficient vocabulary learning through popup-based micro-reviews with scientifically-backed spaced repetition scheduling.

### Concrete Deliverables
- `/src-tauri/` - Rust backend with Tauri commands
- `/src/` - React frontend components
- `/src-tauri/migrations/` - SQLite schema migrations
- Working `.app` bundle for macOS

### Definition of Done
- [ ] `bun run tauri build` produces working .app bundle
- [ ] App appears in menu bar, not in Dock
- [ ] Popup shows flashcard, accepts rating, schedules next review
- [ ] Cards persist across app restarts (SQLite)
- [ ] Export/import round-trips without data loss

### Must Have
- Menu bar icon with dropdown
- Configurable popup timer (5min-2hr)
- Auto-dismiss after 30s with smart defer
- Front/back card reveal flow
- Rating via keyboard (1-4) and buttons
- SM-2 algorithm implementation
- Leitner algorithm implementation
- Algorithm selection in settings
- Deck CRUD operations
- Card CRUD operations
- Markdown rendering in popup
- SQLite local database
- JSON export/import
- Default card creation form
- CollinsDictionary LLM frontend
- LLM API settings (endpoint + key)
- Editable prompt template
- Login at startup option

### Must NOT Have (Guardrails)
- NO FSRS algorithm (v2 scope)
- NO sync between local and remote databases
- NO images or audio in cards (markdown text only)
- NO Anki import/export compatibility
- NO analytics dashboard
- NO mobile/cross-platform considerations
- NO factory patterns or DI containers (keep it simple)
- NO global keyboard shortcuts (app-focused only)
- NO over-abstraction - direct, clear code paths
- NO excessive commenting beyond what's necessary
- NO "user manually tests" acceptance criteria

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: YES (TDD for core logic)
- **Framework**: Vitest for unit tests, Playwright for integration
- **If TDD**: Each algorithm task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: Use interactive_bash (tmux) — Run command, validate output
- **API/Backend**: Use Bash (curl) — Send requests, assert responses
- **Algorithms**: Use Bash (bun test) — Run test suite, verify pass count

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 7 parallel tasks):
├── Task 1: Tauri + React project scaffolding [quick]
├── Task 2: SQLite database setup with migrations [quick]
├── Task 3: TypeScript types and interfaces [quick]
├── Task 4: Rust command stubs [quick]
├── Task 5: Vitest + Playwright test setup [quick]
├── Task 6: React component library setup (shadcn/ui) [quick]
└── Task 7: Markdown rendering component [quick]

Wave 2 (Core Logic — 6 parallel tasks, TDD):
├── Task 8: SM-2 algorithm implementation (TDD) [deep]
├── Task 9: Leitner algorithm implementation (TDD) [deep]
├── Task 10: Deck repository (CRUD) [unspecified-high]
├── Task 11: Card repository (CRUD) [unspecified-high]
├── Task 12: Scheduling service [deep]
└── Task 13: No-response handler with smart defer [deep]

Wave 3 (Tauri Integration — 6 parallel tasks):
├── Task 14: Menu bar tray with dropdown [unspecified-high]
├── Task 15: Popup window management [unspecified-high]
├── Task 16: Settings storage and retrieval [unspecified-high]
├── Task 17: Timer service (background scheduling) [deep]
├── Task 18: PostgreSQL remote connection [unspecified-high]
└── Task 19: Export/import JSON handlers [unspecified-high]

Wave 4 (UI Components — 7 parallel tasks):
├── Task 20: Flashcard review popup UI [visual-engineering]
├── Task 21: Deck management UI [visual-engineering]
├── Task 22: Card creation form (Default frontend) [visual-engineering]
├── Task 23: CollinsDictionary frontend with LLM [visual-engineering]
├── Task 24: Settings panel UI [visual-engineering]
├── Task 25: Menu bar dropdown UI [visual-engineering]
└── Task 26: First-run onboarding wizard [visual-engineering]

Wave 5 (Integration & Polish — 4 parallel tasks):
├── Task 27: End-to-end integration [deep]
├── Task 28: Keyboard shortcuts implementation [quick]
├── Task 29: Login at startup (SMAppService) [quick]
└── Task 30: App bundle and signing [quick]

Wave FINAL (Verification — 4 parallel):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA with Playwright [unspecified-high]
└── Task F4: Scope fidelity check [deep]
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | — | 2-7, all |
| 2 | 1 | 10, 11, 16, 18 |
| 3 | 1 | 8-13, 19 |
| 4 | 1 | 14-19 |
| 5 | 1 | 8, 9 |
| 6 | 1 | 20-26 |
| 7 | 1 | 20, 23 |
| 8 | 3, 5 | 12, 27 |
| 9 | 3, 5 | 12, 27 |
| 10 | 2, 3 | 21, 27 |
| 11 | 2, 3 | 20, 22, 23, 27 |
| 12 | 8, 9 | 17, 27 |
| 13 | 3 | 17, 27 |
| 14 | 4 | 25, 27 |
| 15 | 4 | 20, 27 |
| 16 | 2, 4 | 24, 27 |
| 17 | 12, 13, 4 | 27 |
| 18 | 2, 4 | 27 |
| 19 | 3, 11 | 27 |
| 20 | 6, 7, 11, 15 | 27 |
| 21 | 6, 10 | 27 |
| 22 | 6, 11 | 27 |
| 23 | 6, 7, 11 | 27 |
| 24 | 6, 16 | 27 |
| 25 | 6, 14 | 27 |
| 26 | 6 | 27 |
| 27 | 8-26 | 28-30 |
| 28 | 27 | F1-F4 |
| 29 | 27 | F1-F4 |
| 30 | 27 | F1-F4 |

### Agent Dispatch Summary

| Wave | Tasks | Categories |
|------|-------|------------|
| 1 | 7 | T1-T7 → `quick` |
| 2 | 6 | T8-T9 → `deep` (TDD), T10-T11 → `unspecified-high`, T12-T13 → `deep` |
| 3 | 6 | T14-T16,T18-T19 → `unspecified-high`, T17 → `deep` |
| 4 | 7 | T20-T26 → `visual-engineering` |
| 5 | 4 | T27 → `deep`, T28-T30 → `quick` |
| FINAL | 4 | F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep` |

---

## TODOs

### Wave 1: Foundation (7 parallel tasks)

- [x] 1. Tauri + React Project Scaffolding

  **What to do**:
  - Initialize Tauri v2 project with React + TypeScript template
  - Configure `tauri.conf.json` for menu bar app (no dock icon)
  - Set `app.set_activation_policy(ActivationPolicy::Accessory)` in Rust
  - Add essential dependencies: `@tauri-apps/api`, `@tauri-apps/plugin-sql`
  - Configure `bun` as package manager
  - Set up basic project structure: `/src`, `/src-tauri`, `/src/components`, `/src/lib`

  **Must NOT do**:
  - Do not add any business logic
  - Do not create actual components (just directories)
  - Do not over-engineer folder structure

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard scaffolding task, well-documented process

  **Parallelization**:
  - **Can Run In Parallel**: YES (first task, starts immediately)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 2-7 and all subsequent
  - **Blocked By**: None

  **References**:
  - `https://tauri.app/start/create-project/` - Official Tauri v2 setup
  - `https://github.com/ahkohd/tauri-macos-menubar-app-example` - Menu bar pattern reference

  **Acceptance Criteria**:
  - [ ] `bun install` completes without errors
  - [ ] `bun run tauri dev` launches app (may show blank window)
  - [ ] App does NOT appear in Dock
  - [ ] Directory structure exists: `/src`, `/src-tauri`, `/src/components`, `/src/lib`

  **QA Scenarios**:
  ```
  Scenario: Project builds and runs
    Tool: Bash
    Preconditions: Fresh clone, bun installed
    Steps:
      1. Run `bun install` - expect exit code 0
      2. Run `bun run tauri build --debug` - expect exit code 0
      3. Check `.app` bundle exists in `src-tauri/target/debug/bundle/macos/`
    Expected Result: Build succeeds, .app bundle created
    Failure Indicators: Non-zero exit code, missing bundle
    Evidence: .sisyphus/evidence/task-1-build-output.txt

  Scenario: App not in Dock
    Tool: Bash
    Preconditions: App running
    Steps:
      1. Launch built app
      2. Run `osascript -e 'tell application "System Events" to get name of every process whose visible is true'`
      3. Verify "MemCycle" not in visible processes list
    Expected Result: App runs but not in visible Dock processes
    Evidence: .sisyphus/evidence/task-1-dock-check.txt
  ```

  **Commit**: YES
  - Message: `feat(scaffold): initialize Tauri v2 + React project`
  - Files: `package.json`, `src-tauri/*`, `src/*`, `tsconfig.json`, `vite.config.ts`

- [x] 2. SQLite Database Setup with Migrations

  **What to do**:
  - Add `@tauri-apps/plugin-sql` to project
  - Create migration system in `/src-tauri/migrations/`
  - Implement initial schema migration (001_init.sql):
    - `decks` table (id, name, description, created_at, updated_at)
    - `cards` table (id, deck_id, front, back, source, created_at, updated_at)
    - `card_scheduling` table (id, card_id, algorithm, repetitions, interval_days, ease_factor, box_index, due_at, last_reviewed_at, lapse_count, review_count)
    - `review_logs` table (id, card_id, reviewed_at, rating, response_type, elapsed_ms)
    - `settings` table (key, value)
  - Add Rust code to run migrations on app start

  **Must NOT do**:
  - Do not implement repository logic (Task 10-11)
  - Do not add remote database support yet (Task 18)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard database setup with clear schema

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 10, 11, 16, 18
  - **Blocked By**: Task 1

  **References**:
  - `https://v2.tauri.app/plugin/sql/` - Tauri SQL plugin docs
  - Draft schema in `.sisyphus/drafts/memcycle-app.md` - Data model section

  **Acceptance Criteria**:
  - [ ] Migration files exist in `/src-tauri/migrations/`
  - [ ] App starts without database errors
  - [ ] Tables created: decks, cards, card_scheduling, review_logs, settings
  - [ ] `bun run tauri dev` creates `app.db` in app data directory

  **QA Scenarios**:
  ```
  Scenario: Database tables created
    Tool: Bash
    Preconditions: App has run at least once
    Steps:
      1. Locate database file (check app data directory)
      2. Run `sqlite3 <db_path> ".tables"`
      3. Verify output contains: decks, cards, card_scheduling, review_logs, settings
    Expected Result: All 5 tables present
    Evidence: .sisyphus/evidence/task-2-tables.txt

  Scenario: Migration idempotency
    Tool: Bash
    Steps:
      1. Run app once (creates DB)
      2. Run app again
      3. Verify no "table already exists" errors in logs
    Expected Result: Clean startup both times
    Evidence: .sisyphus/evidence/task-2-migration-idempotent.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(db): add SQLite with initial schema migrations`
  - Files: `src-tauri/migrations/*`, `src-tauri/src/db.rs`

- [x] 3. TypeScript Types and Interfaces

  **What to do**:
  - Create `/src/lib/types.ts` with all TypeScript interfaces:
    - `Deck`, `Card`, `CardSchedulingState`
    - `ReviewLog`, `Settings`
    - `Algorithm` enum ("sm2" | "leitner")
    - `ResponseType` enum ("rated" | "no_response" | "skipped")
    - `Rating` type (1 | 2 | 3 | 4)
    - `CardSource` enum ("default" | "collinsdictionary")
  - Create `/src/lib/constants.ts` with algorithm defaults:
    - SM-2: `DEFAULT_EASE_FACTOR = 2.5`, `MIN_EASE_FACTOR = 1.3`
    - Leitner: `BOX_INTERVALS = [1, 3, 7, 14, 30]` (days)
    - Popup: `DEFAULT_INTERVAL_MINUTES = 25`, `AUTO_DISMISS_SECONDS = 30`

  **Must NOT do**:
  - Do not implement any logic (types only)
  - Do not add React component types here

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Pure type definitions, straightforward

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 8-13, 19
  - **Blocked By**: Task 1

  **References**:
  - `.sisyphus/drafts/memcycle-app.md` - Data Model section for schema
  - SM-2 research: EF starts at 2.5, min 1.3
  - Leitner research: Box intervals [1, 3, 7, 14, 30] days

  **Acceptance Criteria**:
  - [ ] `/src/lib/types.ts` exists with all interfaces
  - [ ] `/src/lib/constants.ts` exists with algorithm defaults
  - [ ] `tsc --noEmit` passes with no type errors
  - [ ] Types match database schema from Task 2

  **QA Scenarios**:
  ```
  Scenario: Type checking passes
    Tool: Bash
    Steps:
      1. Run `bun run tsc --noEmit`
      2. Verify exit code 0
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-3-typecheck.txt

  Scenario: Types are exported and importable
    Tool: Bash
    Steps:
      1. Create temp test file that imports all types
      2. Run tsc on it
      3. Verify successful compilation
    Expected Result: All exports accessible
    Evidence: .sisyphus/evidence/task-3-imports.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(types): add TypeScript interfaces and constants`
  - Files: `src/lib/types.ts`, `src/lib/constants.ts`

- [x] 4. Rust Command Stubs

  **What to do**:
  - Create Tauri command stubs in `/src-tauri/src/commands/`:
    - `deck.rs`: create_deck, get_decks, update_deck, delete_deck
    - `card.rs`: create_card, get_cards, update_card, delete_card
    - `review.rs`: get_due_cards, submit_review, record_no_response
    - `settings.rs`: get_settings, update_setting
    - `export.rs`: export_data, import_data
    - `llm.rs`: generate_definition
  - Register all commands in `main.rs`
  - Commands return placeholder/mock data initially

  **Must NOT do**:
  - Do not implement actual database queries (Tasks 10-11)
  - Do not implement algorithm logic (Tasks 8-9)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Stub generation, boilerplate code

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 14-19
  - **Blocked By**: Task 1

  **References**:
  - `https://v2.tauri.app/develop/calling-rust/` - Tauri commands docs
  - Task 3 types for return value shapes

  **Acceptance Criteria**:
  - [ ] All command files exist in `/src-tauri/src/commands/`
  - [ ] Commands registered in `main.rs`
  - [ ] `cargo build` passes
  - [ ] Commands callable from frontend (return mock data)

  **QA Scenarios**:
  ```
  Scenario: Rust compiles
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Run `cd src-tauri && cargo build`
      2. Verify exit code 0
    Expected Result: Successful build
    Evidence: .sisyphus/evidence/task-4-cargo-build.txt

  Scenario: Commands are callable
    Tool: Playwright
    Steps:
      1. Launch app in dev mode
      2. Open console, run `window.__TAURI__.invoke('get_decks')`
      3. Verify returns array (even if empty/mock)
    Expected Result: Command invocation succeeds
    Evidence: .sisyphus/evidence/task-4-invoke.png
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(commands): add Tauri command stubs`
  - Files: `src-tauri/src/commands/*.rs`, `src-tauri/src/main.rs`

- [x] 5. Vitest + Playwright Test Setup

  **What to do**:
  - Install and configure Vitest for unit testing
  - Install and configure Playwright for integration testing
  - Create test directory structure: `/src/__tests__/`, `/e2e/`
  - Add test scripts to `package.json`: `test`, `test:e2e`
  - Create sample passing test to verify setup
  - Configure Vitest for TypeScript and path aliases

  **Must NOT do**:
  - Do not write actual algorithm tests (Tasks 8-9)
  - Do not create complex test utilities

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard test setup, well-documented

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 8, 9 (TDD requires test framework)
  - **Blocked By**: Task 1

  **References**:
  - `https://vitest.dev/guide/` - Vitest setup docs
  - `https://playwright.dev/docs/intro` - Playwright setup docs

  **Acceptance Criteria**:
  - [ ] `bun test` runs and passes (sample test)
  - [ ] `bun test:e2e` runs Playwright (may skip actual tests)
  - [ ] Test directories exist: `/src/__tests__/`, `/e2e/`
  - [ ] Vitest config handles TypeScript paths

  **QA Scenarios**:
  ```
  Scenario: Unit tests run
    Tool: Bash
    Steps:
      1. Run `bun test`
      2. Verify exit code 0
      3. Verify output shows "1 passed" (sample test)
    Expected Result: Test suite runs successfully
    Evidence: .sisyphus/evidence/task-5-vitest.txt

  Scenario: Playwright installed
    Tool: Bash
    Steps:
      1. Run `bunx playwright --version`
      2. Verify version output
    Expected Result: Playwright CLI responds with version
    Evidence: .sisyphus/evidence/task-5-playwright.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(test): configure Vitest and Playwright`
  - Files: `vitest.config.ts`, `playwright.config.ts`, `src/__tests__/sample.test.ts`

- [x] 6. React Component Library Setup (shadcn/ui)

  **What to do**:
  - Initialize shadcn/ui with `bunx shadcn-ui@latest init`
  - Add essential components: Button, Input, Card, Dialog, Dropdown, Toast
  - Configure Tailwind CSS
  - Set up dark mode support (system preference)
  - Create `/src/components/ui/` directory structure

  **Must NOT do**:
  - Do not create custom application components (Tasks 20-26)
  - Do not add more than essential UI primitives

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard shadcn/ui setup process

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 20-26 (all UI components)
  - **Blocked By**: Task 1

  **References**:
  - `https://ui.shadcn.com/docs/installation/vite` - shadcn + Vite setup
  - `https://ui.shadcn.com/docs/components` - Component list

  **Acceptance Criteria**:
  - [ ] `/src/components/ui/` contains shadcn components
  - [ ] `tailwind.config.js` configured correctly
  - [ ] Dark mode toggle works
  - [ ] `bun run dev` shows styled components without errors

  **QA Scenarios**:
  ```
  Scenario: Components render
    Tool: Playwright
    Steps:
      1. Create temp page using Button component
      2. Navigate to page
      3. Assert button element visible with correct styling
    Expected Result: Styled button renders
    Evidence: .sisyphus/evidence/task-6-button.png

  Scenario: Dark mode works
    Tool: Playwright
    Steps:
      1. Set system preference to dark
      2. Load app
      3. Verify `dark` class on html element
    Expected Result: Dark mode applied
    Evidence: .sisyphus/evidence/task-6-darkmode.png
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(ui): setup shadcn/ui component library`
  - Files: `src/components/ui/*`, `tailwind.config.js`, `src/styles/globals.css`

- [x] 7. Markdown Rendering Component

  **What to do**:
  - Install markdown rendering library (`react-markdown` + `remark-gfm`)
  - Create `/src/components/MarkdownRenderer.tsx`
  - Support: headers, bold, italic, lists, code blocks, links
  - Add syntax highlighting for code blocks (`rehype-highlight`)
  - Style markdown output with Tailwind prose classes
  - Handle edge cases: empty content, very long content

  **Must NOT do**:
  - Do not add image/video support (out of scope)
  - Do not create LaTeX/math rendering

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard react-markdown setup

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 20, 23 (uses markdown rendering)
  - **Blocked By**: Task 1

  **References**:
  - `https://github.com/remarkjs/react-markdown` - react-markdown docs
  - `https://tailwindcss.com/docs/typography-plugin` - Tailwind prose

  **Acceptance Criteria**:
  - [ ] `MarkdownRenderer` component exists
  - [ ] Renders headers, bold, italic, lists, code correctly
  - [ ] Code blocks have syntax highlighting
  - [ ] Handles empty string without crashing

  **QA Scenarios**:
  ```
  Scenario: Markdown renders correctly
    Tool: Playwright
    Steps:
      1. Render MarkdownRenderer with "# Hello\n**bold** and *italic*"
      2. Assert h1 element contains "Hello"
      3. Assert strong element contains "bold"
      4. Assert em element contains "italic"
    Expected Result: All markdown elements rendered
    Evidence: .sisyphus/evidence/task-7-markdown.png

  Scenario: Code blocks highlighted
    Tool: Playwright
    Steps:
      1. Render MarkdownRenderer with "```js\nconst x = 1;\n```"
      2. Assert pre > code element exists
      3. Assert code has syntax highlighting classes
    Expected Result: Syntax highlighted code block
    Evidence: .sisyphus/evidence/task-7-codeblock.png
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(ui): add markdown rendering component`
  - Files: `src/components/MarkdownRenderer.tsx`

### Wave 2: Core Logic (6 parallel tasks, TDD)

- [x] 8. SM-2 Algorithm Implementation (TDD)

  **What to do**:
  - **RED**: Write tests first in `/src/__tests__/algorithms/sm2.test.ts`
  - Test cases:
    - First review: interval becomes 1 day
    - Second review: interval becomes 6 days
    - Later reviews: interval = prev * EF
    - Rating affects EF (low rating decreases, high increases)
    - EF never goes below 1.3
    - Rating 1-2 resets interval (lapse)
  - **GREEN**: Implement in `/src/lib/algorithms/sm2.ts`
  - **REFACTOR**: Clean up, add JSDoc
  - Functions: `calculateNextReview(state, rating) => newState`

  **Must NOT do**:
  - Do not implement Leitner here (Task 9)
  - Do not integrate with database (Task 12)
  - Do not add UI (Wave 4)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: TDD requires careful test-first approach, algorithm correctness critical

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12 (scheduling service)
  - **Blocked By**: Tasks 3 (types), 5 (test framework)

  **References**:
  - `https://super-memory.com/english/ol/sm2.htm` - Original SM-2 algorithm
  - `https://github.com/open-spaced-repetition/sm-2` - Reference implementation
  - SM-2 formulas:
    - EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    - EF = max(1.3, EF')
    - q < 3: reset interval to 1
    - n=1: I(1) = 1, n=2: I(2) = 6, n>2: I(n) = I(n-1) * EF

  **Acceptance Criteria**:
  - [ ] Test file exists: `/src/__tests__/algorithms/sm2.test.ts`
  - [ ] Implementation exists: `/src/lib/algorithms/sm2.ts`
  - [ ] `bun test sm2` passes all test cases
  - [ ] Edge cases covered: EF minimum, lapse behavior

  **QA Scenarios**:
  ```
  Scenario: All SM-2 tests pass
    Tool: Bash
    Steps:
      1. Run `bun test sm2`
      2. Verify all tests pass (expect 8+ test cases)
    Expected Result: 100% pass rate
    Evidence: .sisyphus/evidence/task-8-sm2-tests.txt

  Scenario: Test vector validation
    Tool: Bash
    Steps:
      1. Test: rating=4, EF=2.5, interval=1 → new interval=6, EF≈2.6
      2. Test: rating=1, interval=30 → interval resets to 1
      3. Test: EF=1.3, rating=1 → EF stays 1.3 (minimum)
    Expected Result: Exact expected outputs match
    Evidence: .sisyphus/evidence/task-8-vectors.txt
  ```

  **Commit**: YES
  - Message: `feat(algo): implement SM-2 spaced repetition algorithm`
  - Files: `src/lib/algorithms/sm2.ts`, `src/__tests__/algorithms/sm2.test.ts`
  - Pre-commit: `bun test sm2`

- [x] 9. Leitner Algorithm Implementation (TDD)

  **What to do**:
  - **RED**: Write tests first in `/src/__tests__/algorithms/leitner.test.ts`
  - Test cases:
    - New card starts in Box 1
    - Correct answer: move to next box
    - Incorrect answer: move back to Box 1
    - Box determines due interval: [1, 3, 7, 14, 30] days
    - Box 5 is maximum (stays there on success)
    - Box transitions are bounded
  - **GREEN**: Implement in `/src/lib/algorithms/leitner.ts`
  - **REFACTOR**: Clean up, add JSDoc
  - Functions: `calculateNextReview(state, isCorrect) => newState`

  **Must NOT do**:
  - Do not implement SM-2 here (Task 8)
  - Do not add configurable box intervals (use constants)
  - Do not integrate with database (Task 12)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: TDD requires careful test-first approach

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12 (scheduling service)
  - **Blocked By**: Tasks 3 (types), 5 (test framework)

  **References**:
  - `https://en.wikipedia.org/wiki/Leitner_system` - Leitner system overview
  - `https://github.com/open-spaced-repetition/leitner-box` - Reference implementation
  - Constants from Task 3: BOX_INTERVALS = [1, 3, 7, 14, 30]

  **Acceptance Criteria**:
  - [ ] Test file exists: `/src/__tests__/algorithms/leitner.test.ts`
  - [ ] Implementation exists: `/src/lib/algorithms/leitner.ts`
  - [ ] `bun test leitner` passes all test cases
  - [ ] Box transitions correct in all scenarios

  **QA Scenarios**:
  ```
  Scenario: All Leitner tests pass
    Tool: Bash
    Steps:
      1. Run `bun test leitner`
      2. Verify all tests pass (expect 6+ test cases)
    Expected Result: 100% pass rate
    Evidence: .sisyphus/evidence/task-9-leitner-tests.txt

  Scenario: Test vector validation
    Tool: Bash
    Steps:
      1. Test: box=1, correct=true → box=2, due in 3 days
      2. Test: box=3, correct=false → box=1, due in 1 day
      3. Test: box=5, correct=true → box=5 (stays max)
    Expected Result: Exact expected outputs match
    Evidence: .sisyphus/evidence/task-9-vectors.txt
  ```

  **Commit**: YES
  - Message: `feat(algo): implement Leitner box algorithm`
  - Files: `src/lib/algorithms/leitner.ts`, `src/__tests__/algorithms/leitner.test.ts`
  - Pre-commit: `bun test leitner`

- [x] 10. Deck Repository (CRUD)

  **What to do**:
  - Create `/src/lib/repositories/deckRepository.ts`
  - Implement using Tauri SQL plugin:
    - `createDeck(name, description) => Deck`
    - `getDecks() => Deck[]`
    - `getDeck(id) => Deck | null`
    - `updateDeck(id, updates) => Deck`
    - `deleteDeck(id) => void` (cascades to cards)
  - Wire to Rust commands from Task 4
  - Add proper error handling

  **Must NOT do**:
  - Do not implement card repository (Task 11)
  - Do not add sync logic (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Database integration, needs careful SQL

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8, 9, 11, 12, 13)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 21 (deck management UI)
  - **Blocked By**: Tasks 2 (database), 3 (types)

  **References**:
  - Task 2 schema for table structure
  - `https://v2.tauri.app/plugin/sql/` - Tauri SQL usage

  **Acceptance Criteria**:
  - [ ] All CRUD operations work
  - [ ] Deck creation returns full Deck object with ID
  - [ ] Delete cascades to associated cards
  - [ ] Proper error handling for not found, duplicates

  **QA Scenarios**:
  ```
  Scenario: Deck CRUD operations
    Tool: Bash (via Tauri invoke)
    Steps:
      1. Create deck "Test Deck" → verify returns deck with UUID
      2. Get decks → verify list contains created deck
      3. Update deck name to "Updated" → verify name changed
      4. Delete deck → verify getDecks no longer contains it
    Expected Result: All operations succeed
    Evidence: .sisyphus/evidence/task-10-crud.txt

  Scenario: Cascade delete
    Tool: Bash
    Steps:
      1. Create deck, add card to it
      2. Delete deck
      3. Verify card also deleted (query cards table)
    Expected Result: Card removed when deck deleted
    Evidence: .sisyphus/evidence/task-10-cascade.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(repo): implement deck repository`
  - Files: `src/lib/repositories/deckRepository.ts`, `src-tauri/src/commands/deck.rs`

- [x] 11. Card Repository (CRUD)

  **What to do**:
  - Create `/src/lib/repositories/cardRepository.ts`
  - Implement using Tauri SQL plugin:
    - `createCard(deckId, front, back, source) => Card`
    - `getCards(deckId?) => Card[]`
    - `getCard(id) => Card | null`
    - `updateCard(id, updates) => Card`
    - `deleteCard(id) => void`
    - `getCardWithScheduling(id) => Card & CardSchedulingState`
  - Initialize scheduling state when card created (algorithm-specific defaults)
  - Wire to Rust commands

  **Must NOT do**:
  - Do not implement scheduling logic (Task 12)
  - Do not add markdown validation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Database integration with scheduling state

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8-10, 12, 13)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 20, 22, 23 (UI components)
  - **Blocked By**: Tasks 2 (database), 3 (types)

  **References**:
  - Task 2 schema for cards and card_scheduling tables
  - Task 3 for CardSchedulingState interface

  **Acceptance Criteria**:
  - [ ] All CRUD operations work
  - [ ] Card creation initializes scheduling state
  - [ ] getCardWithScheduling joins card and scheduling data
  - [ ] Works for both SM-2 and Leitner initial states

  **QA Scenarios**:
  ```
  Scenario: Card CRUD with scheduling init
    Tool: Bash
    Steps:
      1. Create card with front/back markdown
      2. Query card_scheduling table → verify row exists for card
      3. Verify SM-2 defaults: EF=2.5, repetitions=0
      4. Update card front → verify scheduling unchanged
    Expected Result: Card and scheduling properly managed
    Evidence: .sisyphus/evidence/task-11-crud.txt

  Scenario: Cards filtered by deck
    Tool: Bash
    Steps:
      1. Create deck A with 2 cards
      2. Create deck B with 1 card
      3. getCards(deckA.id) → verify returns 2 cards
      4. getCards() → verify returns 3 cards total
    Expected Result: Filtering works correctly
    Evidence: .sisyphus/evidence/task-11-filter.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(repo): implement card repository`
  - Files: `src/lib/repositories/cardRepository.ts`, `src-tauri/src/commands/card.rs`

- [x] 12. Scheduling Service

  **What to do**:
  - Create `/src/lib/services/schedulingService.ts`
  - Implement:
    - `getDueCards(algorithm) => Card[]` - cards where dueAt <= now
    - `getNextCard(algorithm) => Card | null` - oldest due card
    - `submitReview(cardId, rating, algorithm)` - applies algorithm, updates state
    - `calculateStats() => { due: number, reviewed: number, streak: number }`
  - Use SM-2 or Leitner algorithm based on parameter
  - Record review to review_logs table
  - Prioritize: oldest due first

  **Must NOT do**:
  - Do not implement no-response handling (Task 13)
  - Do not add popup logic (Task 17)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Orchestrates algorithms and data layer

  **Parallelization**:
  - **Can Run In Parallel**: NO - depends on Tasks 8, 9
  - **Parallel Group**: Wave 2 (but after 8, 9)
  - **Blocks**: Task 17 (timer service)
  - **Blocked By**: Tasks 8, 9 (algorithms)

  **References**:
  - Tasks 8, 9 for algorithm functions
  - Task 11 for card repository
  - Review priority: oldest due_at first

  **Acceptance Criteria**:
  - [ ] getDueCards returns correct cards (due_at <= now)
  - [ ] submitReview updates scheduling state correctly
  - [ ] Review logged to review_logs table
  - [ ] Stats calculation correct

  **QA Scenarios**:
  ```
  Scenario: Due cards retrieved correctly
    Tool: Bash
    Steps:
      1. Create 3 cards: one due yesterday, one due tomorrow, one due now
      2. Call getDueCards() → expect 2 cards returned
      3. Verify oldest returned first
    Expected Result: Only due cards returned, sorted
    Evidence: .sisyphus/evidence/task-12-due.txt

  Scenario: Review updates state
    Tool: Bash
    Steps:
      1. Create card, submit review with rating=4 (SM-2)
      2. Query card_scheduling → verify interval increased
      3. Query review_logs → verify log entry exists
    Expected Result: State updated, logged
    Evidence: .sisyphus/evidence/task-12-review.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(service): implement scheduling service`
  - Files: `src/lib/services/schedulingService.ts`, `src-tauri/src/commands/review.rs`

- [x] 13. No-Response Handler with Smart Defer

  **What to do**:
  - Create `/src/lib/services/noResponseHandler.ts`
  - Implement smart defer logic:
    - `recordNoResponse(cardId, reason)` - logs dismissal
    - `getDeferredCards() => Card[]` - cards with pending no-responses
    - `shouldShowCard(cardId) => boolean` - false if 3+ no-responses today
    - Defer intervals: 10min, 20min, 30min (exponential backoff)
  - Track no-response count per card per day
  - After 3 no-responses, move to "await session" queue
  - Clear daily counts at midnight

  **Must NOT do**:
  - Do not update SM-2/Leitner state (just defer)
  - Do not show UI prompts (Task 20)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Complex state management with time-based logic

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 3)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 17 (timer service)
  - **Blocked By**: Task 3 (types)

  **References**:
  - Draft decision: smart defer with backoff
  - No-response: defer 10-30min, cap at 3/day per card

  **Acceptance Criteria**:
  - [ ] No-response logged correctly
  - [ ] Exponential backoff applied
  - [ ] Card hidden after 3 no-responses
  - [ ] Daily counts reset properly

  **QA Scenarios**:
  ```
  Scenario: Exponential backoff
    Tool: Bash
    Steps:
      1. Record no-response for card A
      2. Check defer time → expect 10 min
      3. Record again → expect 20 min
      4. Record again → expect 30 min + "await session"
    Expected Result: Progressive backoff
    Evidence: .sisyphus/evidence/task-13-backoff.txt

  Scenario: Daily cap
    Tool: Bash
    Steps:
      1. Record 3 no-responses for card
      2. Call shouldShowCard() → expect false
      3. Simulate day change (mock time)
      4. Call shouldShowCard() → expect true
    Expected Result: Daily reset works
    Evidence: .sisyphus/evidence/task-13-daily.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(service): implement no-response handler`
  - Files: `src/lib/services/noResponseHandler.ts`

### Wave 3: Tauri Integration (6 parallel tasks)

- [x] 14. Menu Bar Tray with Dropdown

  **What to do**:
  - Implement system tray using Tauri's tray API
  - Add app icon to menu bar
  - Create tray menu with items: "Open Dashboard", "Review Now", separator, "Settings", "Quit"
  - Handle tray icon click to show popup dropdown (Task 25 will implement UI)
  - Use `tauri-plugin-positioner` for positioning dropdown near tray
  - Set up tray event handlers in Rust

  **Must NOT do**:
  - Do not implement dropdown UI (Task 25)
  - Do not add popup review window logic (Task 15)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Tauri tray API integration

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15-19)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 25 (menu bar dropdown UI)
  - **Blocked By**: Task 4 (Rust command stubs)

  **References**:
  - `https://v2.tauri.app/learn/system-tray/` - Tauri tray docs
  - `https://github.com/ahkohd/tauri-macos-menubar-app-example` - v2 branch for pattern
  - `tauri-plugin-positioner` for window positioning

  **Acceptance Criteria**:
  - [ ] App icon appears in menu bar
  - [ ] Right-click shows native menu
  - [ ] Left-click prepares for dropdown (emits event)
  - [ ] "Quit" menu item closes app

  **QA Scenarios**:
  ```
  Scenario: Tray icon visible
    Tool: Bash
    Steps:
      1. Launch app
      2. Run AppleScript to check menu bar items
      3. Verify MemCycle icon present
    Expected Result: Icon in menu bar
    Evidence: .sisyphus/evidence/task-14-tray.png

  Scenario: Tray menu works
    Tool: Playwright (with manual tray interaction)
    Steps:
      1. Right-click tray icon
      2. Verify menu appears with expected items
      3. Click "Quit" → verify app closes
    Expected Result: Menu functional
    Evidence: .sisyphus/evidence/task-14-menu.png
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(tray): implement menu bar tray`
  - Files: `src-tauri/src/tray.rs`, `src-tauri/tauri.conf.json`

- [x] 15. Popup Window Management

  **What to do**:
  - Create popup window controller in Rust
  - Implement functions:
    - `showPopup()` - creates/shows review popup window
    - `hidePopup()` - hides popup
    - `isPopupVisible() => boolean`
  - Configure window properties:
    - Frameless, transparent background
    - Always on top (but respects Do Not Disturb)
    - Positioned near tray icon (using positioner)
    - Size: ~400x300 pixels
  - Handle auto-dismiss timer (30s timeout)
  - Emit events: `popup:shown`, `popup:dismissed`, `popup:timeout`

  **Must NOT do**:
  - Do not implement popup UI content (Task 20)
  - Do not implement timer scheduling (Task 17)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Tauri window management

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14, 16-19)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 20 (popup UI)
  - **Blocked By**: Task 4 (Rust stubs)

  **References**:
  - `https://v2.tauri.app/develop/window-customization/` - Window customization
  - `tauri-plugin-positioner` for near-tray positioning

  **Acceptance Criteria**:
  - [ ] showPopup() creates window near tray
  - [ ] Window is frameless, always on top
  - [ ] Auto-dismiss after 30s emits timeout event
  - [ ] hidePopup() closes window properly

  **QA Scenarios**:
  ```
  Scenario: Popup appears correctly
    Tool: Playwright
    Steps:
      1. Call showPopup() via Tauri invoke
      2. Verify window appears
      3. Check window position (near top-right)
      4. Verify frameless (no title bar)
    Expected Result: Popup positioned correctly
    Evidence: .sisyphus/evidence/task-15-popup.png

  Scenario: Auto-dismiss timeout
    Tool: Bash
    Steps:
      1. Call showPopup()
      2. Wait 31 seconds
      3. Verify popup:timeout event emitted
      4. Verify window closed
    Expected Result: Popup auto-dismissed
    Evidence: .sisyphus/evidence/task-15-timeout.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(window): implement popup window management`
  - Files: `src-tauri/src/popup.rs`, `src/lib/popup.ts`

- [x] 16. Settings Storage and Retrieval

  **What to do**:
  - Create `/src/lib/services/settingsService.ts`
  - Implement settings using key-value storage in settings table:
    - `getSetting(key) => value`
    - `setSetting(key, value)`
    - `getAllSettings() => Settings object`
    - `resetToDefaults()`
  - Default values from Task 3 constants:
    - popupIntervalMinutes: 25
    - autoDismissSeconds: 30
    - selectedAlgorithm: "sm2"
    - databaseMode: "local"
    - launchAtLogin: false
  - Encrypt sensitive values (llmApiKey)

  **Must NOT do**:
  - Do not implement settings UI (Task 24)
  - Do not implement remote DB connection (Task 18)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Settings persistence with encryption

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14-15, 17-19)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 24 (settings UI)
  - **Blocked By**: Tasks 2 (database), 4 (Rust stubs)

  **References**:
  - Task 2 for settings table schema
  - Task 3 for default constants
  - Consider using Tauri's `store` plugin for secure storage

  **Acceptance Criteria**:
  - [ ] All settings persist across app restarts
  - [ ] Default values populated on first run
  - [ ] API key encrypted in storage
  - [ ] Reset to defaults works

  **QA Scenarios**:
  ```
  Scenario: Settings persistence
    Tool: Bash
    Steps:
      1. Set popupIntervalMinutes to 30
      2. Restart app
      3. Get popupIntervalMinutes → expect 30
    Expected Result: Setting persisted
    Evidence: .sisyphus/evidence/task-16-persist.txt

  Scenario: API key encryption
    Tool: Bash
    Steps:
      1. Set llmApiKey to "sk-test123"
      2. Query settings table directly
      3. Verify value is not plaintext
    Expected Result: Key encrypted in DB
    Evidence: .sisyphus/evidence/task-16-encrypt.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(settings): implement settings service`
  - Files: `src/lib/services/settingsService.ts`, `src-tauri/src/commands/settings.rs`

- [x] 17. Timer Service (Background Scheduling)

  **What to do**:
  - Create `/src/lib/services/timerService.ts` (frontend coordination)
  - Create Rust-side timer in `/src-tauri/src/timer.rs`
  - Implement:
    - `startTimer()` - begins popup interval timer
    - `stopTimer()` - pauses timer
    - `resetTimer()` - resets to interval start
    - `getTimeUntilNext() => seconds`
  - Handle system events:
    - Wake from sleep: recalculate missed intervals
    - System DND: defer popups
  - Persist next-fire timestamp for restart recovery
  - Use DispatchSourceTimer or tokio timer in Rust

  **Must NOT do**:
  - Do not show popup directly (call Task 15's showPopup)
  - Do not implement review logic (Task 12)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Complex timing logic with system integration

  **Parallelization**:
  - **Can Run In Parallel**: NO - depends on Tasks 12, 13
  - **Parallel Group**: Wave 3 (but after 12, 13)
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Tasks 12, 13, 4

  **References**:
  - Sleep/wake handling: `NSWorkspace.willSleepNotification`
  - DND detection: `NSDoNotDisturbEnabled` in Rust
  - Persist next-fire to settings table

  **Acceptance Criteria**:
  - [ ] Timer fires at configured interval
  - [ ] Timer persists across restarts
  - [ ] Wake from sleep handled gracefully
  - [ ] DND respected (popup deferred)

  **QA Scenarios**:
  ```
  Scenario: Timer fires correctly
    Tool: Bash
    Steps:
      1. Set interval to 1 minute (for testing)
      2. Start timer
      3. Wait 65 seconds
      4. Verify popup:shown event fired
    Expected Result: Timer triggers popup
    Evidence: .sisyphus/evidence/task-17-timer.txt

  Scenario: Restart recovery
    Tool: Bash
    Steps:
      1. Start timer (next fire in 30s)
      2. Kill and restart app
      3. Check getTimeUntilNext() → should be ~30s
    Expected Result: Timer state preserved
    Evidence: .sisyphus/evidence/task-17-restart.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(timer): implement background scheduling`
  - Files: `src/lib/services/timerService.ts`, `src-tauri/src/timer.rs`

- [x] 18. PostgreSQL Remote Connection

  **What to do**:
  - Add PostgreSQL support to database layer
  - Create `/src/lib/repositories/remoteDb.ts`
  - Implement:
    - `connectRemote(host, port, database, user, password)`
    - `testConnection() => boolean`
    - `switchToRemote()` / `switchToLocal()`
  - Same repository interface as local (SQLite)
  - Add migration runner for PostgreSQL
  - Handle connection errors gracefully

  **Must NOT do**:
  - Do not implement sync between local and remote
  - Do not auto-switch on failure (manual only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Database connection management

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14-17, 19)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Tasks 2, 4

  **References**:
  - `@tauri-apps/plugin-sql` supports PostgreSQL
  - Same schema as SQLite migrations
  - Settings service for connection config

  **Acceptance Criteria**:
  - [ ] Can connect to PostgreSQL with valid credentials
  - [ ] testConnection returns true/false correctly
  - [ ] switchToRemote changes all repositories
  - [ ] Connection errors show user-friendly message

  **QA Scenarios**:
  ```
  Scenario: Remote connection success
    Tool: Bash (mock PostgreSQL or real test DB)
    Steps:
      1. Configure valid PostgreSQL credentials
      2. Call testConnection() → expect true
      3. Switch to remote
      4. Create deck → verify persisted in PostgreSQL
    Expected Result: Remote operations work
    Evidence: .sisyphus/evidence/task-18-connect.txt

  Scenario: Connection failure handled
    Tool: Bash
    Steps:
      1. Configure invalid credentials
      2. Call testConnection() → expect false
      3. Verify error message returned
    Expected Result: Graceful error handling
    Evidence: .sisyphus/evidence/task-18-error.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(db): add PostgreSQL remote support`
  - Files: `src/lib/repositories/remoteDb.ts`, `src-tauri/migrations/pg/*`

- [x] 19. Export/Import JSON Handlers

  **What to do**:
  - Create `/src/lib/services/exportService.ts`
  - Implement:
    - `exportData() => JSON string` - all decks, cards, scheduling, settings
    - `importData(json) => ImportResult` - restores from JSON
    - `validateImport(json) => ValidationResult` - checks format
  - JSON structure:
    - `version`: "1.0"
    - `exportedAt`: ISO timestamp
    - `decks`: array
    - `cards`: array (with scheduling embedded)
    - `reviewLogs`: array (optional)
    - `settings`: object (excluding sensitive data)
  - Handle import conflicts (existing deck names)
  - Wire to Tauri commands for file save/load dialogs

  **Must NOT do**:
  - Do not export API keys (security)
  - Do not implement Anki format (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Data serialization with validation

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14-18)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Tasks 3, 11

  **References**:
  - Task 3 for type definitions
  - `@tauri-apps/plugin-dialog` for file dialogs

  **Acceptance Criteria**:
  - [ ] Export produces valid JSON with all data
  - [ ] Import restores decks, cards, and scheduling
  - [ ] Round-trip preserves all data
  - [ ] Invalid JSON rejected with clear error

  **QA Scenarios**:
  ```
  Scenario: Export/import round-trip
    Tool: Bash
    Steps:
      1. Create 2 decks with 5 cards each
      2. Review some cards (create scheduling state)
      3. Export to JSON
      4. Delete all data
      5. Import JSON
      6. Verify all decks, cards, scheduling restored
    Expected Result: Perfect round-trip
    Evidence: .sisyphus/evidence/task-19-roundtrip.json

  Scenario: Import validation
    Tool: Bash
    Steps:
      1. Create invalid JSON (missing required fields)
      2. Call validateImport() → expect errors
      3. Call importData() → expect rejection
    Expected Result: Invalid data rejected
    Evidence: .sisyphus/evidence/task-19-validation.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(export): implement JSON export/import`
  - Files: `src/lib/services/exportService.ts`, `src-tauri/src/commands/export.rs`

### Wave 4: UI Components (7 parallel tasks)

- [x] 20. Flashcard Review Popup UI

  **What to do**:
  - Create `/src/components/ReviewPopup.tsx`
  - Implement two-stage card display:
    - Stage 1: Show front (markdown), "Reveal Answer" button
    - Stage 2: Show back (markdown), rating buttons (1-4)
  - Use MarkdownRenderer from Task 7
  - Rating buttons: "Again (1)", "Hard (2)", "Good (3)", "Easy (4)"
  - Show keyboard hints: "Press 1-4 to rate, Space to reveal"
  - Visual feedback on selection
  - Timer countdown indicator (30s)
  - Handle empty due queue: "No cards due! 🎉"

  **Must NOT do**:
  - Do not implement scheduling logic (Task 12 handles)
  - Do not add card editing in popup

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: UI/UX design with interactive state

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 21-26)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Tasks 6, 7, 11, 15

  **References**:
  - Task 7 MarkdownRenderer component
  - Task 15 popup window management
  - Anki-style review interface for inspiration

  **Acceptance Criteria**:
  - [ ] Front shows, back hidden initially
  - [ ] Reveal button shows back
  - [ ] Rating buttons work (1-4)
  - [ ] Keyboard shortcuts work
  - [ ] Timer countdown visible

  **QA Scenarios**:
  ```
  Scenario: Card reveal flow
    Tool: Playwright (+ playwright skill)
    Steps:
      1. Navigate to review popup (showPopup with due card)
      2. Assert front content visible, back hidden
      3. Click "Reveal Answer" button
      4. Assert back content visible
      5. Assert rating buttons visible
    Expected Result: Two-stage reveal works
    Evidence: .sisyphus/evidence/task-20-reveal.png

  Scenario: Keyboard rating
    Tool: Playwright
    Steps:
      1. Show popup with card, reveal answer
      2. Press "3" key
      3. Verify card submitted with rating 3
      4. Verify popup closed or shows next card
    Expected Result: Keyboard input works
    Evidence: .sisyphus/evidence/task-20-keyboard.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): implement review popup component`
  - Files: `src/components/ReviewPopup.tsx`, `src/components/RatingButtons.tsx`

- [x] 21. Deck Management UI

  **What to do**:
  - Create `/src/components/DeckList.tsx`
  - Create `/src/components/DeckCard.tsx`
  - Create `/src/components/DeckForm.tsx` (create/edit modal)
  - Display all decks as cards with:
    - Name, description
    - Card count, due count
    - Created date
  - Actions: Create, Edit, Delete (with confirmation)
  - Click deck to view cards
  - Empty state: "Create your first deck!"

  **Must NOT do**:
  - Do not implement card management here (Task 22)
  - Do not add drag-and-drop reordering

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: UI component design

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20, 22-26)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Tasks 6, 10

  **References**:
  - Task 6 shadcn/ui components (Card, Dialog, Button)
  - Task 10 deck repository for data

  **Acceptance Criteria**:
  - [ ] Lists all decks with stats
  - [ ] Create deck opens modal form
  - [ ] Edit deck pre-fills form
  - [ ] Delete shows confirmation dialog
  - [ ] Empty state renders nicely

  **QA Scenarios**:
  ```
  Scenario: Deck CRUD UI
    Tool: Playwright (+ playwright skill)
    Steps:
      1. Navigate to deck list
      2. Click "Create Deck" → fill form → submit
      3. Verify new deck appears in list
      4. Click edit → change name → submit
      5. Verify name updated
      6. Click delete → confirm → verify removed
    Expected Result: All CRUD operations work via UI
    Evidence: .sisyphus/evidence/task-21-crud.png

  Scenario: Empty state
    Tool: Playwright
    Steps:
      1. Clear all decks
      2. Navigate to deck list
      3. Assert "Create your first deck!" message visible
    Expected Result: Helpful empty state
    Evidence: .sisyphus/evidence/task-21-empty.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): implement deck management UI`
  - Files: `src/components/DeckList.tsx`, `src/components/DeckCard.tsx`, `src/components/DeckForm.tsx`

- [x] 22. Card Creation Form (Default Frontend)

  **What to do**:
  - Create `/src/components/CardForm.tsx`
  - Two textarea inputs: Front (markdown), Back (markdown)
  - Live markdown preview for both fields
  - Deck selector dropdown
  - "Save Card" button
  - Support edit mode (pre-fill existing card)
  - Character count indicator
  - Keyboard shortcut: Cmd+Enter to save

  **Must NOT do**:
  - Do not implement CollinsDictionary (Task 23)
  - Do not add card list view (separate component)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Form UI with live preview

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20-21, 23-26)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Tasks 6, 11

  **References**:
  - Task 7 MarkdownRenderer for preview
  - Task 11 card repository for save

  **Acceptance Criteria**:
  - [ ] Both fields accept markdown
  - [ ] Live preview updates as you type
  - [ ] Deck selector shows all decks
  - [ ] Save creates card with correct data
  - [ ] Edit mode pre-fills values

  **QA Scenarios**:
  ```
  Scenario: Create card with preview
    Tool: Playwright (+ playwright skill)
    Steps:
      1. Navigate to card creation
      2. Enter "# Front" in front field
      3. Verify preview shows H1 heading
      4. Enter "**Back**" in back field
      5. Verify preview shows bold
      6. Select deck, click Save
      7. Verify card appears in deck
    Expected Result: Card created with markdown
    Evidence: .sisyphus/evidence/task-22-create.png

  Scenario: Edit existing card
    Tool: Playwright
    Steps:
      1. Create card with content
      2. Click edit on card
      3. Verify fields pre-filled
      4. Change front content, save
      5. Verify content updated
    Expected Result: Edit mode works
    Evidence: .sisyphus/evidence/task-22-edit.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): implement card creation form`
  - Files: `src/components/CardForm.tsx`

- [x] 23. CollinsDictionary Frontend with LLM

  **What to do**:
  - Create `/src/components/CollinsDictionary.tsx`
  - Input field for English word
  - "Generate Definition" button
  - Loading state during LLM call
  - Display generated markdown in preview
  - "Save as Card" button
  - Deck selector
  - Edit generated content before saving
  - Error handling: show toast on API error
  - Use prompt template from settings (editable)

  **Must NOT do**:
  - Do not hardcode API endpoint (use settings)
  - Do not auto-generate on typing (button click only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: UI with async LLM integration

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20-22, 24-26)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Tasks 6, 7, 11

  **References**:
  - Default prompt template from user's requirements
  - Task 16 settings service for API config
  - Task 7 MarkdownRenderer for preview

  **Acceptance Criteria**:
  - [ ] Word input and generate button work
  - [ ] LLM call made to configured endpoint
  - [ ] Generated markdown displayed
  - [ ] Can edit before saving
  - [ ] Error toast on API failure

  **QA Scenarios**:
  ```
  Scenario: Generate definition
    Tool: Playwright (+ playwright skill)
    Steps:
      1. Configure valid LLM API in settings
      2. Navigate to CollinsDictionary
      3. Enter word "reckless"
      4. Click "Generate Definition"
      5. Wait for response
      6. Verify markdown preview shows pronunciation, explanation
    Expected Result: Definition generated
    Evidence: .sisyphus/evidence/task-23-generate.png

  Scenario: Save generated card
    Tool: Playwright
    Steps:
      1. Generate definition for word
      2. Select deck
      3. Click "Save as Card"
      4. Navigate to deck
      5. Verify card exists with "reckless" content
    Expected Result: Card saved correctly
    Evidence: .sisyphus/evidence/task-23-save.png

  Scenario: API error handling
    Tool: Playwright
    Steps:
      1. Configure invalid API key
      2. Try to generate
      3. Verify error toast appears
      4. Verify app doesn't crash
    Expected Result: Graceful error handling
    Evidence: .sisyphus/evidence/task-23-error.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): implement CollinsDictionary LLM frontend`
  - Files: `src/components/CollinsDictionary.tsx`, `src/lib/services/llmService.ts`

- [x] 24. Settings Panel UI

  **What to do**:
  - Create `/src/components/SettingsPanel.tsx`
  - Sections:
    - **Timing**: Popup interval slider (5-120 min), Auto-dismiss slider (10-60s)
    - **Algorithm**: Radio group (SM-2 / Leitner)
    - **Database**: Radio group (Local / Remote), remote config form
    - **LLM API**: Endpoint URL, API key (password field), test button
    - **General**: Launch at login checkbox
    - **Prompt**: Editable prompt template textarea
  - Save button with confirmation toast
  - Test LLM connection button
  - Reset to defaults button

  **Must NOT do**:
  - Do not implement actual setting persistence (Task 16)
  - Do not add import/export buttons (separate UI)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Complex settings form

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20-23, 25-26)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Tasks 6, 16

  **References**:
  - Task 16 settings service for data
  - Task 3 constants for default values

  **Acceptance Criteria**:
  - [ ] All setting fields present
  - [ ] Values persist after save
  - [ ] Sliders show current value
  - [ ] Test LLM button shows success/failure
  - [ ] Reset restores defaults

  **QA Scenarios**:
  ```
  Scenario: Settings persistence
    Tool: Playwright (+ playwright skill)
    Steps:
      1. Open settings
      2. Change interval to 30 min
      3. Click Save
      4. Close and reopen settings
      5. Verify interval shows 30
    Expected Result: Settings saved
    Evidence: .sisyphus/evidence/task-24-persist.png

  Scenario: LLM test connection
    Tool: Playwright
    Steps:
      1. Open settings
      2. Enter valid API credentials
      3. Click "Test Connection"
      4. Verify success toast
    Expected Result: Connection test works
    Evidence: .sisyphus/evidence/task-24-llm-test.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): implement settings panel`
  - Files: `src/components/SettingsPanel.tsx`

- [x] 25. Menu Bar Dropdown UI

  **What to do**:
  - Create `/src/components/TrayDropdown.tsx`
  - Content:
    - App name/logo
    - Quick stats: "5 cards due", "7-day streak"
    - "Start Review" button
    - "Create Card" button
    - "View Decks" button
    - Divider
    - "Settings" link
    - "Export/Import" link
    - Divider
    - "Quit" button
  - Compact design for menu bar popup
  - Click outside to dismiss

  **Must NOT do**:
  - Do not implement tray logic (Task 14)
  - Do not add full dashboard

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Compact UI design

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20-24, 26)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Tasks 6, 14

  **References**:
  - Task 14 tray setup
  - macOS menu bar dropdown patterns

  **Acceptance Criteria**:
  - [ ] Shows stats correctly
  - [ ] All action buttons work
  - [ ] Compact, fits near tray
  - [ ] Dismisses on outside click

  **QA Scenarios**:
  ```
  Scenario: Dropdown shows stats
    Tool: Playwright (+ playwright skill)
    Steps:
      1. Create deck with 5 cards
      2. Click tray icon
      3. Verify dropdown shows "5 cards due"
    Expected Result: Stats accurate
    Evidence: .sisyphus/evidence/task-25-stats.png

  Scenario: Navigation works
    Tool: Playwright
    Steps:
      1. Open dropdown
      2. Click "View Decks"
      3. Verify navigates to deck list
    Expected Result: Navigation functional
    Evidence: .sisyphus/evidence/task-25-nav.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): implement tray dropdown`
  - Files: `src/components/TrayDropdown.tsx`

- [x] 26. First-Run Onboarding Wizard

  **What to do**:
  - Create `/src/components/OnboardingWizard.tsx`
  - Steps:
    1. Welcome screen with app overview
    2. Create first deck (name input)
    3. Create first card (simple form)
    4. Set popup interval preference
    5. Optional: Configure LLM API
    6. "Get Started!" completion
  - Progress indicator (dots or stepper)
  - Skip button
  - Store onboarding_completed flag in settings
  - Only show on first launch

  **Must NOT do**:
  - Do not make onboarding mandatory
  - Do not require LLM setup

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Multi-step wizard UI

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20-25)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 27 (integration)
  - **Blocked By**: Task 6

  **References**:
  - Task 16 settings for onboarding_completed flag
  - Common onboarding wizard patterns

  **Acceptance Criteria**:
  - [ ] Shows only on first launch
  - [ ] All steps work correctly
  - [ ] Can skip at any point
  - [ ] Creates deck and card
  - [ ] Doesn't show again after completion

  **QA Scenarios**:
  ```
  Scenario: First launch onboarding
    Tool: Playwright (+ playwright skill)
    Steps:
      1. Fresh app install (no settings)
      2. Launch app
      3. Verify onboarding wizard appears
      4. Complete all steps
      5. Verify deck and card created
      6. Restart app → verify wizard doesn't show
    Expected Result: Onboarding works once
    Evidence: .sisyphus/evidence/task-26-onboarding.png

  Scenario: Skip onboarding
    Tool: Playwright
    Steps:
      1. Fresh install
      2. Launch app
      3. Click Skip immediately
      4. Verify main app appears
      5. Restart → verify no onboarding
    Expected Result: Skip works
    Evidence: .sisyphus/evidence/task-26-skip.png
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): implement onboarding wizard`
  - Files: `src/components/OnboardingWizard.tsx`

### Wave 5: Integration & Polish (4 parallel tasks)

- [x] 27. End-to-End Integration

  **What to do**:
  - Wire all components together in `/src/App.tsx`
  - Implement main app routing:
    - Tray dropdown as entry point
    - Deck list view
    - Card view within deck
    - Settings panel
    - Card creation views (form + CollinsDictionary)
  - Connect services:
    - Timer service starts on app launch
    - Scheduling service feeds popup
    - Settings service configures all behavior
    - Export/import accessible from tray dropdown
  - Handle app lifecycle:
    - App start: check onboarding, start timer
    - Review popup: get due card → show → process rating → next/close
    - No-response: smart defer → reschedule
  - Error boundaries for graceful failure
  - Global toast notifications

  **Must NOT do**:
  - Do not add new features (integration only)
  - Do not change component APIs (wire existing)
  - Do not add analytics or telemetry

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Complex integration across all modules

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all previous tasks)
  - **Parallel Group**: Wave 5 (sequential gate)
  - **Blocks**: Tasks 28, 29, 30
  - **Blocked By**: Tasks 8-26 (all prior implementation)

  **References**:
  - All Wave 1-4 components and services
  - Task 17 timer service for startup
  - Task 12 scheduling service for review flow
  - Task 15 popup management for review window

  **Acceptance Criteria**:
  - [ ] App launches without errors
  - [ ] Timer starts automatically
  - [ ] Popup appears at interval with due card
  - [ ] Full review flow works (reveal → rate → next)
  - [ ] All navigation between views works
  - [ ] Export/import accessible and functional

  **QA Scenarios**:
  ```
  Scenario: Full review flow
    Tool: Playwright (+ playwright skill)
    Preconditions: App with 3 due cards
    Steps:
      1. Launch app, wait for popup
      2. Verify card front shown
      3. Press Space → verify back revealed
      4. Press "3" → verify rating submitted
      5. Verify next card shown OR popup closes if no more due
      6. Check scheduling state updated in DB
    Expected Result: Complete review cycle works
    Evidence: .sisyphus/evidence/task-27-review-flow.png

  Scenario: No-response handling
    Tool: Playwright
    Preconditions: App with 1 due card
    Steps:
      1. Launch app, wait for popup
      2. Do nothing for 30 seconds
      3. Verify popup auto-dismisses
      4. Check card deferred (not marked failed)
      5. Verify card reappears after defer interval
    Expected Result: Smart defer works
    Evidence: .sisyphus/evidence/task-27-no-response.txt

  Scenario: App lifecycle
    Tool: Bash + Playwright
    Steps:
      1. Launch app fresh
      2. Verify onboarding shown (if first run)
      3. Complete onboarding
      4. Quit and relaunch
      5. Verify no onboarding, timer running, settings persisted
    Expected Result: State persists correctly
    Evidence: .sisyphus/evidence/task-27-lifecycle.txt
  ```

  **Commit**: YES
  - Message: `feat(app): wire end-to-end integration`
  - Files: `src/App.tsx`, `src/main.tsx`, `src/lib/hooks/*`

- [x] 28. Keyboard Shortcuts Implementation

  **What to do**:
  - Create `/src/lib/hooks/useKeyboardShortcuts.ts`
  - Implement app-focused shortcuts (NOT global):
    - Review popup:
      - `Space` / `Enter`: Reveal answer
      - `1` / `2` / `3` / `4`: Rate card
      - `Escape`: Dismiss popup (no response)
    - Card form:
      - `Cmd+Enter`: Save card
      - `Escape`: Cancel
    - General:
      - `Cmd+,`: Open settings
      - `Cmd+N`: New card
  - Show keyboard hint badges on buttons
  - Prevent shortcuts when input focused (except form shortcuts)

  **Must NOT do**:
  - Do not implement global hotkeys (requires accessibility permissions)
  - Do not override system shortcuts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard keyboard event handling

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 29, 30 after Task 27)
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4 (Final Verification)
  - **Blocked By**: Task 27

  **References**:
  - Task 20 review popup for rating shortcuts
  - Task 22 card form for save shortcut
  - React keyboard event patterns

  **Acceptance Criteria**:
  - [ ] All shortcuts work as documented
  - [ ] Shortcuts show hints on UI
  - [ ] No conflicts with system shortcuts
  - [ ] Shortcuts disabled when typing in input

  **QA Scenarios**:
  ```
  Scenario: Review shortcuts
    Tool: Playwright (+ playwright skill)
    Steps:
      1. Open review popup with card
      2. Press Space → verify back revealed
      3. Press "4" → verify rated and submitted
    Expected Result: Keyboard review works
    Evidence: .sisyphus/evidence/task-28-review-keys.png

  Scenario: Form shortcuts
    Tool: Playwright
    Steps:
      1. Open card creation form
      2. Fill front and back fields
      3. Press Cmd+Enter
      4. Verify card saved
    Expected Result: Quick save works
    Evidence: .sisyphus/evidence/task-28-form-keys.png

  Scenario: Input focus protection
    Tool: Playwright
    Steps:
      1. Focus on text input field
      2. Press "1" key
      3. Verify "1" typed into field (not shortcut)
    Expected Result: Shortcuts disabled during input
    Evidence: .sisyphus/evidence/task-28-focus.txt
  ```

  **Commit**: YES
  - Message: `feat(ux): add keyboard shortcuts`
  - Files: `src/lib/hooks/useKeyboardShortcuts.ts`, component updates for hints

- [x] 29. Login at Startup (SMAppService)

  **What to do**:
  - Add launch-at-login functionality using macOS SMAppService
  - Create Rust helper in `/src-tauri/src/autostart.rs`
  - Implement:
    - `enableAutostart()` - register login item
    - `disableAutostart()` - remove login item
    - `isAutostartEnabled() => boolean`
  - Wire to settings panel checkbox
  - Use `tauri-plugin-autostart` if available, else native SMAppService
  - Handle permission errors gracefully

  **Must NOT do**:
  - Do not implement for other platforms (macOS only)
  - Do not require additional permissions beyond login items

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard macOS API usage

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 28, 30 after Task 27)
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4 (Final Verification)
  - **Blocked By**: Task 27

  **References**:
  - `tauri-plugin-autostart` docs
  - macOS SMAppService API
  - Task 24 settings panel for UI

  **Acceptance Criteria**:
  - [ ] Enable autostart adds app to login items
  - [ ] Disable removes from login items
  - [ ] Setting persists across restarts
  - [ ] Works on macOS 12+

  **QA Scenarios**:
  ```
  Scenario: Enable autostart
    Tool: Bash
    Steps:
      1. Call enableAutostart()
      2. Run `osascript -e 'tell application "System Events" to get name of every login item'`
      3. Verify "MemCycle" in list
    Expected Result: Login item added
    Evidence: .sisyphus/evidence/task-29-enable.txt

  Scenario: Disable autostart
    Tool: Bash
    Steps:
      1. Enable then disable autostart
      2. Check login items list
      3. Verify "MemCycle" not in list
    Expected Result: Login item removed
    Evidence: .sisyphus/evidence/task-29-disable.txt

  Scenario: Persists after restart
    Tool: Bash
    Steps:
      1. Enable autostart
      2. Quit app
      3. Relaunch
      4. Call isAutostartEnabled() → expect true
    Expected Result: Setting persisted
    Evidence: .sisyphus/evidence/task-29-persist.txt
  ```

  **Commit**: YES
  - Message: `feat(macos): add login at startup`
  - Files: `src-tauri/src/autostart.rs`, `src-tauri/Cargo.toml`

- [x] 30. App Bundle and Signing

  **What to do**:
  - Configure Tauri for production build
  - Set up app metadata in `tauri.conf.json`:
    - App name: "MemCycle"
    - Bundle identifier: "com.memcycle.app"
    - Version: "1.0.0"
    - Category: "Education"
    - App icon (create simple icon)
  - Configure code signing (if certificates available)
  - Create `.dmg` installer
  - Add notarization config (optional, requires Apple Developer account)
  - Test built `.app` runs on fresh macOS system
  - Create simple app icon (placeholder acceptable)

  **Must NOT do**:
  - Do not block on real Apple Developer certificate (use ad-hoc)
  - Do not add auto-update (v2 scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard Tauri build configuration

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 28, 29 after Task 27)
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4 (Final Verification)
  - **Blocked By**: Task 27

  **References**:
  - `https://v2.tauri.app/distribute/` - Tauri distribution docs
  - `https://v2.tauri.app/distribute/macos/` - macOS specific
  - Icon requirements: 512x512 PNG minimum

  **Acceptance Criteria**:
  - [ ] `bun run tauri build` succeeds
  - [ ] `.app` bundle created in target directory
  - [ ] `.dmg` installer created
  - [ ] App runs when double-clicked
  - [ ] App icon visible in Finder

  **QA Scenarios**:
  ```
  Scenario: Production build
    Tool: Bash
    Steps:
      1. Run `bun run tauri build`
      2. Verify exit code 0
      3. Check `src-tauri/target/release/bundle/macos/` for `.app`
      4. Check for `.dmg` in same directory
    Expected Result: Build artifacts created
    Evidence: .sisyphus/evidence/task-30-build.txt

  Scenario: App launches from bundle
    Tool: Bash
    Steps:
      1. Navigate to built `.app`
      2. Run `open MemCycle.app`
      3. Verify app launches
      4. Verify menu bar icon appears
    Expected Result: Bundled app works
    Evidence: .sisyphus/evidence/task-30-launch.png

  Scenario: Icon visible
    Tool: Bash
    Steps:
      1. Check MemCycle.app/Contents/Resources/ for icon
      2. Open Finder, navigate to app
      3. Verify custom icon shown (not generic)
    Expected Result: App icon displayed
    Evidence: .sisyphus/evidence/task-30-icon.png
  ```

  **Commit**: YES
  - Message: `feat(build): configure production bundle and signing`
  - Files: `src-tauri/tauri.conf.json`, `src-tauri/icons/*`

---

## Final Verification Wave (after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run check` (tsc + lint). Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit |
|------|--------|
| 1 | `feat(scaffold): initialize Tauri + React project with core setup` |
| 2 | `feat(core): implement SM-2 and Leitner algorithms with scheduling` |
| 3 | `feat(tauri): add tray, popup, settings, and database integration` |
| 4 | `feat(ui): implement all React components and frontends` |
| 5 | `feat(polish): add keyboard shortcuts, autostart, and bundling` |
| FINAL | `chore: final QA and verification` |

---

## Success Criteria

### Verification Commands
```bash
bun run tauri build     # Expected: .app bundle created
bun test                # Expected: all tests pass
bun run lint            # Expected: no errors
```

### Final Checklist
- [ ] All "Must Have" features present and functional
- [ ] All "Must NOT Have" patterns absent from codebase
- [ ] All tests pass (bun test)
- [ ] App builds successfully (bun run tauri build)
- [ ] Export/import round-trip preserves all data
- [ ] Popup appears, auto-dismisses, and schedules correctly
