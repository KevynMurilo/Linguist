# Linguist - AI-Powered Language Learning Platform

Linguist is a full-stack language learning platform that uses artificial intelligence to create personalized lessons, analyze speech, track grammar mastery, and adaptively guide students from A1 to C2 proficiency. Unlike generic chatbots, Linguist focuses on **Shadowing practice**, **connected speech analysis**, **mastery tracking per grammar rule**, and an **adaptive teaching system** that adjusts its entire language to the student's CEFR level.

## How It Works

The platform revolves around a feedback loop: the student practices, the AI analyzes, the system tracks which grammar rules are strong or weak, and future content is generated to reinforce weak areas. Everything adapts to the student's level - from vocabulary complexity to explanation language to scoring tolerance.

### Core Features

**Lesson Engine (Shadowing)**
- AI generates lessons on any topic adapted to the student's level
- Text includes phonetic guides using the student's native language sounds (no IPA)
- Vocabulary lists, grammar explanations, and cultural notes
- Audio playback with adjustable speed (0.5x-2x), voice selection, and word-by-word highlighting
- Speech recording with real-time transcription (browser) or server-side analysis (Whisper)
- AI-powered accuracy scoring with detailed error breakdown and pronunciation feedback
- Click any word in a lesson to get contextual explanation with definition, pronunciation, usage, and examples

**Mastery Graph**
- Every grammar rule the student encounters is tracked individually
- Mastery level (0-100%) adjusts on each practice: success +5, failure -10
- Weak rules (below 60%) are automatically injected into AI prompts to force reinforcement
- AI generates targeted multiple-choice exercises for any specific rule
- Exercise difficulty matches current mastery and CEFR level

**Writing Challenges**
- AI generates writing prompts appropriate to the student's level
- Student writes a response, AI analyzes grammar, vocabulary, coherence, spelling, and level appropriateness
- Detailed error correction with rule names and explanations
- Score and feedback in the student's native language

**Listening Challenges**
- AI generates dictation sentences matching the student's level
- Audio playback with TTS preloading and voice caching
- Student types what they hear, AI compares word-by-word
- Scoring tolerance adjusts by level (A1 lenient, C2 strict)

**Progress System**
- Dashboard with mastery stats, accuracy averages, streak tracking, lesson completion rates
- Practice session timeline with detailed history
- Automatic level promotion: A1 -> A2 -> B1 -> B2 -> C1 -> C2
- Promotion criteria: average mastery >= 75% and at least 5 rules with mastery >= 80%

**BYOK (Bring Your Own Key)**
- No API keys stored on the server
- Students provide their own AI provider key (Gemini, OpenAI, Perplexity, DeepSeek)
- Keys sent via request headers on every API call
- Full control over costs and provider choice

### Level Adaptation (CEFR A1-C2)

| Level | Explanations | Lesson Content | Phonetics | Exercise Design |
|-------|-------------|----------------|-----------|-----------------|
| A1 | Native language | 3-5 simple sentences, present tense, top 100 words | Native alphabet sounds | Basic vocab, clearly different options |
| A2 | Native language | 5-8 sentences, past + present, top 500 words | Native alphabet sounds | Common vocab, one plausible distractor |
| B1 | Mix native + target | 8-12 sentences, multiple tenses, connectors | Native alphabet sounds | Intermediate vocab, two plausible distractors |
| B2 | Mix native + target | 12-18 sentences, conditionals, subjunctive | Native alphabet sounds | Collocations, all options plausible |
| C1 | Target language only | 15-25 sentences, idioms, formal expressions | Native alphabet approximation | Edge cases, formal vs informal |
| C2 | Target language only | 20-30 sentences, literary register, rare vocab | Native alphabet approximation | Stylistic differences, regional variations |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Java 17, Spring Boot 3.5.10, Spring Data JPA, Spring Security (JWT) |
| **Database** | H2 (development), PostgreSQL (production) |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Zustand |
| **AI Providers** | Gemini (full support), OpenAI, Perplexity, DeepSeek |
| **Speech** | Web Speech API (browser TTS/STT), Whisper ASR (optional server-side) |
| **Infrastructure** | Docker, Docker Compose, Nginx reverse proxy |
| **API Docs** | SpringDoc OpenAPI / Swagger UI |
| **i18n** | English, Spanish, Portuguese (BR) |

