# ⚡ Quick Start - Sistema de Agentes

## TL;DR - O que mudou?

Seu projeto agora usa **um arquivo JSON para configurar quais agentes rodam**, em vez de "forçar" na mão em TypeScript.

---

## 🎯 Para o Usuário Final

### Antes (❌ Antigo)
```typescript
// src/main.ts - tinha que editar TypeScript
async function main() {
  startMetricsAgent()  // <- forçado na mão
  startMainAgent()      // <- forçado na mão
}
```

### Depois (✅ Novo)
```json
// agents.config.json - só editar JSON
{
  "agents": [
    { "id": "main", ... },
    { "id": "metrics", ... }
  ]
}
```

---

## 🚀 Como Usar

### Iniciar o projeto
```bash
npm run dev
```

### Ativar apenas agentes específicos
Edite `agents.config.json` e remova ou comente agentes que não quer rodar.

### Mudar porta de um agente
Edite a propriedade `port` em `agents.config.json`.

---

## ➕ Adicionar Novo Agente (3 passos)

### 1️⃣ Criar executor
```typescript
// src/agents/novo/executor.ts
export class NovoAgentExecutor implements AgentExecutor {
  async execute(requestContext, eventBus) { /* ... */ }
  async cancelTask(taskId, eventBus) { /* ... */ }
}
```

### 2️⃣ Registrar em agents.config.json
```json
{
  "agents": [
    // agentes existentes...
    {
      "id": "novo",
      "name": "Novo Agente",
      "description": "Descrição...",
      "port": 4202,
      "executorPath": "./src/agents/novo/executor.ts",
      "executorClass": "NovoAgentExecutor",
      "skill": { "id": "novo_skill", "name": "...", ... }
    }
  ]
}
```

### 3️⃣ Pronto! 🎉
Nenhuma outra mudança. Execute `npm run dev` e seu agente está rodando.

---

## 📁 Estrutura de Pastas Criadas

```
project/
├── agents.config.json              ← 🆕 Configuração de agentes
├── AGENT_SYSTEM.md                 ← 📚 Documentação completa
├── src/
│   └── core/
│       ├── AgentRegistry.ts         ← 🆕 Factory de agentes
│       └── agents.config.example.ts ← 📝 Exemplos de config
├── docs/
│   └── ADDING_NEW_AGENTS.md         ← 📖 Guia detalhado
└── scripts/
    └── diagnose-agents.ts           ← 🔧 Ferramenta de diagnóstico
```

---

## 🔍 Verificar Tudo Está OK

```bash
npx ts-node scripts/diagnose-agents.ts
```

Este script valida sua configuração e avisa sobre erros.

---

## 📖 Documentação

| Documento | Para quem? | Tempo de leitura |
|-----------|-----------|-----------------|
| [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) | Visão geral | 5 min |
| [docs/ADDING_NEW_AGENTS.md](./docs/ADDING_NEW_AGENTS.md) | Adicionar agentes | 10 min |
| [src/core/agents.config.example.ts](./src/core/agents.config.example.ts) | Exemplos | 5 min |

---

## ❓ FAQ

**P: Preciso editar os executores (main/executor.ts, metrics/executor.ts)?**  
R: Não! Eles funcionam como estão. A mágica está em `AgentRegistry.ts`.

**P: Como desativar um agente?**  
R: Remova ou comente sua entrada em `agents.config.json`.

**P: Quanto tempo leva para adicionar um novo agente?**  
R: ~5 minutos. Criar estrutura → Implementar executor → Registrar em JSON.

**P: Os agentes rodam em paralelo?**  
R: Sim! Todos iniciam de forma assíncrona ao chamar `startAllAgents()`.

---

## 💡 Dica

Você pode copiar a configuração de um agente existente como template:

```json
{
  "id": "novo-agente",        ← Mudar ID
  "name": "...",              ← Mudar nome
  "port": 4202,               ← Mudar porta (não pode repetir)
  "executorPath": "./src/agents/novo-agente/executor.ts",  ← Novo caminho
  "executorClass": "NovoAgentExecutor",  ← Nome da classe
  "skill": { ... }            ← Customizar skill
}
```

---

## ✅ Checklist para Novo Agente

- [ ] Pasta criada: `src/agents/novo-agente/`
- [ ] Arquivo `executor.ts` implementado
- [ ] Classe exporta interface `AgentExecutor`
- [ ] Entrada adicionada em `agents.config.json`
- [ ] ID único (sem duplicatas)
- [ ] Porta única (sem duplicatas, > 1024)
- [ ] Teste com `npm run dev`

---

**Pronto! 🎊 Seu sistema de agentes é agora modular e escalável!**
