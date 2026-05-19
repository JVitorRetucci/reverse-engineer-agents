export type SkillRole = "main" | "intermediate" | "pec" | "any";

export interface SkillMetadata {
  id: string;
  name: string;
  summary: string;
  capabilities: string[];
  estimatedTokens: number;
  role: SkillRole;
  toolNames: string[];
  sourcePath: string;
}

export interface ParsedSkillMarkdown {
  metadata: SkillMetadata;
  body: string;
}
