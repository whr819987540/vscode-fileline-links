import * as vscode from "vscode";
import MarkdownIt from "markdown-it";
import { parseCodexFileLineLink } from "./linkParser";

type OpenFileAtLine = (filePath: string, line: number, column: number) => Promise<void>;

export function openCodexPreview(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  openFileAtLine: OpenFileAtLine
) {
  const panel = vscode.window.createWebviewPanel(
    "codexMarkdownPreview",
    `Codex Preview: ${basename(document.fileName)}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: getLocalResourceRoots(document)
    }
  );

  const render = () => {
    panel.webview.html = renderHtml(document.getText(), panel.webview.cspSource);
  };

  render();

  const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.uri.toString() === document.uri.toString()) {
      render();
    }
  });

  panel.onDidDispose(() => changeSubscription.dispose(), null, context.subscriptions);

  panel.webview.onDidReceiveMessage(async (message: { type?: string; href?: string }) => {
    if (message.type !== "openLink" || typeof message.href !== "string") {
      return;
    }

    const parsed = parseCodexFileLineLink(message.href);
    if (parsed) {
      await openFileAtLine(parsed.filePath, parsed.line, parsed.column);
      return;
    }

    await vscode.env.openExternal(vscode.Uri.parse(message.href));
  }, null, context.subscriptions);
}

function renderHtml(markdown: string, cspSource: string): string {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true
  });

  const body = md.render(markdown);
  const nonce = createNonce();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src 'unsafe-inline' ${cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      box-sizing: border-box;
      max-width: 980px;
      margin: 0 auto;
      padding: 24px 32px 48px;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      line-height: 1.6;
    }
    a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    code,
    pre {
      font-family: var(--vscode-editor-font-family);
    }
    pre {
      overflow: auto;
      padding: 12px;
      background: var(--vscode-textCodeBlock-background);
    }
    blockquote {
      margin-left: 0;
      padding-left: 16px;
      border-left: 4px solid var(--vscode-textBlockQuote-border);
      color: var(--vscode-textBlockQuote-foreground);
    }
  </style>
  <title>Codex Markdown Preview</title>
</head>
<body>
  ${body}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.addEventListener("click", (event) => {
      const anchor = event.target.closest("a[href]");
      if (!anchor) {
        return;
      }

      event.preventDefault();
      vscode.postMessage({
        type: "openLink",
        href: anchor.getAttribute("href")
      });
    });
  </script>
</body>
</html>`;
}

function basename(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

function getLocalResourceRoots(document: vscode.TextDocument): vscode.Uri[] {
  if (document.uri.scheme === "file") {
    return [vscode.Uri.joinPath(document.uri, "..")];
  }
  return [];
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let i = 0; i < 32; i++) {
    value += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return value;
}

