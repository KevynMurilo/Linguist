# Linguist-Core: Guia Completo de Integração Frontend

> Base URL: `http://localhost:8080/api`
> Swagger UI: `http://localhost:8080/swagger-ui.html`
> H2 Console (dev): `http://localhost:8080/h2-console`

---

## 1. Fluxo Completo do Usuário

### Jornada Resumida

```
Cadastro → Configura IA (BYOK) → Escolhe Tema → Recebe Lição
    → Lê Teaching Notes (na língua nativa!) → Pratica Shadowing
    → Clica em palavra com dúvida → Recebe explicação contextual
    → Fala → Análise de Fala (feedback na língua nativa!)
    → Erros Rastreados → Mastery atualizado → Dashboard
    → Sobe de Nível → Explicações migram para idioma alvo → Repete
```

### Jornada Detalhada

1. **Cadastro**: O usuário cria uma conta informando nome, email, idioma nativo, idioma alvo e nível atual (A1-C2).
2. **Configuração da IA**: O usuário fornece sua própria API key (BYOK) e escolhe o provider (Gemini, OpenAI, Perplexity ou DeepSeek). Essas informações **não são salvas no backend** — são enviadas via header a cada requisição.
3. **Geração de Lição**: O usuário digita qualquer tema (o sistema é universal). O backend consulta o Mastery Graph para descobrir regras gramaticais fracas e injeta no prompt da IA, forçando a prática direcionada.
4. **Plano de Ensino Adaptativo**: A lição vem com `teachingNotes` — explicações gramaticais **na língua nativa** do aluno (A1-A2), mistas (B1-B2) ou no idioma alvo (C1-C2). O aluno lê as notas ANTES de praticar.
5. **Fonética Comparativa**: Os `phoneticMarkers` comparam sons do idioma alvo com sons que o aluno JÁ CONHECE no seu idioma nativo. Ex para pt-BR→en: "think → /θɪŋk/ (coloque a língua entre os dentes, som parecido com 'f')".
6. **Dúvida em Palavra Específica**: O frontend permite **clicar em qualquer palavra** da lição. Isso aciona o endpoint `explain-word` que retorna: definição, pronúncia comparativa, uso, 3 exemplos e palavras relacionadas — tudo na língua apropriada ao nível.
7. **Prática de Shadowing**: O usuário ouve e repete. O frontend captura o áudio via speech-to-text.
8. **Análise de Fala**: O texto falado é enviado ao backend. Retorna accuracy (0-100), erros com regra gramatical violada + **dica explicativa na língua do aluno**, e feedback geral.
9. **Atualização Automática**: Cada erro reduz mastery da regra (-10). Sessão registrada no histórico. Streak atualizado. Lição marca "completada" se accuracy >= 80.
10. **Dashboard**: O usuário vê seu progresso completo.
11. **Progressão de Nível**: Quando atinge os requisitos, sobe de nível. **As explicações automaticamente migram** — de língua nativa para mista, de mista para idioma alvo.

---

## 2. Sistema de Idioma Adaptativo

### Como funciona por nível

| Nível | simplifiedText | teachingNotes | phoneticMarkers | feedback/tips | grammarFocus labels |
|-------|---------------|---------------|-----------------|---------------|-------------------|
| **A1-A2** | Idioma alvo (simples) | Língua nativa | Comparativo c/ língua nativa | Língua nativa | Língua nativa |
| **B1-B2** | Idioma alvo (moderado) | Mix nativa + alvo | Comparativo c/ língua nativa | Mix nativa + alvo | Mix |
| **C1-C2** | Idioma alvo (complexo) | Idioma alvo | IPA + explicação no alvo | Idioma alvo | Idioma alvo |

### Exemplo prático (pt-BR → en-US, nível A1)

