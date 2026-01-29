/**
 * 🔍 Agent System Diagnostics
 *
 * Este script valida a configuração de agentes e verifica erros comuns.
 * Uso: npm run diagnose
 */

import { readFileSync } from "fs";
import { join } from "path";

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  port: number;
  executorPath: string;
  executorClass: string;
  skill: Record<string, any>;
}

interface AgentsConfig {
  agents: AgentConfig[];
}

const ISSUES: string[] = [];
const WARNINGS: string[] = [];
const SUCCESSES: string[] = [];

async function diagnoseAgents() {
  console.log("\n🔍 Iniciando diagnóstico do sistema de agentes...\n");

  try {
    // 1. Verificar arquivo de configuração
    console.log("📋 Verificando agents.config.json...");
    const configPath = join(process.cwd(), "agents.config.json");
    let config: AgentsConfig;

    try {
      const configContent = readFileSync(configPath, "utf-8");
      config = JSON.parse(configContent);
      SUCCESSES.push("✅ agents.config.json encontrado e válido");
    } catch (err) {
      ISSUES.push(`❌ Erro ao ler agents.config.json: ${err}`);
      return printReport();
    }

    // 2. Validar estrutura de agentes
    console.log("🧩 Validando configuração de agentes...");
    if (!Array.isArray(config.agents)) {
      ISSUES.push(
        "❌ agents.config.json deve conter um array 'agents'"
      );
      return printReport();
    }

    if (config.agents.length === 0) {
      WARNINGS.push("⚠️  Nenhum agente configurado");
    }

    SUCCESSES.push(
      `✅ ${config.agents.length} agente(s) encontrado(s)`
    );

    // 3. Validar cada agente
    console.log("🔎 Validando cada agente...");
    const requiredFields = [
      "id",
      "name",
      "description",
      "port",
      "executorPath",
      "executorClass",
      "skill",
    ];

    for (let i = 0; i < config.agents.length; i++) {
      const agent = config.agents[i];
      console.log(`\n  Agente ${i + 1}: "${agent.id || "SEM_ID"}"`);

      // Validar campos obrigatórios
      for (const field of requiredFields) {
        if (!(field in agent)) {
          ISSUES.push(
            `❌ Agente #${i + 1} ("${agent.id}"): campo obrigatório "${field}" está faltando`
          );
        }
      }

      // Validar porta
      if (agent.port && (agent.port < 1024 || agent.port > 65535)) {
        ISSUES.push(
          `❌ Agente #${i + 1} ("${agent.id}"): porta ${agent.port} é inválida (deve estar entre 1024-65535)`
        );
      }

      // Validar unicidade de portas
      const duplicatePort = config.agents.find(
        (a, idx) => idx !== i && a.port === agent.port
      );
      if (duplicatePort) {
        ISSUES.push(
          `❌ Agente #${i + 1} ("${agent.id}"): porta ${agent.port} é usada por outro agente ("${duplicatePort.id}")`
        );
      }

      // Validar unicidade de IDs
      const duplicateId = config.agents.find(
        (a, idx) => idx !== i && a.id === agent.id
      );
      if (duplicateId) {
        ISSUES.push(
          `❌ Agente #${i + 1}: ID "${agent.id}" é duplicado`
        );
      }

      // Validar skill
      if (agent.skill) {
        if (!agent.skill.id) {
          ISSUES.push(
            `❌ Agente #${i + 1} ("${agent.id}"): skill.id está faltando`
          );
        }
        if (!agent.skill.name) {
          ISSUES.push(
            `❌ Agente #${i + 1} ("${agent.id}"): skill.name está faltando`
          );
        }
      }

      SUCCESSES.push(
        `✅ Agente #${i + 1} ("${agent.id}"): validação concluída`
      );
    }

    // 4. Verificar AgentRegistry
    console.log("\n📦 Verificando AgentRegistry...");
    try {
      await import("@core/AgentRegistry.ts");
      SUCCESSES.push("✅ AgentRegistry encontrado e carregável");
    } catch (err) {
      ISSUES.push(`❌ Erro ao carregar AgentRegistry: ${err}`);
    }

  } catch (err) {
    ISSUES.push(`❌ Erro geral no diagnóstico: ${err}`);
  }

  printReport();
}

function printReport(): void {
  console.log("\n" + "=".repeat(60));
  console.log("📊 RELATÓRIO DE DIAGNÓSTICO");
  console.log("=".repeat(60) + "\n");

  if (SUCCESSES.length > 0) {
    console.log("✅ SUCESSO:\n");
    SUCCESSES.forEach((msg) => console.log(`  ${msg}`));
    console.log();
  }

  if (WARNINGS.length > 0) {
    console.log("⚠️  AVISOS:\n");
    WARNINGS.forEach((msg) => console.log(`  ${msg}`));
    console.log();
  }

  if (ISSUES.length > 0) {
    console.log("❌ ERROS:\n");
    ISSUES.forEach((msg) => console.log(`  ${msg}`));
    console.log();
  }

  console.log("=".repeat(60));
  if (ISSUES.length === 0) {
    console.log(
      `\n✅ Sistema de agentes está funcionando corretamente!\n`
    );
  } else {
    console.log(`\n❌ ${ISSUES.length} erro(s) encontrado(s).\n`);
    console.log(
      "Veja docs/ADDING_NEW_AGENTS.md para mais informações.\n"
    );
    process.exit(1);
  }
}

diagnoseAgents().catch(console.error);