## Project Structure

```
Linguist/
├── back/                    # Spring Boot API
│   ├── src/main/java/       # Source code (package-by-feature)
│   ├── src/main/resources/  # Configuration files
│   ├── Dockerfile           # Multi-stage build
│   └── pom.xml              # Maven dependencies
├── front/                   # React SPA
│   ├── src/pages/           # Page components (13 pages)
│   ├── src/components/      # Reusable UI components
│   ├── src/lib/             # API layer, store, types, utilities
│   ├── src/i18n/            # Internationalization (3 locales)
│   ├── Dockerfile           # Multi-stage build
│   ├── nginx.conf           # Reverse proxy config
│   └── package.json         # Dependencies
└── docker-compose.yml       # Orchestration (API + Frontend + Whisper)
```

## Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- Or: Java 17+, Maven 3.9+, Node.js 18+ (for local development)
- An API key from a supported provider (Gemini recommended - free tier available)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd Linguist

# Start all services
docker compose up -d
```

This starts three containers:
- **linguist-api** (port 8080) - Spring Boot backend
- **linguist-front** (port 80) - React frontend with Nginx
- **linguist-whisper** (port 9000) - Optional Whisper ASR service

Access the app at **http://localhost** (or the configured `HOST_FRONT_PORT`).

### Option 2: Local Development

**Backend:**
```bash
cd back
./mvnw spring-boot:run
# API at http://localhost:8080
# Swagger at http://localhost:8080/swagger-ui.html
# H2 Console at http://localhost:8080/h2-console
```

**Frontend:**
```bash
cd front
npm install
npm run dev
# App at http://localhost:5173
```

### First-Time Setup

1. Open the app and register a new account
2. Select your native language, target language, and current level
3. Go to **Settings** and configure your AI provider + API key
4. Create your first lesson from the **Lessons** page

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_PROFILES_ACTIVE` | `dev` | Profile: `dev` (H2) or `prod` (PostgreSQL) |
| `SERVER_PORT` | `8080` | Server port |
| `JWT_SECRET` | (built-in) | Secret for JWT signing (change in production) |
| `JWT_EXPIRATION` | `86400000` | Token expiration in ms (24h) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `WHISPER_ENABLED` | `false` | Enable Whisper transcription service |
| `WHISPER_URL` | `http://linguist-whisper:9000` | Whisper service URL |
| `DB_URL` | - | PostgreSQL URL (prod profile) |
| `DB_USERNAME` | - | PostgreSQL username (prod profile) |
| `DB_PASSWORD` | - | PostgreSQL password (prod profile) |

### Docker Compose

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST_API_PORT` | `8080` | Host port for the API |
| `HOST_FRONT_PORT` | `80` | Host port for the frontend |

## API Overview

All endpoints require JWT authentication except registration and login. AI-powered endpoints also require `X-AI-Provider` and `X-AI-Key` headers.

| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| **Users** | `/api/users` | Register, login, profile CRUD |
| **Lessons** | `/api/lessons` | Generate, analyze speech, explain word, practice history |
| **Mastery** | `/api/mastery` | Competences, weaknesses, exercises, submit results |
| **Challenges** | `/api/challenges` | Writing/listening generation, submission, history |
| **Progress** | `/api/progress` | Dashboard stats, timeline, auto level promotion |

Full interactive documentation available at `/swagger-ui.html` when the backend is running.

## Architecture Highlights

- **Package-by-Feature**: Each domain (lesson, mastery, challenge, progress, user) contains its own entity, repository, service, controller, and DTOs
- **Strategy Pattern**: AI providers implement a common `AIClient` interface; `AIClientFactory` resolves by name
- **BYOK Security**: API keys travel in headers per-request and are never persisted
- **Stateless JWT**: No server sessions; token contains userId and email with 24h expiration
- **Mastery Feedback Loop**: Weak grammar rules are injected into every AI generation prompt
- **Adaptive Prompts**: System prompts contain level-specific blocks that control vocabulary, sentence complexity, and exercise design

## License

This project is proprietary. All rights reserved.
