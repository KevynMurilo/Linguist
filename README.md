# 🎓 Linguist AI - Prática de Idiomas Inteligente

O **Linguist** é uma plataforma desenhada para quem quer destravar o inglês através da prática real. O projeto resolve o maior problema dos estudantes de idiomas: **com quem eu vou praticar a fala agora?**

## 🌟 O que o projeto faz?

O sistema funciona como um ecossistema de aprendizado dinâmico:

* **🎙️ Laboratório de Shadowing:** O coração do app. Você escolhe um texto, ouve a pronúncia ideal e grava a sua versão. A inteligência artificial analisa sua fala e te dá uma nota de precisão na hora.
* **🤖 Tutor Particular (Assistant):** Um chat inteligente que fica disponível em todas as telas. Ficou na dúvida sobre uma gíria ou regra gramatical? É só abrir o bot no canto da tela e perguntar.
* **📝 Gerador de Lições Infinitas:** Você não fica preso a um livro. Quer aprender inglês falando sobre "Entrevistas de TI" ou "Viagens Espaciais"? O sistema cria a lição do zero, adaptada exatamente ao seu nível atual.
* **📈 Mapa de Evolução:** O sistema mapeia quais regras gramaticais você está dominando e quais ainda tropeça, criando um histórico real do seu progresso.

---

## 🏗️ Estrutura de Execução

O projeto foi totalmente modularizado para rodar em ambientes isolados via containers. Na raiz do projeto, você encontrará o arquivo mestre de orquestração: o **`docker-compose.yml`**.

Ele gerencia dois serviços principais:

1. **Linguist API:** O cérebro que processa as regras de negócio e integra com os modelos de IA.
2. **Linguist Web:** A interface visual otimizada para Desktop e Mobile.

---

## 🚀 Como Rodar

Para ter o Linguist funcionando na sua máquina, você só precisa ter o **Docker** instalado.

### 1. Preparação

Crie o arquivo `docker-compose.yml` na raiz da sua pasta:

```yaml
version: '3.8'

services:
  linguist-api:
    image: kevynmurilo/linguist-api:latest
    container_name: linguist-api
    ports:
      - "8080:8080"
    restart: unless-stopped

  linguist-front:
    image: kevynmurilo/linguist-front:latest
    container_name: linguist-front
    ports:
      - "8081:80"
    depends_on:
      - linguist-api
    restart: unless-stopped

networks:
  default:
    name: linguist-network

```

### 2. Comando de Inicialização

No terminal, dentro da pasta do arquivo, digite:

```bash
docker-compose up -d

```

### 3. Acesso

Após o comando finalizar, o sistema estará disponível em:

* **Interface do Usuário:** [http://localhost:8081](https://www.google.com/search?q=http://localhost:8081)
* **Documentação da API (Swagger):** [http://localhost:8080/swagger-ui.html](https://www.google.com/search?q=http://localhost:8080/swagger-ui.html)

---

## 🛠️ Configuração de Uso

Ao acessar o sistema pela primeira vez, basta configurar sua **AI Key** (Gemini, OpenAI, Perplexity ou Deepseek) na área de configurações. O Linguist usa o conceito de *Bring Your Own Key*, dando total controle ao usuário sobre os custos e o provedor de IA utilizado.
