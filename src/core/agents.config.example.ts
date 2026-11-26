/**
 * EXEMPLO: agents.config.example.json
 *
 * Este arquivo mostra como expandir o agents.config.json com novos agentes.
 * Copie este conteúdo como referência ao adicionar novos agentes.
 */

export const AGENTS_CONFIG_EXAMPLE = {
  agents: [
    {
      id: "main",
      name: "Software Reverse Engineering Agent",
      description:
        "An agent capable of performing long and complex software reverse engineering tasks by delegating work to multiple other agents",
      port: 4000,
      executorPath: "./src/agents/main/executor.ts",
      executorClass: "MainAgentExecutor",
      skill: {
        id: "software_reverse_engineering",
        name: "Software reverse engineering tasks",
        description:
          "Help with complex and multi-step software reverse engineering tasks",
        tags: [
          "software reverse engineering",
          "software understanding",
          "software engineering",
        ],
      },
    },
    {
      id: "metrics",
      name: "Metrics Primary Extractor Component",
      description: "Help with raw metrics software data",
      port: 4201,
      executorPath: "./src/agents/metrics/executor.ts",
      executorClass: "MetricsAgentExecutor",
      skill: {
        id: "software_metrics_extraction",
        name: "Uses SCC software in order to extract metrics from target software",
        description: "Help with raw metrics software data",
        tags: ["software metrics", "scc", "metrics extractor"],
        examples: [
          "I need metrics from software located at './'",
          "Give me data about the project located at './folder/extraction_project'",
        ],
      },
    },

    // ===== EXEMPLO: Novo Agente de Análise de Código =====
    // {
    //   id: "code-analyzer",
    //   name: "Code Analysis Agent",
    //   description: "Analyzes code structure and provides insights",
    //   port: 4202,
    //   executorPath: "./src/agents/code-analyzer/executor.ts",
    //   executorClass: "CodeAnalyzerExecutor",
    //   skill: {
    //     id: "code_analysis",
    //     name: "Code Analysis Tasks",
    //     description: "Help with code structure analysis and refactoring suggestions",
    //     tags: ["code analysis", "refactoring", "code quality"],
    //     examples: [
    //       "Analyze the code in ./src",
    //       "Suggest improvements for code in ./app.ts"
    //     ]
    //   }
    // },

    // ===== EXEMPLO: Novo Agente de Testes =====
    // {
    //   id: "test-generator",
    //   name: "Test Generator Agent",
    //   description: "Generates test cases for code",
    //   port: 4203,
    //   executorPath: "./src/agents/test-generator/executor.ts",
    //   executorClass: "TestGeneratorExecutor",
    //   skill: {
    //     id: "test_generation",
    //     name: "Automated Test Generation",
    //     description: "Generate unit and integration tests",
    //     tags: ["testing", "test generation", "quality assurance"],
    //     examples: [
    //       "Generate tests for ./src/utils/helpers.ts",
    //       "Create integration tests for the API module"
    //     ]
    //   }
    // },

    // ===== EXEMPLO: Novo Agente de Documentação =====
    // {
    //   id: "doc-generator",
    //   name: "Documentation Generator Agent",
    //   description: "Generates documentation from code",
    //   port: 4204,
    //   executorPath: "./src/agents/doc-generator/executor.ts",
    //   executorClass: "DocGeneratorExecutor",
    //   skill: {
    //     id: "documentation_generation",
    //     name: "API and Code Documentation",
    //     description: "Generate comprehensive documentation",
    //     tags: ["documentation", "code docs", "API docs"],
    //     examples: [
    //       "Document the API endpoints",
    //       "Generate README for ./src/services"
    //     ]
    //   }
    // },
  ],
};
