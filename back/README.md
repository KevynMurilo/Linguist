# Linguist Backend

Spring Boot REST API that powers the Linguist language learning platform. Handles AI-driven lesson generation, speech analysis, mastery tracking, writing/listening challenges, and automatic level progression.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 17 |
| Framework | Spring Boot 3.5.10 |
| ORM | Spring Data JPA / Hibernate |
| Database (dev) | H2 (file-based) |
| Database (prod) | PostgreSQL |
| HTTP Client | Spring WebFlux (WebClient) |
| Security | Spring Security + JWT (JJWT 0.12.6) |
| Validation | Jakarta Bean Validation |
| API Docs | SpringDoc OpenAPI 2.8.6 (Swagger UI) |
| Build | Maven |

## Quick Start

### Prerequisites

- Java 17+
- Maven 3.9+
- An API key from a supported provider (Gemini, OpenAI, Perplexity, or DeepSeek)

### Development (H2)

```bash
cd back
./mvnw spring-boot:run
```

Access points:
- **API**: http://localhost:8080/api
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **H2 Console**: http://localhost:8080/h2-console (URL: `jdbc:h2:file:./data/linguist_db`, user: `sa`, no password)

### Production (PostgreSQL)

```bash
export SPRING_PROFILES_ACTIVE=prod
export DB_URL=jdbc:postgresql://localhost:5432/linguist_db
export DB_USERNAME=linguist
export DB_PASSWORD=your_password
./mvnw spring-boot:run
```

## Project Structure

```
back/
├── src/main/java/com/linguist/core/
│   ├── LinguistCoreAiApplication.java   # Entry point
│   ├── ai/                              # AI provider layer (Strategy Pattern)
│   │   ├── AIProvider.java              # Enum: GEMINI, OPENAI, PERPLEXITY, DEEPSEEK
│   │   ├── AIClient.java               # Interface for AI operations
│   │   ├── AIClientFactory.java         # Factory: resolves provider by name
│   │   ├── BaseAIClient.java            # Shared WebClient HTTP logic
│   │   ├── GeminiClient.java            # Google Gemini (supports audio input)
│   │   ├── OpenAIClient.java            # OpenAI GPT-4o-mini
│   │   ├── PerplexityClient.java        # Perplexity Sonar
│   │   ├── DeepSeekClient.java          # DeepSeek
│   │   ├── AIService.java               # Chat assistant service
│   │   ├── AIController.java            # Chat endpoint
│   │   └── AIChatRequest/Response.java  # Chat DTOs
│   ├── config/                          # Configuration
│   │   ├── SecurityConfig.java          # Spring Security (stateless JWT)
│   │   ├── JwtService.java              # JWT generation & validation
│   │   ├── JwtAuthenticationFilter.java # Token extraction filter
│   │   ├── CorsConfig.java              # CORS policy
│   │   ├── WebClientConfig.java         # WebClient bean (10MB buffer)
│   │   └── OpenApiConfig.java           # Swagger configuration
│   ├── exception/                       # Error handling
│   │   ├── GlobalExceptionHandler.java  # Central @ControllerAdvice
│   │   ├── ErrorResponse.java           # Error response DTO
│   │   ├── ResourceNotFoundException.java
│   │   ├── DuplicateResourceException.java
│   │   ├── AIProviderException.java
│   │   └── InvalidProviderException.java
│   ├── user/                            # User management
│   │   ├── User.java                    # Entity
│   │   ├── LanguageLevel.java           # Enum: A1-C2
│   │   ├── UserRepository.java
│   │   ├── UserService.java
│   │   ├── UserController.java
│   │   └── dto/                         # CreateUserRequest, LoginRequest, etc.
│   ├── lesson/                          # Lesson engine
│   │   ├── Lesson.java                  # Entity
│   │   ├── LessonRepository.java
│   │   ├── LessonService.java           # Generation, speech analysis, word explain
│   │   ├── LessonController.java
│   │   ├── LanguageNameMapper.java      # Language code → full name
│   │   └── dto/                         # LessonRequestDTO, SpeechAnalysisResponse, etc.
│   ├── mastery/                         # Mastery graph
│   │   ├── Competence.java              # Entity (grammar rule tracking)
│   │   ├── PracticeSession.java         # Entity (attempt records)
│   │   ├── CompetenceRepository.java
│   │   ├── PracticeSessionRepository.java
│   │   ├── CompetenceService.java       # Scoring, exercises, weak rule detection
│   │   ├── CompetenceController.java
│   │   └── dto/                         # ExerciseDTO, SubmitExercisesResponse, etc.
│   ├── challenge/                       # Writing & Listening challenges
│   │   ├── Challenge.java               # Entity
│   │   ├── ChallengeType.java           # Enum: WRITING, LISTENING
│   │   ├── ChallengeRepository.java
│   │   ├── ChallengeService.java        # Generation, analysis, scoring
│   │   ├── ChallengeController.java
│   │   └── dto/                         # WritingAnalysis, ListeningAnalysis, etc.
│   ├── progress/                        # Progress tracking
│   │   ├── ProgressService.java         # Dashboard, timeline, level promotion
│   │   ├── ProgressController.java
│   │   └── dto/                         # DashboardResponse, TimelineEntry, etc.
│   └── transcription/                   # Whisper integration
│       └── TranscriptionService.java    # Audio → text via Whisper ASR
├── src/main/resources/
│   ├── application.yml                  # Base config
│   ├── application-dev.yml              # H2 settings
│   └── application-prod.yml             # PostgreSQL settings
├── Dockerfile                           # Multi-stage build
├── docker-compose.yml                   # Whisper service
└── pom.xml                              # Dependencies
```

