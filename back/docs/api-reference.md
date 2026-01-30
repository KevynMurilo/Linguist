# API Reference — Linguist-Core AI

> Base URL: `http://localhost:8080`
> Swagger UI: `http://localhost:8080/swagger-ui.html`

Todos os endpoints retornam JSON. Erros seguem o formato padrão `ErrorResponse`.

---

## 1. Users — `/api/users`

### POST `/api/users` — Criar usuário

```http
POST /api/users
Content-Type: application/json

{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "nativeLanguage": "pt-BR",
  "targetLanguage": "en-US",
  "level": "A1"
}
```

**Response: 201**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Maria Silva",
  "email": "maria@example.com",
  "nativeLanguage": "pt-BR",
  "targetLanguage": "en-US",
  "level": "A1",
  "currentStreak": 0,
  "longestStreak": 0,
  "lastPracticeDate": null,
  "totalPracticeSessions": 0,
  "createdAt": "2024-01-15T10:30:00"
}
```

**Validações:**
- `name`: 2-100 caracteres, obrigatório
- `email`: formato de email válido, max 255, **único**
- `nativeLanguage`: 2-10 caracteres, obrigatório
- `targetLanguage`: 2-10 caracteres, obrigatório
- `level`: obrigatório (A1, A2, B1, B2, C1, C2)

**Erros:** `400` (validação), `409` (email duplicado)

---

### GET `/api/users/{id}` — Buscar por ID

```http
GET /api/users/550e8400-e29b-41d4-a716-446655440000
```

**Response: 200** — `UserResponse`

**Erros:** `404` (não encontrado)

---

### GET `/api/users` — Listar todos

```http
GET /api/users
```

**Response: 200** — `UserResponse[]`

---

### PUT `/api/users/{id}` — Atualizar

```http
PUT /api/users/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "name": "Maria Silva Santos",
  "level": "A2"
}
```

Campos são opcionais — apenas os enviados são atualizados.

**Response: 200** — `UserResponse`

**Erros:** `400`, `404`

---

### DELETE `/api/users/{id}` — Deletar

```http
DELETE /api/users/550e8400-e29b-41d4-a716-446655440000
```

**Response: 204** — Sem corpo. Remove em cascade: lições, competências, sessões.

**Erros:** `404`

---

## 2. Lesson Engine — `/api/lessons`

### POST `/api/lessons/generate` — Gerar lição

```http
POST /api/lessons/generate
Content-Type: application/json
X-AI-Key: AIzaSyxxxxxxxxxxxxxxx
X-AI-Provider: gemini

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "topic": "Morning routines"
}
```

**Response: 201**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "topic": "Morning routines",
  "simplifiedText": "Every morning I wake up at seven. I brush my teeth and eat breakfast.",
  "phoneticMarkers": "wake up → /weɪk ʌp/ (o 'a' soa como 'ei', o 'u' como 'â'). brush → /brʌʃ/ ('sh' soa como 'x' em 'xícara')",
  "teachingNotes": "Nesta lição você vai praticar o Presente Simples. Em inglês, usamos para rotinas...",
  "grammarFocus": ["Presente Simples", "Rotina Diária"],
  "level": "A1",
  "audioSpeedMin": 0.5,
  "audioSpeedMax": 1.5,
  "completed": false,
  "bestScore": 0,
  "timesAttempted": 0,
  "completedAt": null
}
```

**Headers obrigatórios:**
- `X-AI-Key`: API key do provedor
- `X-AI-Provider`: `gemini`, `openai`, `perplexity` ou `deepseek`

**Erros:** `400`, `404` (user), `502` (AI error)

---

### GET `/api/lessons/user/{userId}` — Listar lições

```http
GET /api/lessons/user/550e8400-e29b-41d4-a716-446655440000
```

**Response: 200** — `LessonResponseDTO[]` (ordenado por mais recente)

---

### GET `/api/lessons/{id}` — Buscar lição

```http
GET /api/lessons/660e8400-e29b-41d4-a716-446655440001
```

**Response: 200** — `LessonResponseDTO`

**Erros:** `404`

---

### POST `/api/lessons/analyze-speech` — Analisar fala

```http
POST /api/lessons/analyze-speech
Content-Type: application/json
X-AI-Key: AIzaSyxxxxxxxxxxxxxxx
X-AI-Provider: gemini

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "lessonId": "660e8400-e29b-41d4-a716-446655440001",
  "spokenText": "Every morning I wakes up at seven."
}
```

**Response: 200**
```json
{
  "accuracy": 72,
  "errors": [
    {
      "expected": "wake up",
      "got": "wakes up",
      "rule": "Subject-Verb Agreement",
      "tip": "Com 'I' o verbo fica na forma base: 'wake', não 'wakes'. O 's' no final é só para he/she/it."
    }
  ],
  "feedback": "Bom esforço! Você acertou a maior parte. Lembre que com 'I' o verbo não leva 's' no final."
}
```

**Side-effects (transacional):**
1. Cada erro → -10 mastery na regra violada
2. PracticeSession criada
3. Lesson atualizada (timesAttempted++, bestScore, completed)
4. User streak atualizado

**Erros:** `400`, `404`, `502`

---

### POST `/api/lessons/explain-word` — Explicar palavra