```json
{
  "simplifiedText": "Every morning I wake up at seven. I brush my teeth and eat breakfast.",
  "phoneticMarkers": "wake up → /weɪk ʌp/ (o 'a' soa como 'ei' em português, o 'u' soa como 'â'). brush → /brʌʃ/ (o 'sh' soa como 'x' em 'xícara'). teeth → /tiːθ/ (o 'th' não existe em português: coloque a língua entre os dentes e sopre)",
  "grammarFocus": ["Presente Simples", "Rotina Diária"],
  "teachingNotes": "Nesta lição você vai praticar o Presente Simples (Simple Present). Em inglês, usamos o presente simples para falar de rotinas e hábitos. Regra: para 'I/you/we/they', o verbo fica na forma base (wake, brush, eat). Para 'he/she/it', adicionamos -s ou -es (wakes, brushes, eats). Exemplos: 'I wake up' (eu acordo), 'She wakes up' (ela acorda)."
}
```

### Exemplo prático (pt-BR → en-US, nível C1)

```json
{
  "simplifiedText": "Despite having been forewarned about the treacherous conditions, the expedition pressed on, driven by an unwavering determination to chart the uncharted.",
  "phoneticMarkers": "forewarned → /fɔːrˈwɔːrnd/ (stress on second syllable, the 'r' is soft). treacherous → /ˈtretʃ.ər.əs/ (the 'ch' is like 'tch', schwa sound in final syllables). unwavering → /ʌnˈweɪ.vər.ɪŋ/ (stress pattern: un-WAY-ver-ing)",
  "grammarFocus": ["Past Perfect Passive", "Participial Phrases", "Complex Sentence Structure"],
  "teachingNotes": "This lesson features advanced participial phrases ('having been forewarned') which combine passive voice with perfect aspect. Notice how 'driven by' acts as a reduced relative clause — the full form would be 'which was driven by'. The juxtaposition of 'chart the uncharted' is a rhetorical device called antanaclasis."
}
```

---

## 3. Autenticação e Headers

O sistema atualmente **não possui autenticação de usuário** (todos os endpoints `/api/**` são públicos). A identificação é feita via `userId` (UUID) nos requests.

### Headers Obrigatórios para Endpoints de IA

| Header | Tipo | Obrigatório em | Exemplo |
|--------|------|----------------|---------|
| `X-AI-Provider` | string | `/lessons/generate`, `/lessons/analyze-speech`, `/lessons/explain-word` | `gemini` |
| `X-AI-Key` | string | `/lessons/generate`, `/lessons/analyze-speech`, `/lessons/explain-word` | `AIzaSy...` |
| `Content-Type` | string | Todos os POST/PUT | `application/json` |

### Providers Suportados

| Provider | Valor do Header | Modelo Usado |
|----------|----------------|--------------|
| Google Gemini | `gemini` | gemini-1.5-pro |
| OpenAI | `openai` | gpt-4o-mini |
| Perplexity | `perplexity` | sonar |
| DeepSeek | `deepseek` | deepseek-chat |

> O frontend deve armazenar a key **localmente** (localStorage/sessionStorage). Nunca enviar para outro lugar além dos três endpoints de IA.

---

## 4. Models / Interfaces TypeScript

### Enums

```typescript
type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

type AIProvider = 'gemini' | 'openai' | 'perplexity' | 'deepseek';
```

### User

```typescript
// POST /api/users
interface CreateUserRequest {
  name: string;          // 2-100 chars
  email: string;         // email válido, max 255, único
  nativeLanguage: string; // 2-10 chars (ex: "pt-BR")
  targetLanguage: string; // 2-10 chars (ex: "en-US")
  level: LanguageLevel;
}

// PUT /api/users/{id}
interface UpdateUserRequest {
  name?: string;           // 2-100 chars (opcional)
  targetLanguage?: string; // 2-10 chars (opcional)
  level?: LanguageLevel;   // opcional
}

// Resposta de todos os endpoints de user
interface UserResponse {
  id: string;               // UUID
  name: string;
  email: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: LanguageLevel;
  currentStreak: number;    // dias consecutivos praticando
  longestStreak: number;    // recorde de streak
  lastPracticeDate: string | null; // "2024-01-15" (LocalDate) ou null
  totalPracticeSessions: number;
  createdAt: string;        // "2024-01-15T10:30:00" (ISO 8601)
}
```