## Architecture

### Package-by-Feature

Each domain feature is self-contained with its own entity, repository, service, controller, and DTOs. Shared concerns (config, exceptions, AI) live in dedicated packages.

### BYOK (Bring Your Own Key)

AI API keys are never stored on the server. Clients send them via request headers on every AI-powered call:

```
X-AI-Provider: gemini
X-AI-Key: AIzaSy...
```

### Strategy Pattern (AI Providers)

```
AIClient (interface)
├── GeminiClient    → generativelanguage.googleapis.com (audio support)
├── OpenAIClient    → api.openai.com/v1/chat (gpt-4o-mini)
├── PerplexityClient → api.perplexity.ai/chat (sonar)
└── DeepSeekClient  → DeepSeek API

AIClientFactory.getClient(providerName, apiKey) → AIClient
```

`AIClient` interface methods:
- `generateContent(systemPrompt, userPrompt, apiKey)` — lesson/challenge generation
- `analyzeSpeech(systemPrompt, userPrompt, apiKey)` — text-based speech analysis
- `analyzeSpeechWithAudio(systemPrompt, userPrompt, audioData, apiKey)` — audio-based analysis (Gemini only)
- `explainWord(systemPrompt, userPrompt, apiKey)` — contextual word definitions
- `supportsAudioInput()` — `true` for Gemini, `false` for others

### Stateless JWT Authentication

- No server-side sessions
- Token contains `userId` (subject) and `email` claims
- 24-hour expiration (configurable via `JWT_EXPIRATION`)
- BCrypt password hashing

## Data Model

### User

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Display name |
| email | String | Unique, used for login |
| passwordHash | String | BCrypt encrypted |
| nativeLanguage | String | Language code (e.g., `pt-BR`) |
| targetLanguage | String | Language code (e.g., `en-US`) |
| level | LanguageLevel | A1, A2, B1, B2, C1, C2 |
| currentStreak | Integer | Consecutive practice days |
| longestStreak | Integer | Record streak |
| lastPracticeDate | LocalDate | For streak calculation |
| totalPracticeSessions | Long | Lifetime count |
| createdAt, updatedAt | LocalDateTime | Timestamps |

**Relationships**: User → Lessons (1:N), Competences (1:N), PracticeSessions (1:N)

### Lesson

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user | User (FK) | Owner |
| topic | String | Lesson subject |
| targetLanguage | String | Language being learned |
| simplifiedText | TEXT | Main lesson content |
| phoneticMarkers | TEXT | Pronunciation guide (native alphabet) |
| teachingNotes | TEXT | Grammar explanations |
| vocabularyList | TEXT | Key words with translations |
| culturalNote | TEXT | Cultural context |
| grammarFocus | List\<String\> | Grammar rules covered (ElementCollection) |
| level | LanguageLevel | Lesson difficulty |
| audioSpeedMin/Max | Double | TTS speed range (0.5-1.5) |
| completed | Boolean | True if accuracy >= 80% |
| bestScore | Integer | Highest accuracy achieved |
| timesAttempted | Integer | Total attempts |
| completedAt | LocalDateTime | First completion time |

