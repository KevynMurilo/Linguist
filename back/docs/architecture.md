# Arquitetura — Linguist-Core AI

## Visão Geral

O Linguist-Core segue a arquitetura **Package-by-Feature** com um motor de IA plugável via **Strategy Pattern**. Cada feature é um pacote isolado contendo Entity, Repository, Service, Controller e DTOs.

```
                    ┌─────────────┐
                    │   Frontend   │
                    └──────┬──────┘
                           │ HTTP/REST
                    ┌──────▼──────┐
                    │ Controllers  │  ← DTOs only (nunca expõe entidades)
                    │ (REST API)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Services    │  ← Lógica de negócio
                    └──┬───┬───┬──┘
                       │   │   │
              ┌────────┘   │   └────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │   JPA    │ │    AI    │ │  Other   │
        │  Repos   │ │  Client  │ │ Services │
        └────┬─────┘ │ Factory  │ └──────────┘
             │       └────┬─────┘
             ▼            │
        ┌──────────┐      │    ┌─────────────────┐
        │ Database │      ├───→│  GeminiClient    │
        │ H2/Postgres│    ├───→│  OpenAIClient    │
        └──────────┘      ├───→│  PerplexityClient│
                          └───→│  DeepSeekClient  │
                               └─────────────────┘
                                     │ HTTP
                               ┌─────▼─────┐
                               │ External   │
                               │ AI APIs    │
                               └───────────┘
```

## Pacotes

### `ai/` — Motor de IA (Strategy Pattern)

```
ai/
├── AIClient.java            ← Interface (Strategy)
├── AIProvider.java           ← Enum: GEMINI, OPENAI, PERPLEXITY, DEEPSEEK
├── AIClientFactory.java      ← Factory: resolve AIClient por nome do provider
├── BaseAIClient.java         ← Classe abstrata com WebClient HTTP
├── GeminiClient.java         ← Google Gemini (gemini-1.5-pro)
├── OpenAIClient.java         ← OpenAI (gpt-4o-mini)
├── PerplexityClient.java     ← Perplexity (sonar)
└── DeepSeekClient.java       ← DeepSeek (deepseek-chat)
```

**Como funciona:**

1. `AIClient` define 3 operações: `generateContent`, `analyzeSpeech`, `explainWord`
2. Cada provider implementa a interface com formato de request/response específico
3. `AIClientFactory` usa Spring DI para coletar todas as implementações e mapear por `AIProvider`
4. O caller (LessonService) pede `factory.getClient("gemini")` e recebe o client correto
5. **Toda inteligência de prompt** vive no `LessonService`, não nos clients

```java
// Factory resolve o client
AIClient client = aiClientFactory.getClient(providerName);
// Service constrói os prompts com contexto do aluno
String systemPrompt = buildGenerateSystemPrompt(user, weakRules);
// Client apenas envia e parseia o formato do provider
String response = client.generateContent(systemPrompt, userPrompt, apiKey);
```

**Modelo BYOK**: A API key chega via header `X-AI-Key` e é passada diretamente ao provider. O backend nunca armazena keys.

### `user/` — Gestão de Usuários

```
user/
├── User.java                ← JPA Entity (users table)
├── LanguageLevel.java        ← Enum: A1, A2, B1, B2, C1, C2
├── UserRepository.java       ← Spring Data JPA
├── UserService.java          ← CRUD + validação de email duplicado
├── UserController.java       ← REST /api/users
└── dto/
    ├── CreateUserRequest.java
    ├── UpdateUserRequest.java
    └── UserResponse.java
```

**User** é a entidade raiz. Possui:
- Dados de perfil (name, email, nativeLanguage, targetLanguage, level)
- Streak tracking (currentStreak, longestStreak, lastPracticeDate, totalPracticeSessions)
- Cascade ALL para Lesson, Competence e PracticeSession (delete cascade)

### `lesson/` — Motor de Lições

```
lesson/
├── Lesson.java              ← JPA Entity (lessons table)
├── LessonRepository.java
├── LessonService.java        ← CORE: prompts, parsing, side-effects
├── LessonController.java     ← REST /api/lessons
└── dto/
    ├── LessonRequestDTO.java
    ├── LessonResponseDTO.java
    ├── SpeechAnalysisRequest.java
    ├── SpeechAnalysisResponse.java
    ├── ExplainWordRequest.java
    └── ExplainWordResponse.java
```

