# Linguist Frontend

React single-page application for the Linguist language learning platform. Built with TypeScript, Vite, Tailwind CSS, and Radix UI components. Features shadowing-based lesson practice with speech recording, mastery graph visualization, writing/listening challenges, and full internationalization.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 |
| Language | TypeScript 5.8 |
| Build Tool | Vite 5.4 |
| Styling | Tailwind CSS 3.4 + custom design tokens |
| Components | Radix UI (40+ headless components) |
| State | Zustand 5.0 (with localStorage persistence) |
| Routing | React Router 6.30 |
| Forms | React Hook Form 7.61 + Zod 3.25 |
| Charts | Recharts 2.15 |
| Icons | Lucide React 0.462 |
| i18n | Custom context-based (EN, ES, PT-BR) |
| Testing | Vitest 3.2 + Testing Library |
| Production | Nginx (reverse proxy + SPA fallback) |

## Quick Start

### Prerequisites

- Node.js 18+
- Backend running at `http://localhost:8080` (see `back/README.md`)

### Development

```bash
cd front
npm install
npm run dev
```

App runs at **http://localhost:5173**.

### Production Build

```bash
npm run build       # Output to dist/
npm run preview     # Preview locally
```

### Docker

```bash
docker build -t linguist-front .
docker run -p 80:80 linguist-front
```

The Docker image uses a multi-stage build (Node for build, Nginx for serving) and proxies `/api` requests to the backend.

## Project Structure

```
front/
├── src/
│   ├── App.tsx                  # Routes & providers
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Design tokens + Tailwind base
│   ├── pages/                   # Route pages
│   │   ├── Onboarding.tsx       # Welcome, register, login, AI setup
│   │   ├── Dashboard.tsx        # Progress overview
│   │   ├── Lessons.tsx          # Lesson list with tabs & pagination
│   │   ├── NewLesson.tsx        # AI lesson generation form
│   │   ├── LessonPractice.tsx   # Shadowing practice + speech analysis
│   │   ├── Mastery.tsx          # Grammar rule mastery graph
│   │   ├── RulePractice.tsx     # Multiple-choice exercises for a rule
│   │   ├── WritingChallenge.tsx  # Writing challenge list + generate
│   │   ├── WritingChallengeDetail.tsx  # Write + AI analysis
│   │   ├── ListeningChallenge.tsx      # Listening challenge list + generate
│   │   ├── ListeningChallengeDetail.tsx # Audio dictation + comparison
│   │   ├── Timeline.tsx         # Practice session history
│   │   ├── Settings.tsx         # Profile, language, AI config
│   │   └── NotFound.tsx         # 404 page
│   ├── components/
│   │   ├── ui/                  # 40+ Radix UI + shadcn components
│   │   ├── AppLayout.tsx        # Sticky header, nav, mobile sidebar
│   │   ├── AIChatBot.tsx        # Floating chat widget
│   │   ├── LevelBadge.tsx       # CEFR level colored badge
│   │   ├── StreakDisplay.tsx     # Streak counter with flame icon
│   │   ├── MasteryBar.tsx       # Color-coded progress bar
│   │   ├── ProgressRing.tsx     # SVG circular progress
│   │   ├── StatCard.tsx         # Dashboard stat card
│   │   └── NavLink.tsx          # Active route link
│   ├── lib/
│   │   ├── api.ts               # API client (all endpoints)
│   │   ├── store.ts             # Zustand store (auth, config, data)
│   │   ├── types.ts             # TypeScript interfaces & helpers
│   │   └── utils.ts             # cn() class merger utility
│   ├── i18n/
│   │   ├── index.tsx            # TranslationProvider & useTranslation hook
│   │   └── locales/
│   │       ├── en.ts            # English (~440 keys)
│   │       ├── es.ts            # Spanish
│   │       └── pt-BR.ts         # Brazilian Portuguese
│   ├── hooks/
│   │   ├── use-toast.ts         # Toast notification hook
│   │   └── use-mobile.tsx       # Mobile breakpoint detection
│   └── assets/                  # Static images
├── public/                      # Static files
├── vite.config.ts               # Dev server + aliases
├── tailwind.config.ts           # Theme + custom colors
├── postcss.config.js            # PostCSS pipeline
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies + scripts
├── nginx.conf                   # Production reverse proxy
├── Dockerfile                   # Multi-stage build
└── .dockerignore                # Build exclusions
```

