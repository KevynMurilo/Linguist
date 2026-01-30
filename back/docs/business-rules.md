# Regras de Negocio — Linguist-Core AI

## 1. Sistema de Idioma Adaptativo

O sistema adapta automaticamente o idioma das explicacoes, feedback e notas de ensino com base no nivel do aluno.

### Regra de Idioma por Nivel

| Nivel | Texto da Licao (`simplifiedText`) | Explicacoes / Feedback / Teaching Notes | Fonetica (`phoneticMarkers`) | Labels de Gramatica (`grammarFocus`) |
|-------|-----------------------------------|----------------------------------------|------------------------------|--------------------------------------|
| **A1** | Idioma alvo (vocabulario basico, frases curtas) | **Lingua nativa** do aluno | Comparativa com lingua nativa | **Lingua nativa** (ex: "Presente Simples") |
| **A2** | Idioma alvo (vocabulario basico-intermediario) | **Lingua nativa** do aluno | Comparativa com lingua nativa | **Lingua nativa** |
| **B1** | Idioma alvo (complexidade moderada) | **Mix** lingua nativa + idioma alvo | Comparativa com lingua nativa | **Mix** |
| **B2** | Idioma alvo (complexidade moderada-alta) | **Mix** (nativa so para conceitos dificeis) | Comparativa com lingua nativa | **Mix** |
| **C1** | Idioma alvo (complexo, idiomatico) | **Idioma alvo** | IPA + explicacoes no idioma alvo | **Idioma alvo** |
| **C2** | Idioma alvo (nativo-like, expressoes avancadas) | **Idioma alvo** | IPA + dicas avancadas no idioma alvo | **Idioma alvo** |

### Transicao Automatica

Quando o aluno sobe de nivel (via `check-level`), as proximas licoes e feedbacks automaticamente mudam:

- **A2 → B1**: Explicacoes passam de lingua nativa pura para mix
- **B2 → C1**: Tudo passa para o idioma alvo

Isso cria um **plano de ensino gradual**: o aluno comeca entendendo tudo na sua lingua, e progressivamente o sistema "solta" para o idioma alvo.

## 2. Fonetica Comparativa

Os marcadores foneticos sempre comparam sons do idioma alvo com sons que o aluno ja conhece na sua lingua nativa.

### Formato

Para cada palavra ou padrao de connected speech:
1. Palavra/frase no idioma alvo
2. Transcricao IPA
3. Comparacao com sons da lingua nativa

### Foco

- Sons que **nao existem** na lingua nativa do aluno
- Connected speech: linking, elision, assimilation
- Explicacao na lingua nativa (A1-A2), mix (B1-B2) ou idioma alvo (C1-C2)

### Exemplo (pt-BR → en-US)

```
think → /θɪŋk/ (coloque a lingua entre os dentes, som parecido com "f" em portugues)
world → /wɜːrld/ (o "r" e suave, nao vibre como em portugues)
wake up → /weɪk ʌp/ (connected speech: o "k" de wake liga no "u" de up)
```

## 3. Explicacao Contextual de Palavras

### Comportamento

- O aluno clica em qualquer palavra do `simplifiedText`
- O frontend envia `word` + `context` (frase onde aparece) + `lessonId`
- A IA retorna explicacao completa adaptada ao nivel

### Conteudo da Resposta

| Campo | Descricao | Adaptado ao nivel? |
|-------|-----------|--------------------|
| `definition` | Significado claro | Sim — na lingua do nivel |
| `pronunciation` | IPA + comparacao com lingua nativa | Sim |
| `usage` | Quando e como usar | Sim |
| `examples` | 3 frases de exemplo | Sim — com traducao para A1-B1 |
| `relatedWords` | Sinonimos ou expressoes relacionadas | Sim |

### Regras

- **Sem side-effects**: nao altera mastery, streak ou historico
- O `context` (frase) e opcional mas melhora a qualidade da explicacao
- O `lessonId` e obrigatorio — da contexto do tema e nivel

## 4. Mastery Graph

### Escala

| Propriedade | Valor |
|-------------|-------|
| Minimo | 0 |
| Maximo | 100 |
| Valor inicial | 0 (criado automaticamente no primeiro erro) |

### Atualizacao

| Evento | Efeito |
|--------|--------|
| Acerto (success = true) | `masteryLevel += 5` (cap em 100) |
| Erro (success = false) | `masteryLevel -= 10` (floor em 0) |

A assimetria e intencional: erros pesam mais que acertos. Isso forca o aluno a dominar realmente a regra.

### Faixas

| Faixa | masteryLevel | Significado |
|-------|-------------|-------------|
| Critico | 0-29 | Precisa de atencao urgente |
| Fraco | 30-49 | Sabe algo mas erra muito |
| Progredindo | 50-69 | Melhorando, ainda instavel |
| Bom | 70-89 | Domina na maioria dos casos |
| Dominado | 90-100 | Totalmente internalizado |

### Injecao no Prompt da IA

Regras com `masteryLevel < 60` sao automaticamente injetadas no prompt de geracao de licao:

```
CRITICAL: The student has LOW mastery in these rules: [lista].
You MUST incorporate at least 2-3 of these rules into the lesson text.
```

Isso forca a pratica das regras fracas sem que o aluno precise escolher.

### Unicidade

Cada `(user_id, rule_name)` e unico. Se a IA detecta um erro na regra "Present Perfect" e a Competence ja existe, ela e atualizada. Se nao existe, e criada com masteryLevel = 0 e imediatamente sofre -10 (ficando em 0).

## 5. Licoes

### Geracao

