# 📋 Guia: Adicionando Novos Agentes

Este guia explica como adicionar novos agentes ao sistema sem modificar o código principal.

## Como Funciona

O sistema utiliza um **Agent Registry** baseado em configuração para gerenciar múltiplos agentes:

1. **Arquivo de Configuração** (`agents.config.json`): Define quais agentes devem ser iniciados
2. **Agent Registry** (`src/core/AgentRegistry.ts`): Carrega e instancia os agentes dinamicamente
3. **Main Entry Point** (`src/main.ts`): Inicia todos os agentes de forma centralizada

## Adicionando um Novo Agente

### Passo 1: Criar a Estrutura do Agente

Crie um novo diretório com os arquivos necessários:

```
src/agents/seu-agente/
├── agent.ts         (Lógica do agente - estende BaseAgent)
├── executor.ts      (Implementa AgentExecutor)
└── nodes/           (Nós do grafo)
    ├── LLMCallerNode.ts
    ├── ToolsNode.ts
    └── AgentsCallerNode.ts
```

### Passo 2: Implementar o Executor

Seu executor deve implementar a interface `AgentExecutor`:

```typescript
// src/agents/seu-agente/executor.ts
import { AgentExecutor } from "@a2a-js/sdk/server";

export class SeuAgentExecutor implements AgentExecutor {
  // Implementação similar ao MainAgentExecutor ou MetricsAgentExecutor
  // ...
}
```

### Passo 3: Registrar no agents.config.json

Adicione uma entrada ao arquivo de configuração:

```json
{
  "agents": [
    // ... agentes existentes ...
    {
      "id": "seu-agente",
      "name": "Seu Agente",
      "description": "Descrição do seu agente",
      "port": 4202,
      "executorPath": "./src/agents/seu-agente/executor.ts",
      "executorClass": "SeuAgentExecutor",
      "skill": {
        "id": "seu_skill_id",
        "name": "Nome da skill",
        "description": "Descrição da skill",
        "tags": ["tag1", "tag2"]
      }
    }
  ]
}
```

### Passo 4: Pronto!

Não precisa modificar nenhum outro arquivo. Ao executar o projeto, seu agente será iniciado automaticamente:

```bash
npm run dev
```

## Estrutura do agents.config.json

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Identificador único do agente (usado internamente) |
| `name` | string | Nome do agente exibido no A2A |
| `description` | string | Descrição funcional do agente |
| `port` | number | Porta HTTP para o servidor do agente |
| `executorPath` | string | Caminho relativo ao arquivo do executor |
| `executorClass` | string | Nome da classe do executor (deve implementar AgentExecutor) |
| `skill` | object | Configuração da skill do A2A (AgentSkill) |

## Ativando/Desativando Agentes

Para desativar um agente, simplesmente remova ou comente sua entrada em `agents.config.json`:

```json
{
  "agents": [
    {
      "id": "main",
      // ... configuração ...
    },
    // {
    //   "id": "metrics",
    //   // ... configuração desativada ...
    // }
  ]
}
```

## API do Agent Registry (Avançado)

Para controle programático:

```typescript
import { AgentRegistry } from "@core/AgentRegistry.js";

const registry = new AgentRegistry("agents.config.json");

// Iniciar todos os agentes
await registry.startAllAgents();

// Obter configuração de um agente específico
const config = registry.getAgentConfig("main");

// Parar um agente específico
await registry.stopAgent("metrics");

// Parar todos os agentes
await registry.stopAllAgents();
```

## Benefícios

✅ **Sem Modificação de Código**: Adicione novos agentes apenas editando JSON  
✅ **Escalável**: Adicione quantos agentes precisar  
✅ **Modular**: Cada agente é independente  
✅ **Fácil Configuração**: Tudo centralizado em um arquivo  
✅ **Graceful Shutdown**: Todos os agentes são desligados corretamente  
