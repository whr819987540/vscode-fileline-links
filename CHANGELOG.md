# Changelog

## 0.0.3

- Support rendered links in VS Code's built-in Markdown Preview by contributing a Markdown preview `markdown-it` plugin.
- Intercept supported rendered file-line links before the built-in preview opens `E:/path/file.md:12` as a literal filename.
- Linkify bare local Markdown file-line paths in preview before the default linkifier can split paths containing spaces.

## 0.0.2

- Keep the extension version at `0.0.2`.
- Activate after VS Code startup and for extension URI callbacks.
- Support source-editor links in file and untitled documents, including bare local Markdown paths such as `E:/path/file.md:12`.
- Add `File Line Links: Copy Command Markdown Link` to generate `vscode://local.vscode-fileline-links/open?...` Markdown links that bypass VS Code's built-in Markdown file-link handler.
- Register a URI handler for generated `vscode://` links and open targets at the requested line and column.
- Run the extension in both UI and workspace extension hosts so commands are available in normal and remote-capable windows.
- Include runtime dependencies in the VSIX package so installed extensions can activate successfully outside the development host.
- Add integration coverage for command-link generation.

## 0.0.1

- Add support for opening Markdown file-line links that end with `:line` or `:line:column`.
- Add editor `Follow Link` support through a Markdown `DocumentLinkProvider`.
- Add a custom Markdown preview command with controlled link handling.
- Add local Windows path fixtures and automated parser/VS Code integration tests.
