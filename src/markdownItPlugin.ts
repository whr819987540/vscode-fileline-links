import MarkdownIt from "markdown-it";
import { parseCodexFileLineLink, supportedFileExtensionPattern } from "./linkParser";

const bareLinkPattern = new RegExp(
  `(?:[a-zA-Z]:[\\\\/]|/)[^\\r\\n]*?\\.(?:${supportedFileExtensionPattern}):\\d+(?::\\d+)?`,
  "gi"
);

export default function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
  md.inline.ruler.before("text", "filelineLinksBareLinks", filelineBareLinkRule);
  md.core.ruler.after("linkify", "filelineLinksCommandUris", rewriteFileLineLinks);
  md.core.ruler.after("filelineLinksCommandUris", "filelineLinksBareLinkify", linkifyBareTextTokens);
  return md;
}

export function toExtensionOpenUri(href: string): string | undefined {
  const parsed = parseCodexFileLineLink(href);
  if (!parsed) {
    return undefined;
  }

  const params = new URLSearchParams({ href });
  return `vscode://local.vscode-fileline-links/open?${params.toString()}`;
}

function filelineBareLinkRule(state: MarkdownIt.StateInline, silent: boolean): boolean {
  const match = findBareLinkAt(state.src, state.pos);
  if (!match) {
    return false;
  }

  if (!silent) {
    const open = state.push("link_open", "a", 1);
    open.attrSet("href", toExtensionOpenUri(match) ?? match);
    open.attrSet("title", "Open file at referenced line");

    const text = state.push("text", "", 0);
    text.content = match;

    state.push("link_close", "a", -1);
  }

  state.pos += match.length;
  return true;
}

function rewriteFileLineLinks(state: MarkdownIt.StateCore) {
  visitInlineTokens(state.tokens, (children) => {
    for (const token of children) {
      if (token.type !== "link_open") {
        continue;
      }

      const href = token.attrGet("href");
      if (!href) {
        continue;
      }

      const extensionUri = toExtensionOpenUri(href);
      if (extensionUri) {
        token.attrSet("data-fileline-href", href);
        token.attrSet("title", "Open file at referenced line");
      }
    }
  });
}

function linkifyBareTextTokens(state: MarkdownIt.StateCore) {
  visitInlineTokens(state.tokens, (children) => {
    for (let index = 0; index < children.length; index++) {
      const token = children[index];
      if (token.type !== "text" || !bareLinkPattern.test(token.content)) {
        bareLinkPattern.lastIndex = 0;
        continue;
      }

      const replacement = tokenizeBareLinks(state, token);
      if (replacement.length > 1) {
        children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }
    }
  });
}

function tokenizeBareLinks(state: MarkdownIt.StateCore, token: MarkdownIt.Token): MarkdownIt.Token[] {
  const result: MarkdownIt.Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  bareLinkPattern.lastIndex = 0;

  while ((match = bareLinkPattern.exec(token.content))) {
    const href = match[0];
    const extensionUri = toExtensionOpenUri(href);
    if (!extensionUri) {
      continue;
    }

    if (match.index > lastIndex) {
      result.push(createTextToken(state, token.content.slice(lastIndex, match.index)));
    }

    const open = new state.Token("link_open", "a", 1);
    open.attrSet("href", href);
    open.attrSet("data-fileline-href", href);
    open.attrSet("title", "Open file at referenced line");
    result.push(open);
    result.push(createTextToken(state, href));
    result.push(new state.Token("link_close", "a", -1));
    lastIndex = match.index + href.length;
  }

  if (lastIndex === 0) {
    return [token];
  }

  if (lastIndex < token.content.length) {
    result.push(createTextToken(state, token.content.slice(lastIndex)));
  }

  return result;
}

function createTextToken(state: MarkdownIt.StateCore, content: string): MarkdownIt.Token {
  const token = new state.Token("text", "", 0);
  token.content = content;
  return token;
}

function visitInlineTokens(tokens: MarkdownIt.Token[], visitor: (children: MarkdownIt.Token[]) => void) {
  for (const token of tokens) {
    if (token.type === "inline" && token.children) {
      visitor(token.children);
    }
    if (token.children) {
      visitInlineTokens(token.children, visitor);
    }
  }
}

function findBareLinkAt(source: string, position: number): string | undefined {
  bareLinkPattern.lastIndex = position;
  const match = bareLinkPattern.exec(source);
  if (!match || match.index !== position) {
    return undefined;
  }
  return parseCodexFileLineLink(match[0]) ? match[0] : undefined;
}
