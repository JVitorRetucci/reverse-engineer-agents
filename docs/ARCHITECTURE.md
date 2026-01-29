# 🏗️ Arquitetura do Sistema de Registro de Agentes

## Visão Geral

O novo sistema implementa um padrão de **Factory com Configuração Externa**, permitindo escalabilidade sem modificar código.

```mermaid
graph TD
    A["npm run dev"] --> B["src/main.ts<br/>(23 linhas)"]
    B --> C["agents.config.json<br/>(Configuração)"]
    C --> D["AgentRegistry.ts<br/>(Orquestração)"]
    D --> E["MainAgentExecutor<br/>(porta 4000)"]
    D --> F["MetricsAgentExecutor<br/>(porta 4201)"]
    E --> G["MainAgent<br/>(LangGraph)"]
    F --> H["MetricsAgent<br/>(LangGraph)"]
    G --> I["LLM Node<br/>(Claude)"]
    G --> J["Tools Node<br/>(MCP)"]
    H --> K["LLM Node<br/>(Claude)"]
    H --> L["Tools Node<br/>(SCC)"]
    
    style A fill:#e1f5ff,color:#000000
    style B fill:#fff3e0,color:#000000
    style C fill:#f3e5f5,color:#000000
    style D fill:#e8f5e9,color:#000000
    style E fill:#fce4ec,color:#000000
    style F fill:#fce4ec,color:#000000
```

---

## Fluxo de Inicialização Detalhado

### 1. Carregamento de Configuração
```mermaid
flowchart TD
    A["new AgentRegistry<br/>(agents.config.json)"] --> B["readFileSync<br/>(ler arquivo)"]
    B --> C["JSON.parse<br/>(fazer parsing)"]
    C --> D["Validação de<br/>estrutura"]
    D --> E["Map id ↔ AgentConfig<br/>(em memória)"]
    
    style A fill:#e3f2fd,color:#000000
    style B fill:#f3e5f5,color:#000000
    style C fill:#f3e5f5,color:#000000
    style D fill:#fff3e0,color:#000000
    style E fill:#e8f5e9,color:#000000
```

### 2. Inicialização de Agentes (Paralela)
```mermaid
flowchart TD
    A["await registry.startAllAgents()"] --> B["Promise.all"]
    B --> C["startAgent(main)<br/>porta 4000"]
    B --> D["startAgent(metrics)<br/>porta 4201"]
    B --> E["startAgent(novo)<br/>porta 4202"]
    C --> F["✓ Todos iniciados"]
    D --> F
    E --> F
    
    style A fill:#e3f2fd,color:#000000
    style B fill:#fff3e0,color:#000000
    style C fill:#c8e6c9,color:#000000
    style D fill:#c8e6c9,color:#000000
    style E fill:#c8e6c9,color:#000000
    style F fill:#4caf50,color:#000000
```

### 3. Para Cada Agente
```mermaid
flowchart TD
    A["loadExecutor(agentConfig)"] --> B["import(executorPath)"]
    B --> C["module[executorClass]"]
    C --> D["new ExecutorClass()"]
    D --> E["createAgentCard(config)"]
    E --> F["DefaultRequestHandler"]
    F --> G["A2AExpressApp(handler)"]
    G --> H["setupRoutes(express())"] 
    H --> I["listen(port)"]
    I --> J["✓ Servidor rodando"]
    
    style A fill:#e3f2fd,color:#000000
    style B fill:#f3e5f5,color:#000000
    style C fill:#f3e5f5,color:#000000
    style D fill:#c8e6c9,color:#000000
    style E fill:#fff3e0,color:#000000
    style F fill:#fff3e0,color:#000000
    style G fill:#fff3e0,color:#000000
    style H fill:#fff3e0,color:#000000
    style I fill:#ffccbc,color:#000000
    style J fill:#4caf50,color:#000000
```

---

## Estrutura de Dados

