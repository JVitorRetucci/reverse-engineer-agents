# Reverse Engineer Agents

This project implements a tool that supports static code analysis by leveraging large language models (LLMs) via [LangChain.js](https://js.langchain.com/). It is part of João Vítor de Oliveira Carvalho's master's research, which investigates how LLM agents can enhance software engineering workflows through natural language interfaces.

## Objective

The main goal is to explore the use of LLM agents in software engineering, especially in static analysis scenarios. The tool aims to:

- Help developers better understand codebases using natural language.
- Assist in tasks such as refactoring, design pattern recognition, and dependency analysis.
- Demonstrate how LLMs can be integrated into software engineering pipelines to improve productivity and insight.

## Features (initial/partial implementation)

- LangChain integration using Node.js.
- Code ingestion and chunking by class or interface.
- Source code vectorization using open-source embeddings (e.g., CodeBERT).
- Retrieval-Augmented Generation (RAG) pipeline to answer code-related questions based on relevant context.
- Example questions the system can handle:
  - "What design patterns are used in this project?"
  - "Where is function X defined and who calls it?"
  - "How are modules A, B, and C related?"
- Responses include contextualized code snippets when appropriate.

## Technologies

- Node.js with TypeScript
- [LangChain.js](https://js.langchain.com/)
- Open-source code embeddings (e.g., CodeBERT)
- Chunking granularity by class/interface
- Agent-based modular pipeline for LLM tasks

## Motivation

This research is driven by the hypothesis that LLM agents can support complex reasoning tasks in software engineering, particularly in understanding legacy systems, analyzing software architecture, and identifying opportunities for improvement. The tool provides a natural language interface to explore and analyze codebases.

## Setup and Usage

### MVP com Docker

O backend e o frontend podem ser iniciados juntos a partir da pasta do backend:

```bash
./scripts/docker-up.sh
```

No Windows, use PowerShell:

```powershell
.\scripts\docker-up.ps1
```

Abra o frontend em http://localhost:3000.

Configure pelo menos uma chave de API no `.env` da pasta do backend. Por exemplo:

```text
OPEN_ROUTER_API_KEY=sua-chave
```

A pasta montada é configurada em `agents.config.json` por `runtime.host_projects_mount_source`.
Por padrão, ela usa `..`, montando a pasta pai dos projetos.
O diretório aparece no backend e no frontend como `/workspace/projects`.

Para reconstruir e iniciar novamente:

```bash
./scripts/docker-up.sh
```

No Windows:

```powershell
.\scripts\docker-up.ps1
```

Para parar os containers:

```bash
docker compose down
```

Follow these steps to install and run the project:

### 1. Clone the repository

```bash
git clone https://github.com/username/repo.git
cd repo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a .env file with the required API keys or configuration values.

### 4. Run the project

To run the project in development mode:

```bash
npm run dev
```

To build and run in production mode:

```bash
npm run build
npm start
```

### 5. Tests

To run the project tests, use the `test` command:

```bash
npm run test
```

## Status

🚧 Work in progress. The system interface (CLI, API, or GUI) is still under definition. Current focus is on building the LangChain-based static analysis pipeline.

## Author

João Vítor de Oliveira Carvalho
MSc Student in Software Engineering

---

This project is part of an academic research initiative and is currently in an experimental stage.