### Competence

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user | User (FK) | Owner (unique constraint with ruleName) |
| ruleName | String | Grammar rule identifier |
| masteryLevel | Integer | 0-100 score |
| failCount | Integer | Total failures |
| practiceCount | Integer | Total attempts |
| lastPracticed | LocalDateTime | Last practice time |

### PracticeSession

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user | User (FK) | Owner |
| lesson | Lesson (FK) | Associated lesson |
| accuracy | Integer | 0-100 score |
| transcribedText | TEXT | Whisper/browser transcription |
| audioData | BLOB | Raw audio bytes (WebM) |
| errorCount | Integer | Number of errors found |
| errorsJson | TEXT | JSON array of error objects |
| feedback | TEXT | AI-generated feedback |
| practiceDate | LocalDate | Date of practice |

### Challenge

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user | User (FK) | Owner |
| type | ChallengeType | WRITING or LISTENING |
| level | LanguageLevel | Difficulty level |
| targetLanguage | String | Language being learned |
| prompt | TEXT | Writing topic or listening context |
| originalText | TEXT | Correct text (listening) |
| studentResponse | TEXT | User's written/typed text |
| score | Integer | 0-100 score |
| feedback | TEXT | AI feedback |
| analysisJson | TEXT | Detailed analysis JSON |
| grammarRules | TEXT | Rules covered |
| completed | Boolean | Has been submitted |

## API Reference

All endpoints require JWT authentication except registration and login. AI-powered endpoints additionally require `X-AI-Provider` and `X-AI-Key` headers.

### Authentication (`/api/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/users` | Public | Register new user |
| POST | `/api/users/login` | Public | Login, returns JWT |
| GET | `/api/users/{id}` | JWT | Get user profile |
| GET | `/api/users` | JWT | List all users (paginated) |
| PUT | `/api/users/{id}` | JWT | Update profile |
| DELETE | `/api/users/{id}` | JWT | Delete account |

**Register request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "mypassword123",
  "nativeLanguage": "pt-BR",
  "targetLanguage": "en-US",
  "level": "A1"
}
```

**Auth response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "nativeLanguage": "pt-BR",
    "targetLanguage": "en-US",
    "level": "A1",
    "currentStreak": 0,
    "longestStreak": 0,
    "lastPracticeDate": null,
    "totalPracticeSessions": 0
  }
}
```

### Lessons (`/api/lessons`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/generate` | JWT + AI | Generate AI lesson on any topic |
| POST | `/analyze-speech` | JWT + AI | Submit audio for analysis (multipart) |
| POST | `/explain-word` | JWT + AI | Get contextual word definition |
| GET | `/user/{userId}` | JWT | List user's lessons (paginated: `page`, `size`) |
| GET | `/{id}` | JWT | Get single lesson |
| GET | `/{id}/sessions` | JWT | Practice history (paginated) |
| GET | `/sessions/{sessionId}/audio` | JWT | Download audio recording (audio/webm) |
| DELETE | `/sessions/{sessionId}` | JWT | Delete practice session |

**Generate request:**
```json
{
  "userId": "uuid",
  "topic": "Space exploration",
  "targetLanguage": "es-ES"
}
```

**Speech analysis (multipart/form-data):**
- `lessonId` (String) — lesson UUID
- `userId` (String) — user UUID
- `spokenText` (String) — browser transcription (empty for Whisper mode)
- `audio` (File) — WebM audio recording
- `transcriptionMode` (String) — `browser` or `whisper`

**Speech analysis response:**
```json
{
  "accuracy": 72,
  "errors": [
    {
      "expected": "I have gone",
      "got": "I have go",
      "rule": "Present Perfect",
      "tip": "Use 'gone' (past participle) after 'have'..."
    }
  ],
  "feedback": "Good effort! Focus on past participles..."
}
```