### agents.config.json
```json
{
  "agents": [
    {
      "id": "identificador-unico",
      "name": "Nome Exibível",
      "description": "Descrição funcional",
      "port": 4000,
      "executorPath": "./src/agents/main/executor.ts",
      "executorClass": "MainAgentExecutor",
      "skill": {
        "id": "skill_id",
        "name": "Skill Name",
        "description": "Skill description",
        "tags": ["tag1", "tag2"],
        "examples": ["Exemplo 1", "Exemplo 2"]
      }
    }
  ]
}
```

### Mapa Interno do AgentRegistry
```typescript
config: AgentsConfig {
  agents: AgentConfig[] (do JSON)
}

servers: Map<string, Server> {
  "main" → Server (http.Server),
  "metrics" → Server (http.Server)
}
```

---

## Padrões de Design Utilizados

### 1. **Factory Pattern**
```typescript
// loadExecutor(): Cria instância dinamicamente
const module = await import(agentConfig.executorPath);
const ExecutorClass = module[agentConfig.executorClass];
return new ExecutorClass();
```

### 2. **Registry Pattern**
```typescript
// AgentRegistry: Mantém registro de agentes
private servers: Map<string, Server> = new Map();
// Permite access, start, stop de qualquer agente
```

### 3. **Configuration-Driven Design**
```typescript
// Comportamento definido por JSON, não por código
// Facilita extensibilidade sem mudança de código
```

### 4. **Async Factory**
```typescript
// Promise-based loading para suportar dynamic imports
private async loadExecutor(agentConfig): Promise<AgentExecutor>
```

---

## Sequência UML Simplificada

```mermaid
flowchart TD
    A["main.ts"] -->|"new AgentRegistry()"| B["AgentRegistry"]
    B -->|"readConfig()"| B
    B -->|"validate()"| B
    B -->|"startAll()"| C["startAgent"]
    C --> D["Agent1<br/>porta 4000"]
    C --> E["Agent2<br/>porta 4201"]
    C --> F["Agent3<br/>porta 4202"]
    
    style A fill:#e3f2fd,color:#000000
    style B fill:#e8f5e9,color:#000000
    style C fill:#fff3e0,color:#000000
    style D fill:#c8e6c9,color:#000000
    style E fill:#c8e6c9,color:#000000
    style F fill:#c8e6c9,color:#000000
```

---

## Validação de Configuração

O `AgentRegistry` valida:

1. **Estrutura**: Arquivo JSON válido e com array 'agents'
2. **Campos Obrigatórios**: Todos os campos necessários presentes
3. **Tipos**: Campos têm tipo correto (port é number, etc)
4. **Unicidade**: IDs e portas não se repetem
5. **Intervalo de Porta**: Portas entre 1024-65535
6. **Existência de Classe**: ExecutorClass existe no módulo importado

---

## Ciclo de Vida

### Inicialização (Startup)
```mermaid
graph TD
    A["AgentRegistry criado"] --> B["Config JSON<br/>carregado e validado"]
    B --> C["Cada agente<br/>é instantiado"]
    C --> D["Cada servidor HTTP<br/>é iniciado"]
    D --> E["Console log<br/>confirmando portas"]
    
    style A fill:#e3f2fd,color:#000000
    style B fill:#fff3e0,color:#000000
    style C fill:#f3e5f5,color:#000000
    style D fill:#e8f5e9,color:#000000
    style E fill:#c8e6c9,color:#000000
```

### Execução (Runtime)
```mermaid
graph TD
    A["Cada servidor HTTP<br/>aguarda requisições"] --> B["Requisições processadas<br/>por DefaultRequestHandler"]
    B --> C["Executor mapeia<br/>requests para agente"]
    C --> D["Agente executa<br/>via LangGraph"]
    D --> E["Client recebe<br/>resposta"]
    
    style A fill:#e3f2fd,color:#000000
    style B fill:#fff3e0,color:#000000
    style C fill:#f3e5f5,color:#000000
    style D fill:#e8f5e9,color:#000000
    style E fill:#c8e6c9,color:#000000
```

