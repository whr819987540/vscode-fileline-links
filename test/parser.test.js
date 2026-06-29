const assert = require("node:assert/strict");
const path = require("node:path");
const { parseCodexFileLineLink } = require("../out/linkParser");

const extensionRoot = path.resolve(__dirname, "..");
const targetPath = path.join(extensionRoot, "test-fixtures", "[local test] Jump Target With Spaces.md").replace(/\\/g, "/");
const encodedTargetPath = encodeURI(targetPath);

const tests = [
  {
    name: "encoded Windows Markdown path with spaces, brackets, and line",
    input: `${encodedTargetPath}:12`,
    expected: {
      filePath: targetPath,
      line: 12,
      column: 1
    }
  },
  {
    name: "Windows Markdown path with line and column",
    input: "E:/D%E7%9B%98%E8%BF%81%E7%A7%BB%E6%96%87%E4%BB%B6/code/projects/codex-markdown-fileine-links/test-fixtures/target.md:12:3",
    expected: {
      filePath: "E:/D盘迁移文件/code/projects/codex-markdown-fileine-links/test-fixtures/target.md",
      line: 12,
      column: 3
    }
  },
  {
    name: "angle-bracket wrapped link",
    input: `<${targetPath}:9>`,
    expected: {
      filePath: targetPath,
      line: 9,
      column: 1
    }
  },
  {
    name: "reject vscode scheme",
    input: "vscode://file/E:/work/target.md:9",
    expected: undefined
  },
  {
    name: "reject non-markdown file",
    input: "E:/work/target.txt:9",
    expected: undefined
  }
];

for (const test of tests) {
  assert.deepEqual(parseCodexFileLineLink(test.input), test.expected, test.name);
}

console.log(`parser tests passed: ${tests.length}`);