### Lesson

```typescript
// POST /api/lessons/generate (+ headers X-AI-Key, X-AI-Provider)
interface LessonRequestDTO {
  userId: string;  // UUID
  topic: string;   // 3-500 chars — qualquer tema, o sistema é universal
}

// Resposta de generate, findById, findByUser
interface LessonResponseDTO {
  id: string;
  topic: string;
  simplifiedText: string;      // texto no idioma alvo, adaptado ao nível
  phoneticMarkers: string;     // guia fonético COMPARATIVO com a língua nativa
  teachingNotes: string;       // explicações gramaticais na língua apropriada ao nível
  grammarFocus: string[];      // regras na língua do aluno (A1-A2) ou idioma alvo (C1-C2)
  level: LanguageLevel;
  audioSpeedMin: number;       // 0.5
  audioSpeedMax: number;       // 1.5
  completed: boolean;          // true quando accuracy >= 80
  bestScore: number;           // melhor accuracy entre todas as tentativas
  timesAttempted: number;      // quantas vezes praticou esta lição
  completedAt: string | null;  // quando completou pela primeira vez
}
```

### Speech Analysis

```typescript
// POST /api/lessons/analyze-speech (+ headers X-AI-Key, X-AI-Provider)
interface SpeechAnalysisRequest {
  userId: string;    // UUID
  lessonId: string;  // UUID
  spokenText: string; // max 10000 chars — texto capturado via speech-to-text
}

interface SpeechAnalysisResponse {
  accuracy: number;        // 0-100
  errors: SpeechError[];
  feedback: string;        // feedback na língua apropriada ao nível do aluno
}

interface SpeechError {
  expected: string;  // "I have gone"
  got: string;       // "I have go"
  rule: string;      // "Present Perfect" (ou "Presente Perfeito" para A1-A2 pt-BR)
  tip: string;       // explicação curta na língua do aluno
}
```

### Explain Word (NOVO)

```typescript
// POST /api/lessons/explain-word (+ headers X-AI-Key, X-AI-Provider)
interface ExplainWordRequest {
  userId: string;    // UUID
  lessonId: string;  // UUID — contexto da lição
  word: string;      // 1-200 chars — a palavra ou frase clicada
  context?: string;  // max 1000 chars — a frase onde a palavra aparece (opcional)
}

interface ExplainWordResponse {
  word: string;           // a palavra explicada
  definition: string;     // significado na língua apropriada ao nível
  pronunciation: string;  // IPA + comparação com sons da língua nativa
  usage: string;          // quando e como usar
  examples: string[];     // 3 frases exemplo (com tradução para A1-B1)
  relatedWords: string[]; // sinônimos ou expressões relacionadas
}
```

### Mastery Graph

```typescript
// Resposta de GET /api/mastery/user/{userId} e /weaknesses
interface CompetenceResponse {
  id: string;
  ruleName: string;              // na língua do nível do aluno
  masteryLevel: number;          // 0-100
  failCount: number;
  practiceCount: number;
  lastPracticed: string | null;  // ISO 8601
}

// POST /api/mastery/record
interface RecordPracticeRequest {
  userId: string;
  ruleName: string; // 2-100 chars
  success: boolean; // true = +5 mastery, false = -10 mastery
}
```

### Progress