## Routes

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | Onboarding | Public | Welcome screen, registration, login, AI key setup |
| `/dashboard` | Dashboard | Protected | Progress stats, mastery summary, recent lessons |
| `/lessons` | Lessons | Protected | Browse lessons with tabs (all/pending/completed) |
| `/lessons/new` | NewLesson | Protected | Generate AI lesson on any topic |
| `/lessons/:id` | LessonPractice | Protected | Shadowing practice with speech recording |
| `/mastery` | Mastery | Protected | Grammar rule mastery visualization |
| `/mastery/:id` | RulePractice | Protected | Targeted exercises for a specific rule |
| `/writing` | WritingChallenge | Protected | Writing challenge list + generate |
| `/writing/:id` | WritingChallengeDetail | Protected | Write response + get AI feedback |
| `/listening` | ListeningChallenge | Protected | Listening challenge list + generate |
| `/listening/:id` | ListeningChallengeDetail | Protected | Audio dictation + word comparison |
| `/timeline` | Timeline | Protected | Practice session history with pagination |
| `/settings` | Settings | Protected | Profile, language, AI provider configuration |
| `*` | NotFound | Public | 404 error page |

Protected routes use a `<ProtectedRoute>` wrapper that checks for an authenticated user in the Zustand store. Unauthenticated users are redirected to `/`.

## State Management

### Zustand Store (`lib/store.ts`)

The app uses a single Zustand store with `persist` middleware that saves to `localStorage` under the key `linguist-storage`.

**Persisted state** (survives page reload):
- `token` — JWT authentication token
- `user` — UserResponse object
- `aiConfig` — `{ provider, apiKey }` for AI requests
- `locale` — Current UI language
- `selectedVoice` — TTS voice preference

**Transient state** (in-memory only):
- `dashboard` — DashboardResponse
- `lessons` — LessonResponseDTO[]
- `currentLesson` — LessonResponseDTO | null
- `competences` — CompetenceResponse[]
- `timeline` — TimelineEntry[]

**Usage:**
```typescript
const user = useAppStore(state => state.user)
const setToken = useAppStore(state => state.setToken)

// Logout
useAppStore.getState().reset()
```

## API Layer (`lib/api.ts`)

### Base URL

- **Development**: `http://localhost:8080/api`
- **Production**: `/api` (same origin, proxied by Nginx)

### Authentication

All protected requests include `Authorization: Bearer {token}` from the Zustand store. AI-powered endpoints additionally send `X-AI-Provider` and `X-AI-Key` headers from `aiConfig`.

### Error Handling

A shared `handleResponse()` interceptor checks for 401/403 responses and automatically logs out the user and redirects to `/`.

### API Modules

#### userApi

| Method | Description |
|--------|-------------|
| `create(request)` | Register new user, returns AuthResponse |
| `login(request)` | Login, returns AuthResponse |
| `getById(id)` | Get user profile |
| `getAll()` | List all users |
| `update(id, request)` | Update profile |
| `delete(id)` | Delete account |

#### lessonApi

| Method | Description |
|--------|-------------|
| `generate(request)` | Generate AI lesson |
| `getByUser(userId, page?, size?)` | List user's lessons (paginated) |
| `getById(id)` | Get single lesson |
| `analyzeSpeech(formData)` | Submit audio for analysis (multipart) |
| `deleteSession(sessionId, userId)` | Delete practice session |
| `getHistory(lessonId, page?, size?)` | Practice session history (paginated) |
| `explainWord(request)` | Get contextual word definition |