### Encerramento (Shutdown)
```mermaid
graph TD
    A["SIGINT (Ctrl+C)<br/>é capturado"] --> B["stopAllAgents()<br/>é chamado"]
    B --> C["Cada server.close()<br/>é chamado"]
    C --> D["Conexões abertas<br/>são finalizadas"]
    D --> E["Processo sai<br/>gracefully"]
    
    style A fill:#ffcdd2,color:#000000
    style B fill:#ffcdd2,color:#000000
    style C fill:#ffcdd2,color:#000000
    style D fill:#ffcdd2,color:#000000
    style E fill:#c8e6c9,color:#000000
```

---

## Escalabilidade

### Adicionar um Novo Agente

```mermaid
graph LR
    A["Antes: Editar main.ts<br/>+ criar 3+ arquivos<br/>+ compilar"] -->|"90% redução"| B["Depois: Editar<br/>agents.config.json<br/>1 arquivo, 1 minuto"]
    
    style A fill:#ffcdd2,color:#000000
    style B fill:#c8e6c9,color:#000000
```

### Performance
- **Inicialização**: O(n) onde n = número de agentes (paralelo)
- **Validação**: O(n) onde n = número de agentes
- **Busca de Agente**: O(1) com Map
- **Runtime**: Sem overhead, direto para o agente

---

## Diagrama de Dependências

```mermaid
graph TD
    A["src/main.ts"] --> B["AgentRegistry"]
    B --> C["fs<br/>readFileSync"]
    B --> D["path<br/>join"]
    B --> E["@a2a-js/sdk"]
    B --> F["@a2a-js/sdk/server"]
    B --> G["express"]
    B --> H["http<br/>Server type"]
    B --> I["agents/main/executor.ts<br/>(dinâmico)"]
    B --> J["agents/metrics/executor.ts<br/>(dinâmico)"]
    I --> K["Dependências<br/>do agente"]
    J --> L["Dependências<br/>do agente"]
    M["agents.config.json"] --> B
    M --> I
    M --> J
    
    style A fill:#e3f2fd,color:#000000
    style B fill:#e8f5e9,color:#000000
    style M fill:#f3e5f5,color:#000000
    style C fill:#f5f5f5,color:#000000
    style D fill:#f5f5f5,color:#000000
    style E fill:#f5f5f5,color:#000000
    style F fill:#f5f5f5,color:#000000
    style G fill:#f5f5f5,color:#000000
    style H fill:#f5f5f5,color:#000000
```

---

## Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Localização da config** | Espalhado em main.ts | Centralizado em JSON |
| **Adicionar agente** | Editar código + compilar | Editar JSON |
| **Escalabilidade** | Linear com código | Logarítmica |
| **Modificação de portas** | Código | JSON |
| **Número de linhas de main.ts** | ~90 | 23 |
| **Risco de erro ao adicionar** | Alto | Baixo (JSON é validado) |
| **Facilidade de entender fluxo** | Média | Alta (grafo visual) |

---

## Extensões Futuras Possíveis

### 1. Suporte a Variáveis de Ambiente
```json
{
  "port": "${AGENT_PORT:-4000}"
}
```

### 2. Suporte a Grupos de Agentes
```json
{
  "groups": {
    "production": ["main", "metrics"],
    "staging": ["main"]
  },
  "startGroup": "production"
}
```

### 3. Suporte a Health Checks
```json
{
  "healthCheck": {
    "enabled": true,
    "interval": 30000
  }
}
```

### 4. Suporte a Dependências Entre Agentes
```json
{
  "dependencies": ["main-agent"],
  "startAfter": ["metrics-agent"]
}
```

---

**Arquitetura clara, extensível e fácil de manter! 🚀**