```typescript
// GET /api/progress/user/{userId}/dashboard
interface DashboardResponse {
  currentLevel: LanguageLevel;
  nextLevel: LanguageLevel | null;  // null se já for C2
  eligibleForPromotion: boolean;
  averageMastery: number;           // 0-100 (2 casas decimais)
  totalRulesTracked: number;
  rulesMastered: number;            // mastery >= 80
  rulesWeak: number;                // mastery < 50
  averageAccuracy: number;          // 0-100 (2 casas decimais)
  totalSessions: number;
  totalLessons: number;
  lessonsCompleted: number;         // accuracy >= 80
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  sessionsLast7Days: number;
  weakestRules: string[];           // top 5 regras mais fracas
}

// GET /api/progress/user/{userId}/timeline?days=30
interface TimelineEntry {
  sessionId: string;
  lessonId: string;
  lessonTopic: string;
  accuracy: number;      // 0-100
  errorCount: number;
  feedback: string;
  practicedAt: string;   // ISO 8601
}

// POST /api/progress/user/{userId}/check-level
interface LevelCheckResponse {
  previousLevel: LanguageLevel;
  currentLevel: LanguageLevel;
  promoted: boolean;
  averageMastery: number;
  rulesMastered: number;
  requiredMastery: number;          // 75
  requiredRulesMastered: number;    // 5
  message: string;                  // mensagem legível sobre o resultado
}
```

### Error Response (padrão para todos os erros)

```typescript
interface ErrorResponse {
  status: number;          // 400, 404, 409, 500, 502
  error: string;           // "Bad Request", "Not Found", etc.
  message: string;         // mensagem descritiva
  details: string[] | null; // detalhes de validação por campo
  timestamp: string;       // "2024-01-15T10:30:00"
}
```

---

## 5. Endpoints — Referência Completa

### 5.1 Users (`/api/users`)

| Método | Rota | Descrição | Body | Headers AI | Response |
|--------|------|-----------|------|-----------|----------|
| `POST` | `/api/users` | Criar usuário | `CreateUserRequest` | Não | `201` `UserResponse` |
| `GET` | `/api/users/{id}` | Buscar por ID | — | Não | `200` `UserResponse` |
| `GET` | `/api/users` | Listar todos | — | Não | `200` `UserResponse[]` |
| `PUT` | `/api/users/{id}` | Atualizar | `UpdateUserRequest` | Não | `200` `UserResponse` |
| `DELETE` | `/api/users/{id}` | Deletar (cascade) | — | Não | `204` vazio |

**Erros possíveis:**
- `400` — Validação falhou (name vazio, email inválido, etc.)
- `404` — Usuário não encontrado
- `409` — Email já existe

**Regras:**
- Email é **único**. Tentar criar com email duplicado retorna 409.
- DELETE remove **tudo**: lições, competências, sessões de prática.
- Campos do PUT são opcionais — só o que for enviado é atualizado.

---

### 5.2 Lesson Engine (`/api/lessons`)

| Método | Rota | Descrição | Body | Headers AI | Response |
|--------|------|-----------|------|-----------|----------|
| `POST` | `/api/lessons/generate` | Gerar lição via IA | `LessonRequestDTO` | **Sim** | `201` `LessonResponseDTO` |
| `GET` | `/api/lessons/user/{userId}` | Listar lições do usuário | — | Não | `200` `LessonResponseDTO[]` |
| `GET` | `/api/lessons/{id}` | Buscar lição por ID | — | Não | `200` `LessonResponseDTO` |
| `POST` | `/api/lessons/analyze-speech` | Analisar fala (Shadowing) | `SpeechAnalysisRequest` | **Sim** | `200` `SpeechAnalysisResponse` |
| `POST` | `/api/lessons/explain-word` | Explicar palavra/frase | `ExplainWordRequest` | **Sim** | `200` `ExplainWordResponse` |

**Erros possíveis:**
- `400` — Validação / header faltando / provider inválido
- `404` — Usuário ou lição não encontrada
- `502` — Erro na API do provider de IA (key inválida, rate limit, etc.)

**Regras de Negócio — Generate:**
1. O backend busca as regras fracas do usuário (mastery < 60).
2. Injeta no prompt da IA: "CRITICAL: The student has WEAK mastery in: [regras]. You MUST incorporate these rules."
3. O prompt inclui o perfil do aluno (nível, língua nativa, língua alvo) para adaptar TUDO.
4. A IA retorna JSON com `simplifiedText`, `phoneticMarkers`, `grammarFocus`, `teachingNotes`.
5. A lição é salva com `completed=false`, `bestScore=0`, `timesAttempted=0`.

