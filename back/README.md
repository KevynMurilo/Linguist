# Linguist-Core AI

Motor avançado de aprendizado de idiomas orquestrado por IA. Diferente de chatbots comuns, o Linguist foca em **Shadowing**, **Connected Speech**, **Mastery Tracking** e um **sistema de ensino adaptativo** que fala na língua do aluno.

## O que é

O Linguist-Core é uma API backend que:

- **Gera lições personalizadas** usando qualquer provedor de IA (Gemini, OpenAI, Perplexity, DeepSeek)
- **Adapta tudo ao nível do aluno** — iniciantes recebem explicações na língua nativa, avançados no idioma alvo
- **Rastreia erros gramaticais** individualmente e força prática nas regras mais fracas
- **Compara fonética** entre o idioma alvo e o idioma nativo do aluno
- **Explica qualquer palavra** com definição, pronúncia, uso e exemplos contextuais
- **Promove automaticamente** o aluno quando ele domina regras suficientes

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | Java 17 |
| Framework | Spring Boot 3.5.10 |
| Banco (dev) | H2 in-memory |
| Banco (prod) | PostgreSQL |
| ORM | Spring Data JPA / Hibernate |
| HTTP Client | Spring WebFlux (WebClient) |
| Documentação | SpringDoc OpenAPI (Swagger UI) |
| Validação | Jakarta Bean Validation |
| Build | Maven |

## Início Rápido

### Pré-requisitos

- Java 17+
- Maven 3.9+
- Uma API key de qualquer provedor suportado (Gemini, OpenAI, Perplexity ou DeepSeek)

### Rodar em modo desenvolvimento (H2)

```bash
# Clone o repositório
git clone <repo-url>
cd core

# Rodar (profile dev é o padrão — usa H2 in-memory)
./mvnw spring-boot:run
```

Acesse:
- **API**: http://localhost:8080/api
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **H2 Console**: http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:mem:linguist_db`, user: `sa`, sem senha)

### Rodar em produção (PostgreSQL)

```bash
export SPRING_PROFILES_ACTIVE=prod
export DB_URL=jdbc:postgresql://localhost:5432/linguist_db
export DB_USERNAME=linguist
export DB_PASSWORD=sua_senha
./mvnw spring-boot:run
```

## Arquitetura

```
com.linguist.core
├── ai/           → Strategy Pattern: 4 provedores de IA (BYOK)
├── config/       → Security, CORS, OpenAPI, WebClient
├── exception/    → Tratamento global de erros
├── lesson/       → Geração de lições, análise de fala, explicação de palavras
├── mastery/      → Grafo de competências (Mastery Graph)
├── progress/     → Dashboard, timeline, progressão de nível
└── user/         → CRUD de usuários com streak tracking
```

**Padrão**: Package-by-Feature — cada pacote contém Entity, Repository, Service, Controller e DTOs.

**Modelo BYOK** (Bring Your Own Key): API keys de IA são enviadas via headers `X-AI-Key` e `X-AI-Provider` a cada requisição. Nenhuma key é armazenada no backend.

## Funcionalidades Principais

### Sistema de Idioma Adaptativo

| Nível | Explicações/Feedback | Texto da Lição | Fonética |
|-------|---------------------|----------------|----------|
| A1-A2 | Língua nativa do aluno | Idioma alvo (simples) | Comparativa com a língua nativa |
| B1-B2 | Mix nativa + alvo | Idioma alvo (moderado) | Comparativa com a língua nativa |
| C1-C2 | Idioma alvo | Idioma alvo (complexo) | IPA com dicas no idioma alvo |

### Mastery Graph

Cada regra gramatical é rastreada individualmente por usuário:
- Acerto: **+5** mastery (cap 100)
- Erro: **-10** mastery (floor 0)
- Regras fracas (< 60%) são **injetadas no prompt da IA** para forçar prática

### Progressão Automática de Nível

```
A1 → A2 → B1 → B2 → C1 → C2
```

Requisitos para subir: mastery médio >= 75% e >= 5 regras com mastery >= 80%.

### Explicação Contextual de Palavras

O aluno pode clicar em qualquer palavra de uma lição e receber:
- Definição na língua adequada ao seu nível
- Pronúncia comparativa (IPA + sons da língua nativa)
- Como e quando usar
- 3 frases de exemplo
- Palavras relacionadas/sinônimos

## Endpoints

| Módulo | Base | Endpoints |
|--------|------|-----------|
| Users | `/api/users` | CRUD completo (POST, GET, PUT, DELETE) |
| Lessons | `/api/lessons` | generate, analyze-speech, explain-word, findByUser, findById |
| Mastery | `/api/mastery` | competences, weaknesses, record |
| Progress | `/api/progress` | dashboard, timeline, check-level |

Documentação completa: **Swagger UI** em `/swagger-ui.html` ou [`docs/api-reference.md`](docs/api-reference.md).

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [`docs/architecture.md`](docs/architecture.md) | Arquitetura detalhada, diagramas, padrões de projeto |
| [`docs/api-reference.md`](docs/api-reference.md) | Referência completa de todos os endpoints |
| [`docs/business-rules.md`](docs/business-rules.md) | Regras de negócio, thresholds, fórmulas |
| [`docs/setup-guide.md`](docs/setup-guide.md) | Guia de setup para dev e prod |
| [`docs/front.md`](docs/front.md) | Guia completo de integração frontend |

## Estrutura do Projeto

```
core/
├── docs/                          # Documentação
│   ├── front.md                   # Guia de integração frontend
│   ├── architecture.md            # Arquitetura do sistema
│   ├── api-reference.md           # Referência de API
│   ├── business-rules.md          # Regras de negócio
│   └── setup-guide.md             # Guia de setup
├── src/main/java/com/linguist/core/
│   ├── ai/                        # 8 arquivos — Strategy Pattern
│   ├── config/                    # 4 arquivos — Configs
│   ├── exception/                 # 6 arquivos — Error handling
│   ├── lesson/                    # 4 + 6 DTOs — Lesson Engine
│   ├── mastery/                   # 6 + 2 DTOs — Mastery Graph
│   ├── progress/                  # 2 + 3 DTOs — Progress Tracking
│   └── user/                      # 5 + 3 DTOs — User Management
├── src/main/resources/
│   ├── application.yml            # Config base
│   ├── application-dev.yml        # H2 (padrão)
│   └── application-prod.yml       # PostgreSQL
└── pom.xml
```

## Licença

Este projeto é proprietário. Todos os direitos reservados.