#### masteryApi

| Method | Description |
|--------|-------------|
| `getByUser(userId, page?, size?)` | All competences (paginated) |
| `getWeaknesses(userId, threshold?, page?, size?)` | Weak rules (paginated) |
| `recordPractice(request)` | Record success/failure |
| `generateExercises(competenceId)` | Generate 5 exercises |
| `submitExercises(competenceId, correct, total)` | Submit exercise results |
| `getRelatedLessons(competenceId, page?, size?)` | Lessons for a rule (paginated) |

#### challengeApi

| Method | Description |
|--------|-------------|
| `getById(id)` | Get challenge by ID |
| `generateWriting(request)` | Generate writing prompt |
| `submitWriting(request)` | Submit writing for analysis |
| `getWritingPending(userId)` | Get unfinished writing challenge |
| `getWritingHistory(userId, page?, size?)` | Writing history (paginated) |
| `generateListening(request)` | Generate listening sentence |
| `submitListening(request)` | Submit listening transcription |
| `getListeningHistory(userId, page?, size?)` | Listening history (paginated) |

#### progressApi

| Method | Description |
|--------|-------------|
| `getDashboard(userId)` | Full learning statistics |
| `getTimeline(userId, days?, page?, size?)` | Practice history (paginated) |
| `checkLevel(userId)` | Check/trigger level promotion |

#### aiApi

| Method | Description |
|--------|-------------|
| `chat(message, userId)` | Send message to AI assistant |

### Pagination

Paginated endpoints return `PageResponse<T>`:

```typescript
interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number      // Current page (0-indexed)
  first: boolean
  last: boolean
  empty: boolean
}
```

Pages use a "Load More" pattern: track `page`, `hasMore`, and `loadingMore` state, append new `content` to existing data.

## Type System (`lib/types.ts`)

### Core Types

```typescript
type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
type AIProvider = 'gemini' | 'openai' | 'perplexity' | 'deepseek'
type MasteryLevel = 'critical' | 'weak' | 'progressing' | 'good' | 'mastered'
type ChallengeType = 'WRITING' | 'LISTENING'
```

### Key Interfaces

- **UserResponse** — id, name, email, languages, level, streak data
- **LessonResponseDTO** — topic, text, phonetics, grammar focus, scores
- **SpeechAnalysisResponse** — accuracy, errors with rules/tips, feedback
- **CompetenceResponse** — ruleName, masteryLevel, practiceCount
- **ExerciseDTO** — question, options, correctIndex, explanation
- **ChallengeResponseDTO** — type, prompt, response, score, analysisJson
- **DashboardResponse** — mastery stats, accuracy, streak, session counts
- **TimelineEntry** — sessionId, lessonTopic, accuracy, practiceDate
- **WritingAnalysis** — score, errors, grading (grammar/vocabulary/coherence/spelling/level)
- **ListeningAnalysis** — score, feedback, word-by-word comparison

### Helper Functions

```typescript
getMasteryLevel(value: number): MasteryLevel   // 0-20=critical, 20-40=weak, etc.
getMasteryColor(level: MasteryLevel): string    // Tailwind color class
getMasteryLabel(level: MasteryLevel): string    // Display label
getLevelColor(level: LanguageLevel): string     // CEFR badge color class
```

## Internationalization

### Setup

Custom context-based i18n system in `src/i18n/`. Uses React Context with a `TranslationProvider` wrapping the app.

### Supported Locales

| Code | Label | Flag |
|------|-------|------|
| `en` | English | US |
| `pt-BR` | Portugues (Brasil) | BR |
| `es` | Espanol | ES |

### Translation Files

Each locale file exports a flat object with ~440 keys organized by namespace:

| Namespace | Examples |
|-----------|---------|
| `common.*` | loading, save, cancel, back, delete, loadMore |
| `nav.*` | dashboard, lessons, mastery, writing, listening |
| `onboarding.*` | register, login, AI setup screens |
| `levels.*` | A1-C2 level names and descriptions |
| `dashboard.*` | Progress stats, CTAs |
| `lessons.*` | Browse, practice, vocabulary |
| `practice.*` | Recording, analysis, phonetics |
| `mastery.*` | Rules, levels, exercises |
| `writing.*` | Prompts, feedback, grading |
| `listening.*` | Audio, transcription, comparison |
| `settings.*` | Profile, language, AI configuration |
| `toast.*` | Success/error notifications |
| `time.*` | Relative time labels |
| `masteryLevel.*` | critical, weak, progressing, good, mastered |

### Usage

```typescript
const { t, locale, setLocale } = useTranslation()

// Simple key
<h1>{t('nav.dashboard')}</h1>

// With interpolation
<p>{t('dashboard.welcome', { name: 'John' })}</p>

// Change language
setLocale('es')
```

### Locale Detection

1. Reads from persisted Zustand store
2. Falls back to `navigator.language`
3. Defaults to English if unsupported

## Design System

### Theme

Built on Tailwind CSS with custom design tokens defined in `src/index.css` as CSS custom properties.

**Font**: Plus Jakarta Sans (Google Fonts)

**Colors**:

| Token | Usage |
|-------|-------|
| `--primary` | Deep indigo — buttons, links, accents |
| `--accent` | Warm coral — secondary highlights |
| `--success` | Green — completion, positive feedback |
| `--warning` | Yellow/orange — alerts |
| `--info` | Blue — informational |

**Mastery level colors** (5 tiers):

| Level | Color | Range |
|-------|-------|-------|
| Critical | Red | 0-20% |
| Weak | Orange | 20-40% |
| Progressing | Yellow | 40-60% |
| Good | Blue | 60-80% |
| Mastered | Green | 80-100% |

**CEFR level colors** (6 levels):

| Level | Color |
|-------|-------|
| A1 | Blue |
| A2 | Teal |
| B1 | Green |
| B2 | Yellow |
| C1 | Orange |
| C2 | Indigo |

### Custom Animations

- `fade-in` — opacity 0 → 1
- `slide-in-right` — translate from right
- `scale-in` — scale 0.95 → 1
- `pulse-soft` — subtle opacity pulse
- `bounce-soft` — gentle bounce

### Utilities

- `cn()` — merges Tailwind classes using `clsx` + `tailwind-merge`
- `.btn-gradient` — gradient button styling
- `.card-hover` — hover lift effect on cards
- `.gradient-text` — gradient text fill

### Dark Mode

Supported via `class` strategy using `next-themes`. Add `.dark` class to `<html>` element.

## Components

### Layout

**AppLayout** — Main wrapper with:
- Sticky header with logo, navigation (desktop), and user controls
- Right header: streak display, level badge, language switcher, user dropdown
- Mobile: sheet sidebar with nav items and user stats
- AI ChatBot floating widget (when authenticated)

### Custom Components

| Component | Description |
|-----------|-------------|
| LevelBadge | CEFR level badge (A1-C2) with color coding. Sizes: sm, md, lg |
| StreakDisplay | Current/longest streak with animated flame icon. Pulse at 7+ days |
| MasteryBar | Horizontal progress bar with mastery-level colors. Sizes: sm, md, lg |
| ProgressRing | SVG circular progress indicator with percentage center |
| StatCard | Dashboard metric card with icon, value, trend, and variant styling |
| AIChatBot | Floating chat widget (bottom-right). Markdown support, auto-scroll |
| NavLink | Route link with active state styling |

### UI Library (Radix + shadcn)

40+ pre-built components in `src/components/ui/`:

**Layout**: button, card, input, label, select, sheet, sidebar, drawer, separator
**Navigation**: tabs, navigation-menu, breadcrumb, pagination, menubar
**Feedback**: alert, alert-dialog, toast, toaster, progress, skeleton
**Overlays**: dialog, popover, dropdown-menu, context-menu, hover-card, command
**Forms**: form, input, label, select, checkbox, radio-group, switch, slider, input-otp
**Data**: table, chart, calendar, carousel, accordion, scroll-area
**Visual**: avatar, badge, aspect-ratio, toggle, toggle-group, tooltip

## Key Pages

### Onboarding (`/`)

Multi-step flow: Welcome → Register/Login → AI Setup → Dashboard redirect. If already authenticated, redirects to `/dashboard` using React Router's `<Navigate>`.

### LessonPractice (`/lessons/:id`)

Core shadowing experience:
1. Displays lesson text with phonetic markers below each word
2. Click any word for contextual AI explanation
3. Audio playback with adjustable speed (0.5x-2x) and voice selection
4. Two transcription modes:
   - **Browser**: Web Speech API for real-time transcription
   - **Whisper**: Audio-only capture, sent to server for analysis
5. Speech analysis with accuracy score, error breakdown, and rule-based feedback
6. Practice history with audio playback per session

### Mastery (`/mastery`)

Grid of grammar rules with mastery bars, sortable/filterable. Click a rule to navigate to `/mastery/:id` for targeted exercises (5 multiple-choice questions per set).

### WritingChallengeDetail (`/writing/:id`)

AI-generated writing prompt → student writes response → AI analyzes with grading across grammar, vocabulary, coherence, spelling, and level appropriateness.

### ListeningChallengeDetail (`/listening/:id`)

AI-generated sentence → TTS audio playback with voice preloading → student types what they hear → word-by-word comparison with color-coded results.

## Speech & Audio

### Browser Transcription (Web Speech API)

Uses `SpeechRecognition` for real-time speech-to-text. Continuous mode with interim results displayed during recording.

### Audio Recording (MediaRecorder)

Records audio as WebM using `MediaRecorder` API. Uses `start(500)` for periodic data chunks. Audio is uploaded as `FormData` to the backend for analysis.

### Text-to-Speech

Uses `SpeechSynthesis` API for lesson audio playback. Features:
- Voice selection from available system voices
- Speed control (0.5x to 2x)
- Word-by-word highlighting via `onboundary` events
- Voice preloading with silent warm-up utterance

## Nginx Configuration (Production)

```nginx
server {
    listen 80;
    client_max_body_size 25M;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;    # SPA fallback
    }

    location /api/ {
        proxy_pass http://linguist-api:8080/api/;
        proxy_read_timeout 120s;             # Long timeout for AI generation
        proxy_send_timeout 120s;
        client_max_body_size 25M;            # Audio file uploads
    }
}
```

Key points:
- All client-side routes fall back to `index.html` (SPA routing)
- `/api/*` proxied to backend container `linguist-api:8080`
- 120s timeouts for AI generation requests
- 25MB upload limit for audio files

## Docker

### Multi-stage Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Final image contains only Nginx + built static assets.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server at localhost:5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on all files |
| `npm run test` | Run Vitest (unit tests) |
| `npm run test:watch` | Run tests in watch mode |

## Extending

| Task | Where |
|------|-------|
| Add a new page | Create `src/pages/NewPage.tsx` + add route in `App.tsx` |
| Add an API endpoint | Add method to relevant module in `src/lib/api.ts` |
| Add i18n keys | Add to all 3 files in `src/i18n/locales/` |
| Add a UI component | Create in `src/components/` using Radix primitives + Tailwind |
| Add a type | Define in `src/lib/types.ts` |
| Change theme colors | Edit CSS custom properties in `src/index.css` |
| Add a store field | Update `AppState` interface + add setter in `src/lib/store.ts` |

## License

This project is proprietary. All rights reserved.