### Mastery (`/api/mastery`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/user/{userId}` | JWT | All competences (paginated: `page`, `size`) |
| GET | `/user/{userId}/weaknesses` | JWT | Weak rules below threshold (paginated: `threshold`, `page`, `size`) |
| POST | `/record` | JWT | Record success/failure for a rule |
| POST | `/{competenceId}/exercises` | JWT + AI | Generate 5 exercises for a rule |
| POST | `/{competenceId}/submit-exercises` | JWT | Submit exercise results |
| GET | `/{competenceId}/lessons` | JWT | Related lessons (paginated) |

**Record practice:**
```json
{
  "userId": "uuid",
  "ruleName": "Present Perfect",
  "success": true
}
```

**Exercise response:**
```json
{
  "competence": { "id": "uuid", "ruleName": "Present Perfect", "masteryLevel": 45 },
  "exercises": [
    {
      "question": "She ___ to Paris three times.",
      "options": ["has been", "have been", "was been", "is been"],
      "correctIndex": 0,
      "explanation": "'Has been' is correct because..."
    }
  ],
  "relatedLessons": [
    { "lessonId": "uuid", "topic": "Travel experiences", "level": "B1" }
  ]
}
```

### Challenges (`/api/challenges`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/{id}` | JWT | Get challenge by ID |
| POST | `/writing/generate` | JWT + AI | Generate writing prompt |
| POST | `/writing/submit` | JWT + AI | Submit writing for analysis |
| GET | `/writing/user/{userId}` | JWT | Writing history (paginated) |
| GET | `/writing/user/{userId}/pending` | JWT | Get unfinished writing challenge |
| POST | `/listening/generate` | JWT + AI | Generate listening sentence |
| POST | `/listening/submit` | JWT + AI | Submit listening transcription |
| GET | `/listening/user/{userId}` | JWT | Listening history (paginated) |

**Writing analysis response (parsed from `analysisJson`):**
```json
{
  "score": 78,
  "feedback": "Good use of vocabulary...",
  "errors": [
    {
      "original": "I goed to the store",
      "corrected": "I went to the store",
      "rule": "Past Tense Irregulars",
      "explanation": "'Go' has an irregular past tense..."
    }
  ],
  "grading": {
    "grammar": 70,
    "vocabulary": 85,
    "coherence": 80,
    "spelling": 90,
    "levelAppropriateness": 65
  }
}
```

**Listening analysis response (parsed from `analysisJson`):**
```json
{
  "score": 85,
  "feedback": "Almost perfect! Watch out for...",
  "words": [
    { "expected": "beautiful", "got": "beautifull", "correct": false },
    { "expected": "day", "got": "day", "correct": true }
  ]
}
```

### Progress (`/api/progress`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/user/{userId}/dashboard` | JWT | Full learning stats |
| GET | `/user/{userId}/timeline` | JWT | Practice history (paginated: `days`, `page`, `size`) |
| POST | `/user/{userId}/check-level` | JWT | Check/trigger level promotion |

**Dashboard response:**
```json
{
  "currentLevel": "B1",
  "nextLevel": "B2",
  "eligibleForPromotion": false,
  "averageMastery": 62.5,
  "totalRulesTracked": 24,
  "rulesMastered": 8,
  "rulesWeak": 6,
  "averageAccuracy": 71.3,
  "totalSessions": 42,
  "totalLessons": 15,
  "lessonsCompleted": 11,
  "currentStreak": 5,
  "longestStreak": 12,
  "lastPracticeDate": "2025-01-15",
  "sessionsLast7Days": 7,
  "weakestRules": ["Subjunctive Mood", "Article Usage", "Prepositions"]
}
```

### AI Chat (`/api/ai`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai/chat` | JWT + AI | Send message to AI assistant |

### Public Endpoints

| Path | Description |
|------|-------------|
| `/swagger-ui.html` | Interactive API documentation |
| `/v3/api-docs` | OpenAPI JSON specification |
| `/h2-console` | Database console (dev profile only) |

## Business Rules

### Mastery Scoring

Each grammar rule has an independent mastery level (0-100):

