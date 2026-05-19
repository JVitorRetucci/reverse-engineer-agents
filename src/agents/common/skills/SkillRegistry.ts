import fs from "fs";
import path from "path";
import { parseSkillMarkdown } from "./SkillMarkdownParser.js";
import { SkillMetadata, SkillRole } from "./types.js";

const DEFAULT_SKILLS_DIR = path.join(
  process.cwd(),
  "src",
  "agents",
  "common",
  "skills",
  "definitions",
);

const AGENTS_DIR = path.join(process.cwd(), "src", "agents");

const collectMarkdownFiles = (dirPath: string): string[] => {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
};

const collectAgentSkillDirs = (agentsDir: string): string[] => {
  if (!fs.existsSync(agentsDir)) return [];

  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  const dirs: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillsDir = path.join(agentsDir, entry.name, "skills");
    if (fs.existsSync(skillsDir)) dirs.push(skillsDir);
  }

  return dirs;
};

type SkillRegistryLoadOptions = {
  agentName?: string;
};

export class SkillRegistry {
  private skills: Map<string, SkillMetadata> = new Map();
  private skillBodies: Map<string, string> = new Map();
  private skillPaths: Map<string, string> = new Map();
  private agentSkillIds: Map<string, string[]> = new Map();

  async loadFromDir(
    dirPath: string = DEFAULT_SKILLS_DIR,
    options: SkillRegistryLoadOptions = {},
  ): Promise<void> {
    this.skillPaths.clear();
    this.agentSkillIds.clear();

    const files = collectMarkdownFiles(dirPath);
    for (const filePath of files) {
      this.indexSkillPath(filePath);
    }

    if (options.agentName) {
      const skillsDir = path.join(AGENTS_DIR, options.agentName, "skills");
      const agentFiles = collectMarkdownFiles(skillsDir);
      const ids = agentFiles.map((filePath) => this.indexSkillPath(filePath));
      this.agentSkillIds.set(
        options.agentName,
        ids.filter(Boolean) as string[],
      );
    } else {
      const agentSkillDirs = collectAgentSkillDirs(AGENTS_DIR);
      for (const skillsDir of agentSkillDirs) {
        const agentName = path.basename(path.dirname(skillsDir));
        const agentFiles = collectMarkdownFiles(skillsDir);
        const ids = agentFiles.map((filePath) => this.indexSkillPath(filePath));
        this.agentSkillIds.set(agentName, ids.filter(Boolean) as string[]);
      }
    }
  }

  getAgentSkillIds(agentName: string): string[] {
    return this.agentSkillIds.get(agentName) ?? [];
  }

  getSkill(id: string): SkillMetadata | undefined {
    this.ensureSkillMetadata(id);
    return this.skills.get(id);
  }

  getSkillBody(id: string): string | undefined {
    const cached = this.skillBodies.get(id);
    if (cached) return cached;

    const filePath = this.skillPaths.get(id);
    if (!filePath) return undefined;

    const { metadata, body } = parseSkillMarkdown(filePath);
    const normalized = this.normalizeMetadataId(metadata, filePath);
    this.skills.set(normalized.id, normalized);
    this.skillBodies.set(normalized.id, body);
    return body;
  }

  getSkillsByRole(role: SkillRole): SkillMetadata[] {
    for (const id of this.skillPaths.keys()) {
      this.ensureSkillMetadata(id);
    }
    return Array.from(this.skills.values()).filter(
      (skill) => skill.role === role || skill.role === "any",
    );
  }

  getPromptForSkills(skillIds: string[]): string {
    const selected: SkillMetadata[] = [];

    for (const id of skillIds) {
      this.ensureSkillMetadata(id);
      const skill = this.skills.get(id);
      if (skill) selected.push(skill);
    }

    if (selected.length === 0) return "";

    const lines = selected.map(
      (skill) => `- ${skill.id}: ${skill.summary}`,
    );

    if (selected.length > 0) {
      const ids = selected.map((skill) => skill.id).join(", ");
    }

    return [
      "Available skills:",
      ...lines,
      "",
      "To request full skill details, reply with:",
      "SKILL_ID: <skill-id>",
    ].join("\n");
  }

  private indexSkillPath(filePath: string): string | null {
    const id = path.basename(filePath, path.extname(filePath));
    if (!id) return null;

    const existing = this.skillPaths.get(id);
    if (existing && existing !== filePath) {
      console.warn(
        `⚠️  Skill id '${id}' already indexed. Overriding with ${filePath}.`,
      );
    }

    this.skillPaths.set(id, filePath);
    return id;
  }

  private ensureSkillMetadata(id: string): void {
    if (this.skills.has(id)) return;

    const filePath = this.skillPaths.get(id);
    if (!filePath) return;

    const { metadata } = parseSkillMarkdown(filePath);
    const normalized = this.normalizeMetadataId(metadata, filePath);
    this.skills.set(normalized.id, normalized);
  }

  private normalizeMetadataId(
    metadata: SkillMetadata,
    filePath: string,
  ): SkillMetadata {
    const idFromFile = path.basename(filePath, path.extname(filePath));
    if (metadata.id !== idFromFile) {
      console.warn(
        `⚠️  Skill id '${metadata.id}' does not match file name '${idFromFile}'. Using file name as id.`,
      );
    }

    return {
      ...metadata,
      id: idFromFile,
    };
  }
}