**LessonService** é o coração do sistema. Responsabilidades:

1. **Construção de prompts adaptativos** — monta o system prompt com:
   - Perfil do aluno (nível, línguas)
   - Instrução de idioma (nativo/mix/alvo baseado no nível)
   - Instrução de fonética comparativa
   - Regras gramaticais fracas (injeção forçada)

2. **Geração de lições** (`generate`) — chama a IA e parseia o JSON

3. **Análise de fala** (`analyzeSpeech`) — 4 side-effects transacionais:
   - Mastery update (cada erro = -10 na regra)
   - PracticeSession criada
   - Lesson.recordAttempt (bestScore, completed)
   - User.updateStreak

4. **Explicação de palavras** (`explainWord`) — consulta contextual, sem side-effects

### `mastery/` — Grafo de Competências

```
mastery/
├── Competence.java           ← JPA Entity (competences table)
├── CompetenceRepository.java
├── CompetenceService.java    ← recordPractice, getWeakRuleNames
├── CompetenceController.java ← REST /api/mastery
├── PracticeSession.java      ← JPA Entity (practice_sessions table)
├── PracticeSessionRepository.java
└── dto/
    ├── CompetenceResponse.java
    └── RecordPracticeRequest.java
```

**Competence** rastreia uma regra gramatical por usuário. Unique constraint: `(user_id, rule_name)`.
- `recordSuccess()`: +5 mastery (cap 100)
- `recordFailure()`: -10 mastery (floor 0)

**PracticeSession** registra cada tentativa individual com accuracy, errors, feedback.

### `progress/` — Dashboard e Progressão

```
progress/
├── ProgressService.java      ← Agregação de stats + auto-promoção
├── ProgressController.java   ← REST /api/progress
└── dto/
    ├── DashboardResponse.java
    ├── TimelineEntry.java
    └── LevelCheckResponse.java
```

**ProgressService** agrega dados de todos os módulos para o dashboard e implementa a lógica de auto-promoção de nível.

### `config/` — Configurações

```
config/
├── SecurityConfig.java       ← Spring Security (stateless, CSRF off, H2 console)
├── CorsConfig.java           ← CORS configurável por propriedade
├── OpenApiConfig.java        ← Swagger/OpenAPI metadata
└── WebClientConfig.java      ← WebClient bean (2MB buffer)
```

### `exception/` — Tratamento de Erros

```
exception/
├── GlobalExceptionHandler.java     ← @RestControllerAdvice
├── ErrorResponse.java              ← DTO padrão de erro
├── ResourceNotFoundException.java  ← 404
├── DuplicateResourceException.java ← 409
├── AIProviderException.java        ← 502
└── InvalidProviderException.java   ← 400
```

Todos os erros seguem o mesmo formato `ErrorResponse` com status, error, message, details[] e timestamp.

## Modelo de Dados

### Diagrama ER

```
┌─────────────────────┐
│       users          │
├─────────────────────┤
│ id (UUID, PK)        │
│ name                 │
│ email (UNIQUE)       │
│ native_language      │
│ target_language      │
│ level (ENUM)         │
│ current_streak       │
│ longest_streak       │
│ last_practice_date   │
│ total_practice_sessions│
│ created_at           │
│ updated_at           │
└───────┬─────┬───┬───┘
        │     │   │
        │     │   │  1:N
        ▼     │   ▼
┌──────────┐  │  ┌───────────────────┐
│  lessons  │  │  │  competences       │
├──────────┤  │  ├───────────────────┤
│ id (PK)   │  │  │ id (PK)            │
│ user_id(FK)│  │  │ user_id (FK)       │
│ topic      │  │  │ rule_name          │
│ simplified_│  │  │ mastery_level(0-100)│
│   text     │  │  │ fail_count         │
│ phonetic_  │  │  │ practice_count     │
│   markers  │  │  │ last_practiced     │
│ teaching_  │  │  │ created_at         │
│   notes    │  │  └───────────────────┘
│ level      │  │  UNIQUE(user_id, rule_name)
│ completed  │  │
│ best_score │  │
│ times_     │  │  1:N
│  attempted │  ▼
│ created_at │  ┌───────────────────────┐
└──────┬─────┘  │  practice_sessions     │
       │        ├───────────────────────┤
       │ 1:N    │ id (PK)               │
       │        │ user_id (FK)           │
       ▼        │ lesson_id (FK)         │
┌────────────┐  │ accuracy (0-100)       │
│ lesson_    │  │ error_count            │
│ grammar_   │  │ errors_json (TEXT)     │
│ focus      │  │ feedback (TEXT)        │
│ (join table)│  │ practice_date          │
├────────────┤  │ created_at             │
│ lesson_id  │  └───────────────────────┘
│ grammar_   │  INDEX(user_id, practice_date)
│   rule     │
└────────────┘
```

