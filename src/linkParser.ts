export interface ParsedCodexLink {
  filePath: string;
  line: number;
  column: number;
}

export const supportedFileExtensionPattern = [
  "md",
  "markdown",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "mts",
  "cts",
  "json",
  "jsonc",
  "py",
  "pyw",
  "java",
  "c",
  "h",
  "cc",
  "cpp",
  "cxx",
  "hh",
  "hpp",
  "hxx",
  "cs",
  "go",
  "rs",
  "php",
  "rb",
  "swift",
  "kt",
  "kts",
  "scala",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "psm1",
  "psd1",
  "bat",
  "cmd",
  "sql",
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "vue",
  "svelte",
  "astro",
  "yml",
  "yaml",
  "toml",
  "xml"
].join("|");

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function stripMarkdownAngleBrackets(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseCodexFileLineLink(href: string): ParsedCodexLink | undefined {
  const raw = safeDecodeURIComponent(stripMarkdownAngleBrackets(href));

  const parsed = parseLocalAbsolutePathLine(raw);
  if (!parsed || !hasSupportedFileExtension(parsed.filePath)) {
    return undefined;
  }

  return {
    filePath: parsed.filePath,
    line: Math.max(parsed.line, 1),
    column: Math.max(parsed.column ?? 1, 1)
  };
}

function parseLocalAbsolutePathLine(value: string): ParsedCodexLink | undefined {
  const windows = value.match(new RegExp(
    `^([a-zA-Z]:[\\\\/].+\\.(?:${supportedFileExtensionPattern})):(\\d+)(?::(\\d+))?$`,
    "i"
  ));
  if (windows) {
    return {
      filePath: windows[1],
      line: Number(windows[2]),
      column: windows[3] ? Number(windows[3]) : 1
    };
  }

  const unix = value.match(new RegExp(
    `^(/.+\\.(?:${supportedFileExtensionPattern})):(\\d+)(?::(\\d+))?$`,
    "i"
  ));
  if (unix) {
    return {
      filePath: unix[1],
      line: Number(unix[2]),
      column: unix[3] ? Number(unix[3]) : 1
    };
  }

  return undefined;
}

function hasSupportedFileExtension(value: string): boolean {
  return new RegExp(`\\.(${supportedFileExtensionPattern})$`, "i").test(value.replace(/\\/g, "/"));
}