```http
POST /api/lessons/explain-word
Content-Type: application/json
X-AI-Key: AIzaSyxxxxxxxxxxxxxxx
X-AI-Provider: gemini

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "lessonId": "660e8400-e29b-41d4-a716-446655440001",
  "word": "wake up",
  "context": "Every morning I wake up at seven."
}
```

**Response: 200**
```json
{
  "word": "wake up",
  "definition": "Acordar, despertar. Sair do estado de sono.",
  "pronunciation": "/weɪk ʌp/ - 'wake' rima com 'cake', o 'a' soa como 'ei' em português. O 'up' soa como 'âp'.",
  "usage": "Usado para descrever o momento de acordar. É um phrasal verb — 'wake' sozinho também funciona, mas 'wake up' é mais comum na fala do dia a dia.",
  "examples": [
    "I wake up at 7 AM every day. (Eu acordo às 7 da manhã todo dia)",
    "She woke up late yesterday. (Ela acordou tarde ontem)",
    "Don't wake up the baby! (Não acorde o bebê!)"
  ],
  "relatedWords": ["get up", "rise", "awaken"]
}
```

**Validações:**
- `word`: 1-200 caracteres, obrigatório
- `context`: max 1000 caracteres, opcional

**Sem side-effects** — puramente informativo.

**Erros:** `400`, `404`, `502`

---

## 3. Mastery Graph — `/api/mastery`

### GET `/api/mastery/user/{userId}` — Todas as competências

```http
GET /api/mastery/user/550e8400-e29b-41d4-a716-446655440000
```

**Response: 200**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "ruleName": "Present Perfect",
    "masteryLevel": 85,
    "failCount": 2,
    "practiceCount": 20,
    "lastPracticed": "2024-01-15T14:30:00"
  }
]
```

---

### GET `/api/mastery/user/{userId}/weaknesses` — Regras fracas

```http
GET /api/mastery/user/550e8400-e29b-41d4-a716-446655440000/weaknesses?threshold=60
```

**Query params:**
- `threshold` (opcional, default: 60) — mastery abaixo desse valor é considerado "fraco"

**Response: 200** — `CompetenceResponse[]` (filtrado por masteryLevel < threshold)

---

### POST `/api/mastery/record` — Registrar prática manual

```http
POST /api/mastery/record
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "ruleName": "Present Perfect",
  "success": true
}
```

**Response: 200** — `CompetenceResponse` (atualizado)

---

## 4. Progress Tracking — `/api/progress`

### GET `/api/progress/user/{userId}/dashboard` — Dashboard

```http
GET /api/progress/user/550e8400-e29b-41d4-a716-446655440000/dashboard
```

**Response: 200**
```json
{
  "currentLevel": "A2",
  "nextLevel": "B1",
  "eligibleForPromotion": false,
  "averageMastery": 68.5,
  "totalRulesTracked": 12,
  "rulesMastered": 4,
  "rulesWeak": 3,
  "averageAccuracy": 71.2,
  "totalSessions": 25,
  "totalLessons": 10,
  "lessonsCompleted": 6,
  "currentStreak": 5,
  "longestStreak": 12,
  "lastPracticeDate": "2024-01-15",
  "sessionsLast7Days": 8,
  "weakestRules": ["Conditionals", "Phrasal Verbs", "Passive Voice", "Modal Verbs", "Reported Speech"]
}
```

**Erros:** `404` (user)

---

### GET `/api/progress/user/{userId}/timeline` — Timeline

```http
GET /api/progress/user/550e8400-e29b-41d4-a716-446655440000/timeline?days=30
```

**Query params:**
- `days` (opcional, default: 30) — período em dias

**Response: 200**
```json
[
  {
    "sessionId": "880e8400-e29b-41d4-a716-446655440003",
    "lessonId": "660e8400-e29b-41d4-a716-446655440001",
    "lessonTopic": "Morning routines",
    "accuracy": 85,
    "errorCount": 1,
    "feedback": "Bom trabalho! Apenas um pequeno erro...",
    "practicedAt": "2024-01-15T14:30:00"
  }
]
```

---

### POST `/api/progress/user/{userId}/check-level` — Verificar nível

```http
POST /api/progress/user/550e8400-e29b-41d4-a716-446655440000/check-level
```

**Response: 200 (não promovido)**
```json
{
  "previousLevel": "A2",
  "currentLevel": "A2",
  "promoted": false,
  "averageMastery": 68.5,
  "rulesMastered": 4,
  "requiredMastery": 75,
  "requiredRulesMastered": 5,
  "message": "Average mastery is 68.5%. Need 75% for promotion. Focus on weak rules!"
}
```

**Response: 200 (promovido)**
```json
{
  "previousLevel": "A2",
  "currentLevel": "B1",
  "promoted": true,
  "averageMastery": 80.4,
  "rulesMastered": 6,
  "requiredMastery": 75,
  "requiredRulesMastered": 5,
  "message": "Congratulations! Promoted from A2 to B1!"
}
```

**Erros:** `404` (user)

---

## 5. Error Response Format

Todos os erros seguem o mesmo formato:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    "'name' size must be between 2 and 100"
  ],
  "timestamp": "2024-01-15T10:30:00"
}
```

| Status | Causa |
|--------|-------|
| `400` | Validação, header faltando, provider inválido |
| `404` | Recurso não encontrado |
| `409` | Email duplicado |
| `500` | Erro interno |
| `502` | Erro do provider de IA |
