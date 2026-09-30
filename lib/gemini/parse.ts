import type { GeminiGeneratedProject, ProjectFile } from "@/types";

/** Parse and validate the raw string output from Gemini */
export function parseGeminiOutput(raw: string): GeminiGeneratedProject {
  // Strip markdown fences if the model added them anyway
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Model did not return valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Model output is not a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.projectName !== "string" || !obj.projectName.trim()) {
    throw new Error('Missing or invalid "projectName"');
  }

  if (typeof obj.summary !== "string" || !obj.summary.trim()) {
    throw new Error('Missing or invalid "summary"');
  }

  if (!Array.isArray(obj.files) || obj.files.length === 0) {
    throw new Error('"files" must be a non-empty array');
  }

  const files: ProjectFile[] = [];

  for (const item of obj.files as unknown[]) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error("Each file entry must be an object");
    }
    const f = item as Record<string, unknown>;

    if (typeof f.path !== "string" || !f.path.trim()) {
      throw new Error("File entry missing valid path");
    }
    if (typeof f.content !== "string") {
      throw new Error(`File "${f.path}" has non-string content`);
    }

    // Sanitize path — no absolute paths or directory traversal
    const safePath = f.path
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\.\.\//g, "");

    // Enforce size limit per file (~1 MB)
    if (f.content.length > 1_000_000) {
      throw new Error(`File "${safePath}" exceeds the 1 MB size limit`);
    }

    files.push({ path: safePath, content: f.content });
  }

  // Cap at 30 files
  if (files.length > 30) {
    files.splice(30);
  }

  return {
    projectName: obj.projectName.trim().slice(0, 120),
    summary: obj.summary.trim().slice(0, 500),
    files,
  };
}

/** Convert files array to a Record<path, content> map */
export function filesToRecord(
  files: ProjectFile[]
): Record<string, string> {
  return Object.fromEntries(files.map((f) => [f.path, f.content]));
}

/** Check if the generation was blocked by safety rules */
export function isBlockedOutput(result: GeminiGeneratedProject): boolean {
  return (
    result.projectName === "Blocked" &&
    result.files.length === 0
  );
}
