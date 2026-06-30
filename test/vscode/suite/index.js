const assert = require("node:assert/strict");
const path = require("node:path");
const vscode = require("vscode");

const extensionRoot = path.resolve(__dirname, "../../..");
const targetPath = path.join(extensionRoot, "test-fixtures", "[local test] Jump Target With Spaces.md");
const sourcePath = path.join(extensionRoot, "test-fixtures", "source.md");

async function run() {
  await commandOpensWindowsMarkdownPathAtRequestedLine();
  await documentLinkProviderContributesCommandLink();
  await copyCommandMarkdownLinkWritesCommandUri();
  console.log("VS Code integration tests passed: 3");
}

async function commandOpensWindowsMarkdownPathAtRequestedLine() {
  const href = `${targetPath.replace(/\\/g, "/")}:12`;

  await vscode.commands.executeCommand("filelineLinks.openAtLine", href);

  const editor = vscode.window.activeTextEditor;
  assert.ok(editor, "expected an active editor");
  assert.equal(normalizePath(editor.document.uri.fsPath), normalizePath(targetPath));
  assert.equal(editor.selection.active.line, 11);
}

async function documentLinkProviderContributesCommandLink() {
  const uri = vscode.Uri.file(sourcePath);
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);

  const links = await vscode.commands.executeCommand("vscode.executeLinkProvider", uri);

  assert.ok(Array.isArray(links), "expected document links");
  const commandLinks = links.filter((link) => link.target?.scheme === "command"
    && link.target.path === "filelineLinks.openAtLine");
  assert.ok(commandLinks.length >= 2, "expected Codex command document links for Markdown and bare paths");
}

async function copyCommandMarkdownLinkWritesCommandUri() {
  const href = `${targetPath.replace(/\\/g, "/")}:12`;
  await vscode.env.clipboard.writeText(href);
  await vscode.commands.executeCommand("filelineLinks.copyCommandMarkdownLink");

  const text = await vscode.env.clipboard.readText();
  assert.match(text, /^\[\\\[local test\\\] Jump Target With Spaces\.md:12\]\(vscode:\/\/local\.vscode-fileline-links\/open\?/);
  assert.ok(text.includes(new URLSearchParams({ href }).toString()));
}

function normalizePath(value) {
  return path.normalize(value).toLowerCase();
}

module.exports = { run };
