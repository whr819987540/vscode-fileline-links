# Codex Markdown File Line Links

Open Codex-style Markdown links such as:

```md
[target markdown](E:/path/to/file.md:12)
[target markdown](E:/path/to/%5Bpaper%5D%20with%20spaces.md:236)
```

The Markdown source is not modified. The extension parses the link target at click time and opens the referenced Markdown file at the requested line.

## Usage

1. Run `npm install`.
2. Run `npm run compile`.
3. Launch an Extension Development Host:

   ```powershell
   code --new-window --extensionDevelopmentPath "E:/path/to" "E:/path/to"
   ```

4. Open `test-fixtures/source.md`.
5. Either click the source-editor link, or run `Codex Markdown Links: Open Preview` and click the rendered link.

## How it works

The extension does not rewrite Markdown files. It only changes how VS Code handles matching links at runtime.

In the source editor, the extension registers a Markdown `DocumentLinkProvider`. VS Code asks all registered document link providers for clickable ranges in the current document. This extension scans inline Markdown links and looks for absolute Markdown file paths ending in `:line` or `:line:column`, for example:

```md
[target markdown](E:/path/to/%5Bpaper%5D%20with%20spaces.md:236)
```

When a matching link is found, the provider contributes a `command:` target instead of treating the full string as a literal file path. The command decodes the path, opens the referenced Markdown file with `vscode.workspace.openTextDocument`, and calls `vscode.window.showTextDocument` with a selection at the requested line and column.

For rendered Markdown, the built-in VS Code Markdown Preview does not expose a supported way to replace its link-open behavior for this non-standard `file.md:line` syntax. The extension therefore provides its own command, `Codex Markdown Links: Open Preview`. This preview renders Markdown in a webview with `markdown-it`, intercepts link clicks inside the webview, sends the clicked `href` back to the extension host, and reuses the same open-at-line command.

The parser intentionally accepts only local absolute Markdown paths with `.md` or `.markdown` extensions. It rejects URI schemes such as `http:`, `https:`, and `vscode:` so normal external links are not captured.

## Install from VSIX

Build the installable package:

```powershell
npm install
npm run package
```

Install the generated `.vsix` file:

```powershell
code --install-extension .\codex-markdown-fileline-links-0.0.1.vsix
```

After installation, open a Markdown file and use either source-editor `Ctrl+Click` / `Follow Link`, or run:

```text
Codex Markdown Links: Open Preview
```

## Optional WSL paths

The included test fixture uses a local Windows path under `test-fixtures`.

If VS Code is already connected to WSL, Unix-style absolute links are opened as remote files.

If VS Code is running locally on Windows and links point to WSL paths, set:

```json
{
  "codexMarkdownLinks.preferWslForUnixPaths": true,
  "codexMarkdownLinks.wslDistro": "Ubuntu"
}
```