| Event | Change |
|-------|--------|
| Lesson practice — rule correct | +5 |
| Lesson practice — rule with errors | -10 |
| Exercise score >= 80% | +10 |
| Exercise score >= 60% | +5 |
| Exercise score >= 40% | +2 |
| Exercise score < 40% | -5 |

Mastery is clamped between 0 and 100.

### Weak Rule Detection

Rules with mastery below 60% (configurable threshold) are considered weak. These are automatically injected into AI prompts during lesson generation to force reinforcement.

### Level Promotion

Triggered via `POST /api/progress/user/{userId}/check-level`. Requirements:

- Average mastery across all rules >= 75%
- At least 5 rules with mastery >= 80%
- Current level < C2

Progression: A1 → A2 → B1 → B2 → C1 → C2

### Lesson Completion

A lesson is marked as completed when a practice session achieves accuracy >= 80%.

### Speech Coverage

Coverage = `(spoken words matched / total words in text) × 100`. If coverage < 30% but accuracy > 35%, coverage is set to 5% minimum.

### Scoring Weights (Speech Analysis)

| Weight | Category |
|--------|----------|
| 40% | Correctness (grammar, vocabulary, word choice) |
| 25% | Completeness (coverage of original text) |
| 20% | Fluency (natural flow, word order) |
| 15% | Pronunciation (transcription differences) |

### Streak Tracking

- Streak increments when `lastPracticeDate` is yesterday
- Streak resets to 1 when gap > 1 day
- `longestStreak` tracks the all-time record

## Prompt Engineering

### Content Adaptation by CEFR Level

All AI prompts contain level-specific blocks that control output complexity:

| Level | Text Length | Vocabulary | Grammar | Phonetics |
|-------|------------|------------|---------|-----------|
| A1 | 3-5 sentences | Top 100 words | Present simple only | Native alphabet sounds |
| A2 | 5-8 sentences | ~500 words | Present + past simple | Native alphabet sounds |
| B1 | 8-12 sentences | Intermediate | Multiple tenses, connectors | Native alphabet sounds |
| B2 | 12-18 sentences | Upper-intermediate | Conditionals, subjunctive | Native alphabet sounds |
| C1 | 15-25 sentences | Advanced, idiomatic | Complex structures | Native approximation |
| C2 | 20-30 sentences | Literary, rare words | All structures | Native approximation |

### Language Instruction by Level

- **A1-A2**: All explanations and feedback in student's native language
- **B1-B2**: Mix of native and target language
- **C1-C2**: Target language only

### Phonetic Markers

The system generates pronunciation guides using only the student's native language alphabet. IPA symbols are forbidden. Stressed syllables are in UPPERCASE.

Example (native: Portuguese, target: Spanish):
```
Text:    "Yo tengo un hermano."
Phonetic: "iô TENgo un erMAno."
```

### Rule Name Normalization

When generating lessons, the AI is instructed to reuse exact rule names from existing competences. This prevents fragmentation in the mastery graph (e.g., "Present Perfect" vs "present perfect" vs "Present Perfect Tense").

### Exercise Design by Level

| Level | Design |
|-------|--------|
| A1 | Short sentences, basic vocabulary, clearly different options |
| A2 | Everyday contexts, one plausible distractor |
| B1 | Varied contexts, two plausible distractors |
| B2 | Grammar nuances, all options look plausible |
| C1 | Edge cases, formal vs informal, exceptions |
| C2 | Stylistic subtleties, register, rare collocations |

### Challenge Prompts

**Writing** — complexity by level:
- A1: 2-3 simple sentences, max 50 words
- A2: 4-6 sentences, 50-80 words
- B1: 1 paragraph, 80-150 words
- B2: 2 paragraphs, 150-250 words
- C1: 3+ paragraphs, 250-400 words
- C2: Full essay with thesis, 350-500 words

**Listening** — sentence length by level:
- A1: 3-6 words, no contractions
- A2: 6-10 words, basic expanded vocabulary
- B1: 10-16 words, compound sentences
- B2: 15-22 words, complex grammar
- C1: 20-30 words, idiomatic expressions
- C2: 25-40 words, literary/academic register

**Scoring tolerance** — writing/listening analysis:
- A1-A2: Lenient — accept accent/capitalization variations, focus on key words
- B1-B2: Moderate — require article/preposition accuracy
- C1-C2: Strict — near-perfect precision required

