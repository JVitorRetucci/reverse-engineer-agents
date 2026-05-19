import fs from "fs";
import path from "path";
import { ParsedSkillMarkdown, SkillMetadata, SkillRole } from "./types.js";

type FrontmatterValue = string | number | string[] | undefined;

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;

const DEFAULT_ESTIMATED_TOKENS = 120;

const DEFAULT_ROLE: SkillRole = "any";

const normalizeList = (value: FrontmatterValue): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
};

const parseFrontmatterBlock = (frontmatter: string): Record<string, FrontmatterValue> => {
  const result: Record<string, FrontmatterValue> = {};
  const lines = frontmatter.split(/\r?\n/);

  let currentKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const value = keyMatch[2];

      currentKey = key;

      if (value === "") {
        result[key] = [];
        continue;
      }

      if (!Number.isNaN(Number(value)) && value !== "") {
        result[key] = Number(value);
      } else {
        result[key] = value;
      }

      continue;
    }

    const listMatch = line.match(/^-\s*(.*)$/);
    if (listMatch && currentKey) {
      const listValue = listMatch[1].trim();
      const existing = result[currentKey];

      if (!Array.isArray(existing)) {
        result[currentKey] = [];
      }

      (result[currentKey] as string[]).push(listValue);
    }
  }

  return result;
};

export const parseSkillMarkdown = (filePath: string): ParsedSkillMarkdown => {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    throw new Error(`Missing frontmatter in skill markdown: ${filePath}`);
  }

  const frontmatter = match[1];
  const body = content.slice(match[0].length).trim();
  const parsed = parseFrontmatterBlock(frontmatter);

  const id = String(parsed.id ?? "").trim();
  if (!id) {
    throw new Error(`Skill markdown missing required 'id': ${filePath}`);
  }

  const name = String(parsed.name ?? id).trim();
  const summary = String(parsed.summary ?? "").trim();
  const role = (String(parsed.role ?? DEFAULT_ROLE) as SkillRole) ?? DEFAULT_ROLE;

  const metadata: SkillMetadata = {
    id,
    name,
    summary: summary || "No summary provided.",
    capabilities: normalizeList(parsed.capabilities),
    estimatedTokens: Number(parsed.estimatedTokens ?? DEFAULT_ESTIMATED_TOKENS),
    role,
    toolNames: normalizeList(parsed.toolNames),
    sourcePath: path.normalize(filePath),
  };

  return { metadata, body };
};
