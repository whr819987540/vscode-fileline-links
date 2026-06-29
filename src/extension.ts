import * as vscode from "vscode";
import { openCodexPreview } from "./preview";
import { parseCodexFileLineLink } from "./linkParser";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("codexMarkdownLinks.openAtLine", async (...args: unknown[]) => {
      await openAtLineCommand(args);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexMarkdownLinks.openPreview", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        await vscode.window.showWarningMessage("Open a Markdown file before running this command.");
        return;
      }

      openCodexPreview(context, editor.document, openFileAtLine);
    })
  );

  context.subscriptions.push(registerMarkdownDocumentLinks());
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
    await vscode.window.showWarningMessage("Codex Markdown link command requires a link string.");
    return;
  }

  const parsed = parseCodexFileLineLink(args[0]);
  if (!parsed) {
    await vscode.window.showWarningMessage(`Unsupported Codex Markdown link: ${args[0]}`);
    return;
  }

  await openFileAtLine(parsed.filePath, parsed.line, parsed.column);
}

function registerMarkdownDocumentLinks(): vscode.Disposable {
  return vscode.languages.registerDocumentLinkProvider(
    { language: "markdown" },
    {
      provideDocumentLinks(document) {
        const links: vscode.DocumentLink[] = [];
        const inlineLinkPattern = /\[[^\]\r\n]+\]\((<[^>\r\n]+>|[^)\s\r\n]+)\)/g;

        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
          const lineText = document.lineAt(lineIndex).text;
          let match: RegExpExecArray | null;

          while ((match = inlineLinkPattern.exec(lineText))) {
            const href = match[1].startsWith("<") && match[1].endsWith(">")
              ? match[1].slice(1, -1)
              : match[1];

            if (!parseCodexFileLineLink(href)) {
              continue;
            }

            const start = new vscode.Position(lineIndex, match.index);
            const end = new vscode.Position(lineIndex, match.index + match[0].length);
            const commandArgs = encodeURIComponent(JSON.stringify([href]));
            const target = vscode.Uri.parse(`command:codexMarkdownLinks.openAtLine?${commandArgs}`);
            const link = new vscode.DocumentLink(new vscode.Range(start, end), target);
            link.tooltip = "Open file at referenced line";
            links.push(link);
          }
        }

        return links;
      }
    }
  );
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
  const config = vscode.workspace.getConfiguration("codexMarkdownLinks");
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