| Propriedade | Regra |
|-------------|-------|
| `simplifiedText` | Sempre no idioma alvo, complexidade adaptada ao nivel |
| `phoneticMarkers` | Comparativo com lingua nativa (sempre) |
| `teachingNotes` | Lingua adaptada ao nivel (nativa → mix → alvo) |
| `grammarFocus` | Labels na lingua do nivel |
| `completed` | Inicia como `false` |
| `bestScore` | Inicia como `0` |
| `timesAttempted` | Inicia como `0` |

### Completacao

| Regra | Valor |
|-------|-------|
| Lissao marcada como "completada" | `accuracy >= 80` em qualquer tentativa |
| Uma vez completada | **Nunca volta** para "nao completada" |
| `bestScore` | `max(bestScore, accuracy)` a cada tentativa |
| `timesAttempted` | Incrementa a cada `analyze-speech` |
| `completedAt` | Timestamp da primeira vez que `accuracy >= 80` |

### Velocidade de Audio

| Propriedade | Valor |
|-------------|-------|
| `audioSpeedMin` | 0.5x |
| `audioSpeedMax` | 1.5x |

O frontend deve oferecer um slider entre esses valores para controle de velocidade do TTS.

## 6. Analise de Fala

### Side-effects Transacionais

Cada chamada a `analyze-speech` dispara 4 operacoes atomicas:

1. **Mastery**: Para cada erro com `rule` nao-vazio → `competenceService.recordPractice(userId, rule, false)` → -10 mastery
2. **Sessao**: Cria `PracticeSession` com accuracy, errorCount, errorsJson, feedback
3. **Licao**: `lesson.recordAttempt(accuracy)` → timesAttempted++, bestScore, completed
4. **Streak**: `user.updateStreak(today)` → currentStreak, longestStreak, totalPracticeSessions

### Tip por Erro

Cada erro retornado inclui um campo `tip` com uma explicacao curta na lingua adequada ao nivel do aluno. Isso permite que o frontend exiba feedback instantaneo por erro.

## 7. Streak

### Logica de Calculo

```
se nunca praticou (lastPracticeDate == null):
    currentStreak = 1

se ja praticou HOJE (lastPracticeDate == today):
    nenhuma mudanca (evita duplicacao)

se praticou ONTEM (lastPracticeDate == yesterday):
    currentStreak++

se pulou 1+ dia(s):
    currentStreak = 1 (reset)

se currentStreak > longestStreak:
    longestStreak = currentStreak

lastPracticeDate = today
totalPracticeSessions++
```

### Regras

| Regra | Descricao |
|-------|-----------|
| Gatilho | Chamada a `analyze-speech` |
| Multiplas sessoes no dia | Contam como 1 dia de streak |
| Pular um dia | Reset para 1 |
| Recorde | `longestStreak` nunca diminui |
| `totalPracticeSessions` | Sempre incrementa (mesmo repetindo no dia) |

## 8. Progressao de Nivel

### Sequencia

```
A1 → A2 → B1 → B2 → C1 → C2
```

### Requisitos para Promocao

| Requisito | Valor | Descricao |
|-----------|-------|-----------|
| Mastery medio | >= 75% | Media de todos os masteryLevel do usuario |
| Regras dominadas | >= 5 | Quantidade de regras com masteryLevel >= 80 |
| Regras rastreadas | >= 5 | Precisa ter pelo menos 5 Competences |
| Nivel maximo | C2 | Nao sobe alem |

### Mensagens de Retorno

| Cenario | `promoted` | `message` |
|---------|-----------|-----------|
| Ja e C2 | `false` | "Already at maximum level (C2)..." |
| < 5 regras rastreadas | `false` | "Need at least 5 tracked rules..." |
| Mastery media < 75% | `false` | "Average mastery is X%..." |
| < 5 regras com >= 80% | `false` | "Mastered X rules. Need at least 5..." |
| **Promovido** | `true` | "Congratulations! Promoted from X to Y!" |

### Efeito da Promocao

- `user.level` e atualizado no banco
- Proximas licoes geradas serao no **novo nivel**
- Explicacoes mudam de idioma conforme a regra de idioma adaptativo
- Direcao: **so sobe** — nunca desce automaticamente

## 9. Usuarios

### Email Unico

- Email e `UNIQUE` no banco
- Tentativa de criar com email duplicado retorna `409 Conflict`
- Mensagem: "User with email X already exists"

### Cascade Delete

Deletar um usuario remove automaticamente:
- Todas as licoes
- Todas as competencias (mastery graph)
- Todas as sessoes de pratica
- Todas as entradas de grammar_focus (join table)

### Atualizacao Parcial

PUT aceita campos opcionais. Apenas os campos enviados sao atualizados:
- `name`: atualiza se enviado
- `targetLanguage`: atualiza se enviado
- `level`: atualiza se enviado

## 10. Provedores de IA

### Providers Suportados

| Provider | Header Value | Modelo | Metodo de Auth |
|----------|-------------|--------|----------------|
| Google Gemini | `gemini` | gemini-1.5-pro | `?key=` (query param) |
| OpenAI | `openai` | gpt-4o-mini | `Bearer` (header) |
| Perplexity | `perplexity` | sonar | `Bearer` (header) |
| DeepSeek | `deepseek` | deepseek-chat | `Bearer` (header) |

### BYOK (Bring Your Own Key)

- Keys sao recebidas via header `X-AI-Key` a cada request
- **Nunca armazenadas** no backend
- O frontend deve guardar em `localStorage` ou `sessionStorage`
- Se a key for invalida, o provider retorna erro e o backend repassa como `502`

### Adicionar Novo Provider

1. Criar classe que implementa `AIClient`
2. Adicionar valor ao enum `AIProvider`
3. Anotar com `@Component`
4. O `AIClientFactory` detecta automaticamente via Spring DI