## Security

### JWT Configuration

| Setting | Default | Env Variable |
|---------|---------|-------------|
| Secret key | Built-in 256-bit key | `JWT_SECRET` |
| Expiration | 86400000ms (24h) | `JWT_EXPIRATION` |

Token format: `Authorization: Bearer <JWT>`

Claims: `sub` = userId, `email` = user email

### CORS

| Setting | Default | Env Variable |
|---------|---------|-------------|
| Allowed origins | `http://localhost:5173` | `CORS_ALLOWED_ORIGINS` |
| Allowed methods | GET, POST, PUT, DELETE, OPTIONS | — |
| Allowed headers | Authorization, Content-Type, X-AI-Key, X-AI-Provider | — |
| Credentials | true | — |
| Max age | 3600s | — |

### Public Endpoints

Only these endpoints skip JWT authentication:
- `POST /api/users` (registration)
- `POST /api/users/login`
- `/swagger-ui/**`, `/v3/api-docs/**`
- `/h2-console/**` (dev profile only)

### Password Security

BCrypt hashing via Spring Security's `BCryptPasswordEncoder`.

## Error Handling

Centralized `GlobalExceptionHandler` maps exceptions to HTTP responses:

| Exception | Status | Description |
|-----------|--------|-------------|
| ResourceNotFoundException | 404 | Entity not found |
| DuplicateResourceException | 409 | Duplicate email, etc. |
| AIProviderException | 502 | AI service failure |
| InvalidProviderException | 400 | Unknown provider name |
| IllegalArgumentException | 401 | Invalid password |
| MissingRequestHeaderException | 400 | Missing X-AI-Key/Provider |
| MethodArgumentNotValidException | 400 | Validation errors |
| Generic Exception | 500 | Unexpected errors |

Error response format:
```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Lesson not found with id: ...",
  "details": [],
  "timestamp": "2025-01-15T10:30:00"
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_PROFILES_ACTIVE` | `dev` | Profile: `dev` (H2) or `prod` (PostgreSQL) |
| `SERVER_PORT` | `8080` | Server port |
| `JWT_SECRET` | Built-in key | Secret for JWT signing |
| `JWT_EXPIRATION` | `86400000` | Token expiration in ms (24h) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `WHISPER_ENABLED` | `false` | Enable Whisper transcription |
| `WHISPER_URL` | `http://linguist-whisper:9000` | Whisper service URL |
| `DB_URL` | — | PostgreSQL URL (prod) |
| `DB_USERNAME` | — | PostgreSQL username (prod) |
| `DB_PASSWORD` | — | PostgreSQL password (prod) |

### application.yml (base)

```yaml
spring:
  jackson:
    default-property-inclusion: non_null
  servlet:
    multipart:
      max-file-size: 25MB
      max-request-size: 30MB
  jpa:
    open-in-view: false
server:
  port: ${SERVER_PORT:8080}
  address: 0.0.0.0
```

### application-dev.yml

```yaml
spring:
  datasource:
    url: jdbc:h2:file:./data/linguist_db
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: update
  h2:
    console:
      enabled: true
```

### application-prod.yml

```yaml
spring:
  datasource:
    url: ${DB_URL}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
```

## Docker

### Dockerfile (Multi-stage)

```dockerfile
# Build
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests

# Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/core-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Whisper Service (docker-compose.yml)

```yaml
services:
  linguist-whisper:
    image: onerahmet/openai-whisper-asr-webservice:latest
    ports:
      - "9000:9000"
    environment:
      - ASR_MODEL=base
      - ASR_ENGINE=openai_whisper
```

Set `WHISPER_ENABLED=true` and `WHISPER_URL=http://linguist-whisper:9000` to enable server-side transcription.

## Pagination

All list endpoints support pagination via query parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 0 | Page number (zero-indexed) |
| `size` | 10-20 | Items per page (varies by endpoint) |

Response format (Spring `Page<T>`):
```json
{
  "content": [...],
  "totalElements": 42,
  "totalPages": 5,
  "size": 10,
  "number": 0,
  "first": true,
  "last": false,
  "empty": false
}
```

## License

This project is proprietary. All rights reserved.
