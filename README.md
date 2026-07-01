# VS Code File Line Links

Open Markdown file-line links such as:

```md
[target markdown](E:/path/to/file.md:12)
[target markdown](E:/path/to/%5Bpaper%5D%20with%20spaces.md:236)
```

The Markdown source is not modified. The extension parses the link target at click time and opens the referenced Markdown file at the requested line.

## Usage

1. To install required packages, run `npm install`.
2. To compile, run `npm run compile`.
3. To run unit tests of the parser, run `npm test`.
4. To run VSCode extension test, run `npm run test:vscode`
5. Launch an Extension Development Host:

   ```powershell
   code --new-window --extensionDevelopmentPath "E:/path/to" "E:/path/to"
   ```

6. Open `test-fixtures/source.md`.
7. Click either the source-editor link or the rendered link in VS Code's built-in Markdown Preview.
8. To generate VSIX, run `npm run package`.

## How it works

The extension does not rewrite Markdown files. It only changes how VS Code handles matching links at runtime.

In the source editor, the extension registers a Markdown `DocumentLinkProvider`. VS Code asks all registered document link providers for clickable ranges in the current document. This extension scans inline Markdown links and looks for absolute Markdown file paths ending in `:line` or `:line:column`, for example:

```md
[target markdown](E:/path/to/%5Bpaper%5D%20with%20spaces.md:236)
```

When a matching link is found, the provider contributes a `command:` target instead of treating the full string as a literal file path. The command decodes the path, opens the referenced Markdown file with `vscode.workspace.openTextDocument`, and calls `vscode.window.showTextDocument` with a selection at the requested line and column.

For rendered Markdown, the extension contributes a Markdown preview `markdown-it` plugin and a preview click script. The plugin marks matching rendered links without modifying the source Markdown. The click script intercepts those links before VS Code's built-in preview treats `E:` as a URI scheme, then dispatches to this extension's `vscode://local.vscode-fileline-links/open?...` URI handler. It also recognizes bare local Markdown paths before the default linkifier can split Windows paths with spaces.

The `File Line Links: Open Preview` command remains available as a standalone preview that uses the same link rewriting logic.

The parser intentionally accepts only local absolute Markdown paths with `.md` or `.markdown` extensions. It rejects URI schemes such as `http:`, `https:`, and `vscode:` so normal external links are not captured.

## Install from VSIX

Build the installable package:

```powershell
npm install
npm run package
```

Install the generated `.vsix` file:

```powershell
code --install-extension .\vscode-fileline-links-0.0.3.vsix
```

After installation, open a Markdown file and use either source-editor `Ctrl+Click` / `Follow Link`, or run:

```text
File Line Links: Open Preview
```

If VS Code's built-in Markdown link handler opens the path as a missing file ending in `:line`, select or copy the file-line link and run:

```text
File Line Links: Copy Command Markdown Link
```

Paste the generated Markdown link back into your document. It uses a `vscode://local.vscode-fileline-links/open?...` target, so normal VS Code installs dispatch directly to this extension instead of the built-in Markdown file-link handler.

## Optional WSL paths

The included test fixture uses a local Windows path under `test-fixtures`.

If VS Code is already connected to WSL, Unix-style absolute links are opened as remote files.

If VS Code is running locally on Windows and links point to WSL paths, set:

```json
{
  "filelineLinks.preferWslForUnixPaths": true,
  "filelineLinks.wslDistro": "Ubuntu"
}
```
