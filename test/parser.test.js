const assert = require("node:assert/strict");
const path = require("node:path");
const MarkdownIt = require("markdown-it");
const { parseCodexFileLineLink } = require("../out/linkParser");
const extendMarkdownIt = require("../out/markdownItPlugin").default;

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
    input: "E:/D%E7%9B%98%E8%BF%81%E7%A7%BB%E6%96%87%E4%BB%B6/code/projects/vscode-fileline-links/test-fixtures/target.md:12:3",
    expected: {
      filePath: "E:/D盘迁移文件/code/projects/vscode-fileline-links/test-fixtures/target.md",
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

const md = new MarkdownIt({ html: false, linkify: true }).use(extendMarkdownIt);
const rendered = md.render([
  `[target markdown](${encodedTargetPath}:12)`,
  "",
  `${targetPath}:12`
].join("\n"));

assert.ok(rendered.includes(`data-fileline-href="${encodedTargetPath}:12"`), "expected Markdown preview inline link to preserve file-line target");
assert.ok(rendered.includes(`data-fileline-href="${targetPath}:12"`), "expected Markdown preview bare path to preserve file-line target");
assert.ok(!rendered.includes("http://Spaces.md:12"), "expected bare path not to be split by default linkify");

console.log(`parser/render tests passed: ${tests.length + 3}`);