**Regras de Negócio — Analyze Speech:**

Esse endpoint dispara **4 efeitos colaterais transacionais**:

```
analyze-speech
  │
  ├─ 1. MASTERY: cada erro → CompetenceService.recordFailure(regra)
  │     → -10 mastery na regra violada (floor 0)
  │     → cria a Competence se não existir
  │
  ├─ 2. HISTÓRICO: cria PracticeSession(accuracy, errorCount, errorsJson, feedback)
  │
  ├─ 3. LIÇÃO: lesson.recordAttempt(accuracy)
  │     → timesAttempted++, bestScore = max(bestScore, accuracy)
  │     → se accuracy >= 80 e !completed → completed = true
  │
  └─ 4. STREAK: user.updateStreak(hoje)
        → streak++, longestStreak, totalPracticeSessions++
```

**Regras de Negócio — Explain Word:**
1. O frontend envia a palavra clicada + a frase onde ela aparece (context).
2. A IA explica na língua adequada ao nível do aluno.
3. Retorna definição, pronúncia comparativa, uso, exemplos e palavras relacionadas.
4. Para A1-B1: exemplos incluem tradução na língua nativa.
5. Este endpoint **não altera** mastery, streak ou histórico — é puramente informativo.

---

### 5.3 Mastery Graph (`/api/mastery`)

| Método | Rota | Descrição | Body | Headers AI | Response |
|--------|------|-----------|------|-----------|----------|
| `GET` | `/api/mastery/user/{userId}` | Todas as competências | — | Não | `200` `CompetenceResponse[]` |
| `GET` | `/api/mastery/user/{userId}/weaknesses?threshold=60` | Regras fracas | — | Não | `200` `CompetenceResponse[]` |
| `POST` | `/api/mastery/record` | Registrar prática manual | `RecordPracticeRequest` | Não | `200` `CompetenceResponse` |

**Regras de Mastery:**

| Evento | Efeito no masteryLevel |
|--------|----------------------|
| Sucesso | +5 (cap 100) |
| Falha | -10 (floor 0) |

**Faixas de Mastery para o frontend exibir:**

| Faixa | masteryLevel | Cor sugerida | Label |
|-------|-------------|-------------|-------|
| Crítico | 0-29 | Vermelho | Needs Work |
| Fraco | 30-49 | Laranja | Weak |
| Progredindo | 50-69 | Amarelo | Progressing |
| Bom | 70-89 | Azul | Good |
| Dominado | 90-100 | Verde | Mastered |

---

### 5.4 Progress Tracking (`/api/progress`)

| Método | Rota | Descrição | Body | Headers AI | Response |
|--------|------|-----------|------|-----------|----------|
| `GET` | `/api/progress/user/{userId}/dashboard` | Dashboard completo | — | Não | `200` `DashboardResponse` |
| `GET` | `/api/progress/user/{userId}/timeline?days=30` | Timeline de práticas | — | Não | `200` `TimelineEntry[]` |
| `POST` | `/api/progress/user/{userId}/check-level` | Verificar/subir nível | — | Não | `200` `LevelCheckResponse` |

**Regras de Progressão de Nível:**

| Requisito | Valor |
|-----------|-------|
| Mastery médio mínimo | >= 75% |
| Regras com mastery >= 80% | >= 5 |
| Nível máximo | C2 (não sobe além) |

**Sequência de níveis:** `A1 → A2 → B1 → B2 → C1 → C2`

**IMPORTANTE**: Quando o aluno sobe de nível, as próximas lições e feedbacks automaticamente mudam de idioma:
- Subiu de A2 → B1? Explicações passam de língua nativa pura para MIX.
- Subiu de B2 → C1? Tudo passa para o idioma alvo.

---

## 6. Tratamento de Erros

