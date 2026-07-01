const supportedFileExtensionPattern = [
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
const fileLinePattern = new RegExp(`^(?:[a-zA-Z]:[\\\\/]|/).+\\.(?:${supportedFileExtensionPattern}):\\d+(?::\\d+)?$`, "i");

window.addEventListener("click", (event: MouseEvent) => {
  const anchor = findAnchor(event.target);
  if (!anchor) {
    return;
  }

  rewriteAnchor(anchor);
}, true);

window.addEventListener("vscode.markdown.updateContent", () => {
  rewriteAnchors();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", rewriteAnchors);
} else {
  rewriteAnchors();
}

function rewriteAnchors() {
  for (const anchor of document.querySelectorAll("a[href]")) {
    if (anchor instanceof HTMLAnchorElement) {
      rewriteAnchor(anchor);
    }
  }
}

function rewriteAnchor(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("data-fileline-href")
    ?? anchor.getAttribute("data-href")
    ?? anchor.getAttribute("href");
  if (!href || !isFileLineLink(href)) {
    return;
  }

  const extensionHref = toExtensionOpenUri(href);
  anchor.setAttribute("href", extensionHref);
  anchor.setAttribute("data-href", extensionHref);
  anchor.setAttribute("data-fileline-href", href);
}

function findAnchor(target: EventTarget | null): HTMLAnchorElement | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const anchor = target.closest("a[href]");
  return anchor instanceof HTMLAnchorElement ? anchor : undefined;
}

function isFileLineLink(href: string): boolean {
  return fileLinePattern.test(safeDecodeURIComponent(stripMarkdownAngleBrackets(href)));
}

function toExtensionOpenUri(href: string): string {
  const params = new URLSearchParams({ href });
  return `vscode://local.vscode-fileline-links/open?${params.toString()}`;
}

function stripMarkdownAngleBrackets(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