### Cascade e Orphan Removal

```
User
├── lessons        → CASCADE ALL, orphanRemoval = true
├── competences    → CASCADE ALL, orphanRemoval = true
└── practiceSessions → CASCADE ALL, orphanRemoval = true
```

Deletar um User remove automaticamente todos os dados associados.

## Fluxo de Dados

### Geração de Lição

```
Frontend                    LessonController         LessonService           AIClient
   │                             │                        │                     │
   │ POST /lessons/generate      │                        │                     │
   │ + X-AI-Key, X-AI-Provider   │                        │                     │
   │ + {userId, topic}           │                        │                     │
   │────────────────────────────►│                        │                     │
   │                             │  generate(userId,...)  │                     │
   │                             │───────────────────────►│                     │
   │                             │                        │ findById(userId)    │
   │                             │                        │ getWeakRuleNames()  │
   │                             │                        │                     │
   │                             │                        │ buildSystemPrompt() │
   │                             │                        │  ├─ languageInstruction (based on level)
   │                             │                        │  ├─ phoneticInstruction (native comparison)
   │                             │                        │  └─ weakRules injection
   │                             │                        │                     │
   │                             │                        │ generateContent()   │
   │                             │                        │────────────────────►│
   │                             │                        │                     │──► External AI API
   │                             │                        │     JSON response   │◄──
   │                             │                        │◄────────────────────│
   │                             │                        │                     │
   │                             │                        │ parseAndSave()      │
   │                             │                        │ toDTO()             │
   │                             │◄───────────────────────│                     │
   │  201 LessonResponseDTO      │                        │                     │
   │◄────────────────────────────│                        │                     │
```

### Análise de Fala (4 side-effects)

```
Frontend → POST /lessons/analyze-speech
    │
    ▼
LessonService.analyzeSpeech()
    │
    ├─ 1. AI: client.analyzeSpeech(systemPrompt, userPrompt, apiKey)
    │       → Retorna {accuracy, errors[], feedback}
    │
    ├─ 2. MASTERY: para cada erro com rule
    │       → competenceService.recordPractice(userId, rule, false)
    │       → -10 mastery na regra (cria Competence se não existir)
    │
    ├─ 3. SESSION: practiceSessionRepository.save(...)
    │       → Registro permanente da tentativa
    │
    ├─ 4. LESSON: lesson.recordAttempt(accuracy)
    │       → timesAttempted++
    │       → bestScore = max(bestScore, accuracy)
    │       → completed = true se accuracy >= 80
    │
    └─ 5. STREAK: user.updateStreak(today)
           → currentStreak++, longestStreak, totalPracticeSessions++
```

## Decisões Técnicas

| Decisão | Justificativa |
|---------|--------------|
| Package-by-Feature | Coesão alta, cada feature é independente |
| Strategy Pattern (AI) | Novos providers adicionados sem alterar código existente |
| BYOK (Bring Your Own Key) | Privacidade: backend nunca armazena keys de IA |
| DTOs em Controllers | Segurança: entidades JPA nunca são expostas |
| Prompt intelligence no Service | Clients são "burros" — só formatam HTTP. A lógica vive no LessonService |
| Adaptive Language System | A1-A2 em língua nativa reduz barreira de entrada para iniciantes |
| Comparative Phonetics | Alunos aprendem sons novos a partir dos que já conhecem |
| Cascade ALL + orphanRemoval | Integridade referencial: deletar User limpa tudo |
| Spring Profiles | Dev (H2) e Prod (PostgreSQL) com zero mudança de código |
| open-in-view: false | Performance: evita lazy loading acidental em views |