### Formato padrão de erro

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    "'name' size must be between 2 and 100",
    "'email' must be a well-formed email address"
  ],
  "timestamp": "2024-01-15T10:30:00"
}
```

### Mapeamento de HTTP Status

| Status | Causa | Quando |
|--------|-------|--------|
| `400` | Validação / Header faltando / Provider inválido | Campos obrigatórios vazios, formato errado, `X-AI-Provider` inválido |
| `404` | Recurso não encontrado | UUID de user/lesson/competence inexistente |
| `409` | Conflito (duplicata) | Email já cadastrado |
| `502` | Erro do provider de IA | Key inválida, rate limit, API fora, resposta mal-formada |
| `500` | Erro interno inesperado | Bugs, falhas de infraestrutura |

---

## 7. Fluxos de Tela — Passo a Passo

### Tela 1: Cadastro

```
[Formulário de Cadastro]
├── Nome (text, 2-100 chars)
├── Email (email, único)
├── Idioma Nativo (select: pt-BR, es-ES, fr-FR, etc.)
├── Idioma Alvo (select: en-US, es-ES, fr-FR, etc.)
├── Nível Atual (select: A1, A2, B1, B2, C1, C2)
└── [Cadastrar] → POST /api/users → salvar userId no state
```

### Tela 2: Configuração da IA (BYOK)

```
[Configuração de IA]
├── Provider (select: Gemini, OpenAI, Perplexity, DeepSeek)
├── API Key (password input)
└── [Salvar localmente] → salvar em localStorage
```

### Tela 3: Dashboard Principal

```
GET /api/progress/user/{userId}/dashboard

[Dashboard]
├── Nível Atual: B1                    ← dashboard.currentLevel
├── Streak: 5 dias                     ← dashboard.currentStreak
├── Recorde: 12 dias                   ← dashboard.longestStreak
│
├── [Card: Mastery]
│   ├── Média: 72.5%                   ← dashboard.averageMastery
│   ├── Regras Dominadas: 8/15         ← dashboard.rulesMastered / totalRulesTracked
│   └── Regras Fracas: 2               ← dashboard.rulesWeak
│
├── [Card: Prática]
│   ├── Sessões Totais: 42             ← dashboard.totalSessions
│   ├── Accuracy Média: 78.3%          ← dashboard.averageAccuracy
│   ├── Últimos 7 dias: 8 sessões      ← dashboard.sessionsLast7Days
│   └── Lições: 15/20 completas        ← dashboard.lessonsCompleted / totalLessons
│
├── [Card: Progressão]
│   ├── Próximo Nível: B2              ← dashboard.nextLevel
│   ├── Elegível? Não                  ← dashboard.eligibleForPromotion
│   └── [Verificar Nível] → POST /check-level
│
├── [Card: Regras mais Fracas]
│   └── Lista das 5 piores             ← dashboard.weakestRules[]
│
└── [Gerar Nova Lição] → navegar para Tela 4
```

### Tela 4: Geração de Lição

```
[Input de Tema]
├── Tema (text, 3-500 chars): "Morning routines"
└── [Gerar] → POST /api/lessons/generate
              Headers: X-AI-Key, X-AI-Provider

