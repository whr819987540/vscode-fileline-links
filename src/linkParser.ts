export interface ParsedCodexLink {
  filePath: string;
  line: number;
  column: number;
}

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
  if (!parsed) {
    return undefined;
  }

  const normalized = parsed.filePath.replace(/\\/g, "/");
  if (!isSupportedMarkdownPath(normalized)) {
    return undefined;
  }

  return {
    filePath: parsed.filePath,
    line: Math.max(parsed.line, 1),
    column: Math.max(parsed.column ?? 1, 1)
  };
}

function parseLocalAbsolutePathLine(value: string): ParsedCodexLink | undefined {
  const windows = value.match(/^([a-zA-Z]:[\\/].+\.(?:md|markdown)):(\d+)(?::(\d+))?$/i);
  if (windows) {
    return {
      filePath: windows[1],
      line: Number(windows[2]),
      column: windows[3] ? Number(windows[3]) : 1
    };
  }

  const unix = value.match(/^(\/.+\.(?:md|markdown)):(\d+)(?::(\d+))?$/i);
  if (unix) {
    return {
      filePath: unix[1],
      line: Number(unix[2]),
      column: unix[3] ? Number(unix[3]) : 1
    };
  }

  return undefined;
}

function isSupportedMarkdownPath(value: string): boolean {
  return /\.(md|markdown)$/i.test(value);
}
