/**
 * Splits/rebuilds an MD/MDX file into its `---` frontmatter block and body
 * without ever parsing the body as Markdown/MDX — the body is treated as an
 * opaque string throughout the admin Pages editor so that imports, JSX
 * components, comments and formatting are never at risk of being mangled.
 */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface SplitFile {
  frontmatterText: string;
  body: string;
}

export function splitFrontmatter(raw: string): SplitFile {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    throw new Error('Ce fichier ne contient pas de bloc frontmatter YAML valide (--- ... ---).');
  }
  return { frontmatterText: match[1], body: match[2] };
}

/** Inverse of splitFrontmatter: reassembles a full file from its parts. */
export function rebuildFile(frontmatterText: string, body: string): string {
  const fm = frontmatterText.endsWith('\n') ? frontmatterText : `${frontmatterText}\n`;
  return `---\n${fm}---\n${body}`;
}