[Lição Gerada] (LessonResponseDTO)
├── Tema: "Morning routines"              ← lesson.topic
│
├── [Card: Notas de Ensino]               ← lesson.teachingNotes
│   "Nesta lição você vai praticar o Presente Simples..."
│   (NA LÍNGUA NATIVA para A1-A2!)
│
├── Texto para Shadowing:                 ← lesson.simplifiedText
│   "Every morning I wake up at seven..."
│   ⚡ CADA PALAVRA É CLICÁVEL! → POST /api/lessons/explain-word
│
├── Marcadores Fonéticos:                 ← lesson.phoneticMarkers
│   "wake up → /weɪk ʌp/ (o 'a' soa como 'ei' em português)"
│   (COMPARATIVO com a língua nativa!)
│
├── Foco Gramatical:                      ← lesson.grammarFocus[]
│   [Presente Simples] [Advérbios de Frequência]
│   (NA LÍNGUA NATIVA para A1-A2!)
│
├── Velocidade: [0.5x ----●---- 1.5x]
├── Status: Não completada                ← lesson.completed
├── Tentativas: 0                         ← lesson.timesAttempted
└── [Iniciar Shadowing] → navegar para Tela 5
```

### Tela 5: Prática de Shadowing + Explicação de Palavras

```
[Player de Áudio]
├── Texto exibido com palavras clicáveis
├── Controle de velocidade (0.5x - 1.5x)
├── [Play] [Pause] [Repeat]
│
[Clique em Palavra] → POST /api/lessons/explain-word
├── Palavra: "wake up"
├── Definição: "Acordar, levantar da cama"     ← response.definition
├── Pronúncia: "/weɪk ʌp/ - 'ei' como em      ← response.pronunciation
│   'lei', o 'u' soa como 'â'"
├── Uso: "Usado para descrever o ato de..."    ← response.usage
├── Exemplos:                                   ← response.examples[]
│   - "I wake up early every day" (Eu acordo cedo todo dia)
│   - "She woke up late yesterday" (Ela acordou tarde ontem)
│   - "Don't wake up the baby!" (Não acorde o bebê!)
├── Relacionadas: ["get up", "rise"]            ← response.relatedWords
└── [Fechar]

[Gravação]
├── [Gravar] → speech-to-text → spokenText
├── Texto capturado: "Every morning I wakes up..."
└── [Enviar para Análise] → POST /api/lessons/analyze-speech

[Resultado] (SpeechAnalysisResponse)
├── Accuracy: 72%
│   [████████████░░░░░░░░] 72/100
│
├── Erros Encontrados:                 ← response.errors[]
│   ├── "wake up" → você disse "wakes up"
│   │     Regra: Presente Simples
│   │     Dica: "Com 'I' o verbo fica na forma base: 'wake', não 'wakes'"
│   │                                  ← error.tip (na língua do aluno!)
│
├── Feedback da IA:                    ← response.feedback
│   "Bom esforço! Lembre que com 'I' o verbo..."
│   (NA LÍNGUA NATIVA para A1-A2!)
│
├── [Tentar Novamente]
├── [Próxima Lição]
└── [Ver Dashboard]
```

### Tela 6: Mastery Graph

```
GET /api/mastery/user/{userId}

[Grafo Visual de Competências]
├── Presente Perfeito    ████████████████████░ 85%  Mastered
├── Verbos Modais        ████████████████░░░░░ 72%  Good
├── Voz Passiva          ██████████████░░░░░░░ 65%  Progressing
├── Condicionais         ██████████░░░░░░░░░░░ 45%  Weak
└── Phrasal Verbs        ████░░░░░░░░░░░░░░░░░ 20%  Needs Work
```

### Tela 7: Timeline de Práticas

```
GET /api/progress/user/{userId}/timeline?days=30

