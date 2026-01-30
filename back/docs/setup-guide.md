# Guia de Setup — Linguist-Core AI

## Pre-requisitos

| Ferramenta | Versao Minima | Obrigatorio |
|-----------|--------------|-------------|
| Java (JDK) | 17+ | Sim |
| Maven | 3.9+ | Sim (ou use o Maven Wrapper incluso) |
| PostgreSQL | 14+ | Apenas producao |
| Git | Qualquer | Recomendado |

## Desenvolvimento (H2)

### 1. Clonar e rodar

```bash
git clone <repo-url>
cd core

# Usando Maven Wrapper (recomendado)
./mvnw spring-boot:run

# Ou usando Maven instalado
mvn spring-boot:run
```

O profile `dev` e o padrao — nenhuma configuracao necessaria.

### 2. Verificar

| Servico | URL |
|---------|-----|
| API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| H2 Console | http://localhost:8080/h2-console |

### 3. Acessar H2 Console

1. Abra http://localhost:8080/h2-console
2. Configure:
   - JDBC URL: `jdbc:h2:mem:linguist_db`
   - User: `sa`
   - Password: (vazio)
3. Clique em "Connect"

### 4. Configuracao do Dev

O arquivo `application-dev.yml` configura:

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:linguist_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    username: sa
    password:
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop    # Recria o schema a cada restart
    show-sql: true             # Loga todas as queries SQL
  h2:
    console:
      enabled: true
      path: /h2-console
```

**Nota**: O banco H2 e **in-memory** — todos os dados sao perdidos ao reiniciar a aplicacao. Isso e intencional para desenvolvimento.

---

## Producao (PostgreSQL)

### 1. Criar o banco

```sql
CREATE DATABASE linguist_db;
CREATE USER linguist WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE linguist_db TO linguist;
```

### 2. Configurar variaveis de ambiente

```bash
export SPRING_PROFILES_ACTIVE=prod
export DB_URL=jdbc:postgresql://localhost:5432/linguist_db
export DB_USERNAME=linguist
export DB_PASSWORD=sua_senha_segura
export SERVER_PORT=8080
```

### 3. Rodar

```bash
./mvnw spring-boot:run
```

Ou gerar o JAR e rodar:

```bash
./mvnw clean package -DskipTests
java -jar target/core-0.0.1-SNAPSHOT.jar
```

### 4. Configuracao do Prod

O arquivo `application-prod.yml` configura:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/linguist_db}
    username: ${DB_USERNAME:linguist}
    password: ${DB_PASSWORD:linguist}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate    # NAO altera o schema — exige migrations
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
```

**Importante**: Em producao, `ddl-auto: validate` — o Hibernate apenas valida se o schema bate com as entidades. Voce precisa criar as tabelas antes (via Flyway, Liquibase ou script SQL manual).

### 5. Schema SQL (para criar manualmente)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    native_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    level VARCHAR(10) NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_practice_date DATE,
    total_practice_sessions BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    simplified_text TEXT NOT NULL,
    phonetic_markers TEXT,
    teaching_notes TEXT,
    level VARCHAR(10) NOT NULL,
    audio_speed_min DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    audio_speed_max DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    best_score INTEGER NOT NULL DEFAULT 0,
    times_attempted INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE lesson_grammar_focus (
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    grammar_rule VARCHAR(255)
);

CREATE TABLE competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    mastery_level INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    practice_count INTEGER NOT NULL DEFAULT 0,
    last_practiced TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    UNIQUE (user_id, rule_name)
);

CREATE TABLE practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    accuracy INTEGER NOT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    errors_json TEXT,
    feedback TEXT,
    practice_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_practice_sessions_user_date ON practice_sessions(user_id, practice_date);
```

---

## Configuracoes Opcionais

### CORS

Por padrao, as origens permitidas sao `http://localhost:4200` e `http://localhost:3000`.

Para alterar em producao:

```bash
export cors.allowed-origins=https://meuapp.com,https://www.meuapp.com
```

Ou no `application-prod.yml`:

```yaml
cors:
  allowed-origins: https://meuapp.com,https://www.meuapp.com
```

### Porta do Servidor

```bash
export SERVER_PORT=9090
```

### Spring Profiles

| Profile | Banco | DDL | SQL Logs | H2 Console |
|---------|-------|-----|----------|------------|
| `dev` (padrao) | H2 in-memory | create-drop | Sim | Sim |
| `prod` | PostgreSQL | validate | Nao | Nao |

Para ativar um profile:

```bash
# Via variavel de ambiente
export SPRING_PROFILES_ACTIVE=prod

# Via argumento JVM
java -jar core.jar --spring.profiles.active=prod

# Via Maven
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

---

## Testando a API

### 1. Criar um usuario

```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria",
    "email": "maria@test.com",
    "nativeLanguage": "pt-BR",
    "targetLanguage": "en-US",
    "level": "A1"
  }'
```

### 2. Gerar uma licao (requer API key)

```bash
curl -X POST http://localhost:8080/api/lessons/generate \
  -H "Content-Type: application/json" \
  -H "X-AI-Key: SUA_API_KEY_AQUI" \
  -H "X-AI-Provider: gemini" \
  -d '{
    "userId": "ID_DO_USUARIO",
    "topic": "Morning routines"
  }'
```

### 3. Analisar fala

```bash
curl -X POST http://localhost:8080/api/lessons/analyze-speech \
  -H "Content-Type: application/json" \
  -H "X-AI-Key: SUA_API_KEY_AQUI" \
  -H "X-AI-Provider: gemini" \
  -d '{
    "userId": "ID_DO_USUARIO",
    "lessonId": "ID_DA_LICAO",
    "spokenText": "Every morning I wakes up at seven."
  }'
```

### 4. Explicar uma palavra

```bash
curl -X POST http://localhost:8080/api/lessons/explain-word \
  -H "Content-Type: application/json" \
  -H "X-AI-Key: SUA_API_KEY_AQUI" \
  -H "X-AI-Provider: gemini" \
  -d '{
    "userId": "ID_DO_USUARIO",
    "lessonId": "ID_DA_LICAO",
    "word": "wake up",
    "context": "Every morning I wake up at seven."
  }'
```

### 5. Ver dashboard

```bash
curl http://localhost:8080/api/progress/user/ID_DO_USUARIO/dashboard
```

---

## Estrutura de Arquivos

```
core/
├── docs/                              # Documentacao
│   ├── front.md                       # Guia de integracao frontend
│   ├── architecture.md                # Arquitetura do sistema
│   ├── api-reference.md               # Referencia de API
│   ├── business-rules.md              # Regras de negocio
│   └── setup-guide.md                 # Este arquivo
├── src/
│   └── main/
│       ├── java/com/linguist/core/    # Codigo-fonte
│       └── resources/
│           ├── application.yml        # Config base
│           ├── application-dev.yml    # H2 (padrao)
│           └── application-prod.yml   # PostgreSQL
├── pom.xml                            # Dependencias Maven
└── README.md                          # Visao geral do projeto
```
