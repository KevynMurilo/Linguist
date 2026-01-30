
# Linguist-Core: The Master Backend Blueprint

## 1. Visão Geral e Identidade

O **Linguist-Core** não é um aplicativo de idiomas comum; é um **Orquestrador de IA** focado em **Shadowing** e **Repetição Espaçada**. Ele transforma qualquer tema de interesse do usuário (escolhido por ele) em uma esteira de treino técnico e fonético.

## 2. Tech Stack e Arquitetura (Strict Rules)

* **Linguagem:** Java 17+ e Spring Boot 3.x.
* **Arquitetura:** **Package by Feature**. Cada funcionalidade é autossuficiente.
* `com.linguist.user` (Perfil e Preferências)
* `com.linguist.ai` (Adaptadores Multi-IA)
* `com.linguist.lesson` (Geração e Lógica de Estudo)
* `com.linguist.mastery` (Grafo de Conhecimento e Histórico)


* **Qualidade de Código:** SOLID, DRY e Clean Code.
* **Proibido:** Entidades JPA em Controllers. Use **DTOs** para Request e Response.
* **Proibido:** Comentários óbvios.
* **Obrigatório:** **Swagger/OpenAPI** detalhado em todos os endpoints.
* **Obrigatório:** Tratamento global de exceções.



---

## 3. Módulos de Domínio e Fluxo de Dados

### A. AI Adapter (BYOK - Bring Your Own Key)

O sistema deve aceitar chaves (Gemini, OpenAI, Perplexity, DeepSeek) via **Header** (`X-AI-Key` e `X-AI-Provider`).

* **Interface `AIClient`:** Define os contratos para geração de conteúdo e análise de fala.
* **Implementações:** Cada IA deve ter sua classe concreta isolada.

### B. Lesson Engine (O Gerador)

O fluxo de criação de uma aula segue esta lógica:

1. **Input:** O usuário fornece um tema ou link.
2. **Context Enrichment:** O backend consulta o `Mastery Graph` do usuário. Se o usuário tem falhas em "Present Perfect", ele injeta no prompt da IA a obrigação de usar essa regra no texto gerado.
3. **Output Estruturado:** O retorno deve ser um JSON (via DTO) contendo:
* `simplifiedText`: Texto adaptado ao nível atual (A1-C2).
* `phoneticMarkers`: Mapeamento de **Connected Speech** (ex: "get up" -> "/ɡɛ tʌp/").
* `grammarFocus`: Lista de regras gramaticais chaves presentes na lição.



### C. Mastery Graph (O Cérebro)

Rastreia a evolução do usuário em cada regra gramatical.

* **Entidade `Competence`:** Armazena `ruleName`, `masteryLevel` (0-100) e `userId`.
* **Lógica:** Após cada prática de Shadowing, o resultado da análise da IA volta para o backend. Se o usuário falhou, o `masteryLevel` cai. O sistema é um **Grammar Nazi**: não aceita erros de conjugação ou auxiliares.

---

## 4. Regras de Negócio Inegociáveis

1. **Shadowing Support:** O backend deve fornecer metadados para o frontend controlar a velocidade do áudio (0.5x a 1.5x) e destacar junções de palavras.
2. **Multitenancy:** Todo dado (`Lesson`, `Competence`, `History`) é estritamente vinculado ao `userId`.
3. **Stateless AI:** O backend atua como um Proxy inteligente. Ele não deve armazenar as chaves de API permanentemente, apenas utilizá-las para processar a requisição atual.

---

## 5. Exemplo de Contrato Swagger (Controller de Lição)

```java
@Operation(summary = "Gera uma lição personalizada", description = "Consome a IA escolhida para criar um texto baseado no tema e no histórico de erros do usuário.")
@ApiResponse(responseCode = "200", description = "Lição gerada com sucesso")
@PostMapping("/generate")
public ResponseEntity<LessonResponseDTO> generate(@RequestBody LessonRequestDTO request, 
                                                 @RequestHeader("X-AI-Key") String apiKey) {
    // Implementação seguindo DTO -> Service -> AIProvider -> DTO
}

```


