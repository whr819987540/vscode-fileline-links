import * as vscode from "vscode";
import { openCodexPreview } from "./preview";
import { parseCodexFileLineLink } from "./linkParser";
import extendMarkdownIt from "./markdownItPlugin";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("filelineLinks.openAtLine", async (...args: unknown[]) => {
      await openAtLineCommand(args);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("filelineLinks.openPreview", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        await vscode.window.showWarningMessage("Open a Markdown file before running this command.");
        return;
      }

      openCodexPreview(context, editor.document, openFileAtLine);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("filelineLinks.copyCommandMarkdownLink", async () => {
      await copyCommandMarkdownLink();
    })
  );

  context.subscriptions.push(
    vscode.window.registerUriHandler({
      async handleUri(uri) {
        await handleExtensionUri(uri);
      }
    })
  );

  context.subscriptions.push(registerMarkdownDocumentLinks());

  return {
    extendMarkdownIt
  };
}

export function deactivate() {
  // No persistent resources.
}

async function openAtLineCommand(args: unknown[]) {
  if (typeof args[0] === "string" && typeof args[1] === "number") {
    await openFileAtLine(args[0], args[1], typeof args[2] === "number" ? args[2] : 1);
    return;
  }

  if (typeof args[0] !== "string") {
    await vscode.window.showWarningMessage("File line link command requires a link string.");
    return;
  }

  const parsed = parseCodexFileLineLink(args[0]);
  if (!parsed) {
    await vscode.window.showWarningMessage(`Unsupported file line link: ${args[0]}`);
    return;
  }

  await openFileAtLine(parsed.filePath, parsed.line, parsed.column);
}

function registerMarkdownDocumentLinks(): vscode.Disposable {
  return vscode.languages.registerDocumentLinkProvider(
    [
      { scheme: "file" },
      { scheme: "untitled" }
    ],
    {
      provideDocumentLinks(document) {
        const links: vscode.DocumentLink[] = [];
        const inlineLinkPattern = /\[[^\]\r\n]+\]\((<[^>\r\n]+>|[^)\s\r\n]+)\)/g;
        const bareLinkPattern = /(?:[a-zA-Z]:[\\/]|\/)[^\r\n]*?\.(?:md|markdown):\d+(?::\d+)?/gi;

        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
          const lineText = document.lineAt(lineIndex).text;
          let match: RegExpExecArray | null;

          while ((match = inlineLinkPattern.exec(lineText))) {
            const rawHref = match[1];
            const href = match[1].startsWith("<") && match[1].endsWith(">")
              ? match[1].slice(1, -1)
              : match[1];

            if (!parseCodexFileLineLink(href)) {
              continue;
            }

            const hrefStart = match.index + match[0].indexOf(rawHref);
            const start = new vscode.Position(lineIndex, hrefStart);
            const end = new vscode.Position(lineIndex, hrefStart + rawHref.length);
            links.push(createCommandLink(new vscode.Range(start, end), href));
          }

          while ((match = bareLinkPattern.exec(lineText))) {
            const href = match[0];
            if (!parseCodexFileLineLink(href)) {
              continue;
            }

            const range = new vscode.Range(
              new vscode.Position(lineIndex, match.index),
              new vscode.Position(lineIndex, match.index + href.length)
            );
            if (links.some((link) => link.range.intersection(range))) {
              continue;
            }

            links.push(createCommandLink(range, href));
          }
        }

        return links;
      }
    }
  );
}

async function copyCommandMarkdownLink() {
  const editor = vscode.window.activeTextEditor;
  const selectedText = editor
    ? editor.document.getText(editor.selection).trim()
    : "";
  const clipboardText = await vscode.env.clipboard.readText();
  const href = selectedText || clipboardText.trim();
  const parsed = parseCodexFileLineLink(href);

  if (!parsed) {
    await vscode.window.showWarningMessage("Select or copy a supported file-line link first.");
    return;
  }

  const label = escapeMarkdownLinkText(basename(parsed.filePath));
  const extensionHref = createExtensionUri(href);
  await vscode.env.clipboard.writeText(`[${label}:${parsed.line}](${extensionHref})`);
  void vscode.window.showInformationMessage("Copied VS Code Markdown link to clipboard.");
}

function createCommandLink(range: vscode.Range, href: string): vscode.DocumentLink {
  const target = vscode.Uri.parse(createCommandUri(href));
  const link = new vscode.DocumentLink(range, target);
  link.tooltip = "Open file at referenced line";
  return link;
}

function createCommandUri(href: string): string {
  const commandArgs = encodeURIComponent(JSON.stringify([href]));
  return `command:filelineLinks.openAtLine?${commandArgs}`;
}

function createExtensionUri(href: string): string {
  const params = new URLSearchParams({ href });
  return `${vscode.env.uriScheme}://local.vscode-fileline-links/open?${params.toString()}`;
}

async function handleExtensionUri(uri: vscode.Uri) {
  if (uri.path !== "/open") {
    await vscode.window.showWarningMessage(`Unsupported File Line Links URI: ${uri.toString(true)}`);
    return;
  }

  const params = new URLSearchParams(uri.query);
  const href = params.get("href");
  if (!href) {
    await vscode.window.showWarningMessage("File Line Links URI is missing href.");
    return;
  }

  const parsed = parseCodexFileLineLink(href);
  if (!parsed) {
    await vscode.window.showWarningMessage(`Unsupported file line link: ${href}`);
    return;
  }

  await openFileAtLine(parsed.filePath, parsed.line, parsed.column);
}

async function openFileAtLine(filePath: string, line: number, column: number) {
  const uri = resolveFileUri(filePath);
  const document = await vscode.workspace.openTextDocument(uri);
  const safeLine = Math.max(Math.min(line - 1, document.lineCount - 1), 0);
  const safeColumn = Math.max(column - 1, 0);
  const position = new vscode.Position(safeLine, safeColumn);

  await vscode.window.showTextDocument(document, {
    preview: false,
    selection: new vscode.Range(position, position)
  });
}

function resolveFileUri(filePath: string): vscode.Uri {
  const config = vscode.workspace.getConfiguration("filelineLinks");
  const preferWsl = config.get<boolean>("preferWslForUnixPaths", false);
  const distro = config.get<string>("wslDistro", "Ubuntu");

  if (vscode.env.remoteName) {
    return vscode.Uri.file(filePath);
  }

  if (preferWsl && filePath.startsWith("/")) {
    return vscode.Uri.parse(`vscode-remote://wsl+${encodeURIComponent(distro)}${encodePath(filePath)}`);
  }

  return vscode.Uri.file(filePath);
}

function encodePath(filePath: string): string {
  return filePath
    .split("/")
    .map((part, index) => index === 0 ? "" : encodeURIComponent(part))
    .join("/");
}

function basename(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

function escapeMarkdownLinkText(value: string): string {
  return value.replace(/([\\\[\]])/g, "\\$1");
}