[Timeline]
├── Hoje
│   ├── 14:30 — "Space exploration"     Accuracy: 85%
│   └── 10:15 — "Daily routines"        Accuracy: 72%
│
├── Ontem
│   └── 16:00 — "Cooking recipes"       Accuracy: 91%
│
└── [Carregar mais] → aumentar days param
```

---

## 8. Regras de Negócio — Referência Rápida

### Idioma Adaptativo

| Regra | Valor |
|-------|-------|
| A1-A2: explicações | Língua nativa |
| B1-B2: explicações | Mix nativa + alvo |
| C1-C2: explicações | Idioma alvo |
| simplifiedText | Sempre no idioma alvo |
| Fonética | Sempre comparativa com a língua nativa |

### Mastery

| Regra | Valor |
|-------|-------|
| Acerto | +5 mastery |
| Erro | -10 mastery |
| Mínimo | 0 |
| Máximo | 100 |
| "Fraco" (injetado no prompt da IA) | < 60 |
| "Dominado" | >= 80 |
| "Precisa atenção" (dashboard) | < 50 |

### Lição

| Regra | Valor |
|-------|-------|
| Lição "completada" | accuracy >= 80 |
| Velocidade mín Shadowing | 0.5x |
| Velocidade máx Shadowing | 1.5x |
| Uma vez completada | Não volta para "não completada" |

### Progressão

| Regra | Valor |
|-------|-------|
| Mastery média para subir | >= 75% |
| Regras dominadas (>=80%) para subir | >= 5 |
| Nível máximo | C2 |
| Sequência | A1 → A2 → B1 → B2 → C1 → C2 |
| Direção | Só sobe (nunca desce automaticamente) |

### Streak

| Cenário | Resultado |
|---------|-----------|
| Primeira prática | streak = 1 |
| Praticou hoje de novo | Sem mudança |
| Praticou no dia seguinte | streak++ |
| Pulou 1+ dia(s) | streak = 1 (reset) |

---

## 9. O que Recarregar Após Cada Ação

| Ação do Usuário | Endpoints para Recarregar |
|----------------|--------------------------|
| Cadastro | Salvar `userId` no state |
| Gerar lição | Exibir `LessonResponseDTO` retornado (inclui teachingNotes!) |
| Clicar em palavra | Exibir `ExplainWordResponse` em modal/tooltip |
| Analisar fala | `GET /dashboard`, `GET /mastery/user/{userId}`, `GET /timeline` |
| Registrar prática manual | `GET /mastery/user/{userId}` |
| Verificar nível | `GET /users/{id}`, `GET /dashboard` |
| Deletar usuário | Limpar state, redirecionar para cadastro |

---

## 10. CORS e Ambiente

### Desenvolvimento

| Configuração | Valor |
|-------------|-------|
| CORS origins | `http://localhost:4200`, `http://localhost:3000` |
| Banco | H2 in-memory (auto-reset no restart) |
| H2 Console | `http://localhost:8080/h2-console` |
| DDL | `create-drop` |
| Profile ativo | `dev` (padrão) |

### Produção

| Configuração | Valor |
|-------------|-------|
| CORS origins | Configurável via `cors.allowed-origins` |
| Banco | PostgreSQL |
| DDL | `validate` |
| Profile ativo | `SPRING_PROFILES_ACTIVE=prod` |

---

## 11. Checklist de Integração

- [ ] **Auth**: Armazenar `userId` no state global após cadastro
- [ ] **BYOK**: Armazenar `X-AI-Key` e `X-AI-Provider` no localStorage
- [ ] **Headers**: Enviar headers de IA nos 3 endpoints: `generate`, `analyze-speech`, `explain-word`
- [ ] **Teaching Notes**: Exibir `teachingNotes` em destaque ANTES do texto de shadowing
- [ ] **Palavras Clicáveis**: Cada palavra do `simplifiedText` deve ser clicável → `explain-word`
- [ ] **Tooltip/Modal**: Exibir `ExplainWordResponse` em tooltip ou modal ao clicar
- [ ] **Fonética Comparativa**: Exibir `phoneticMarkers` com destaque visual
- [ ] **Tip em Erros**: Exibir `error.tip` junto com cada erro na análise de fala
- [ ] **Speech-to-Text**: Integrar Web Speech API para capturar `spokenText`
- [ ] **Refresh após análise**: Recarregar dashboard + mastery graph + timeline
- [ ] **Refresh após check-level**: Recarregar user profile + dashboard se `promoted === true`
- [ ] **Streak visual**: Mostrar streak com destaque (cor, ícone, etc.)
- [ ] **Mastery bars**: Barras coloridas por faixa (0-29 vermelho → 90-100 verde)
- [ ] **Lesson status**: Diferenciar visualmente lições completadas vs pendentes
- [ ] **Level badge**: Mostrar nível atual com destaque
- [ ] **Timeline**: Paginação por `days` param
- [ ] **Offline-safe keys**: Nunca enviar API key para outro endpoint que não os 3 de IA
