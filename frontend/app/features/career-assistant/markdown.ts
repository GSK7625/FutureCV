export type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; children: InlineNode[] }
  | { type: "italic"; children: InlineNode[] }
  | { type: "code"; text: string }
  | { type: "link"; label: string; href: string };

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4; children: InlineNode[] }
  | { type: "paragraph"; lines: InlineNode[][] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "blockquote"; lines: InlineNode[][] }
  | { type: "code"; language: string; code: string }
  | { type: "table"; headers: InlineNode[][]; rows: InlineNode[][][] }
  | { type: "hr" };

export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseInlineMarkdown(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let index = 0;

  const pushText = (chunk: string) => {
    if (!chunk) return;
    const prev = nodes[nodes.length - 1];
    if (prev && prev.type === "text") {
      prev.text += chunk;
    } else {
      nodes.push({ type: "text", text: chunk });
    }
  };

  while (index < text.length) {
    // Inline code: `code`
    if (text[index] === "`") {
      const end = text.indexOf("`", index + 1);
      if (end > index + 1) {
        nodes.push({ type: "code", text: text.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    // Markdown link: [label](url) with balanced parentheses inside url
    if (text[index] === "[") {
      const closeBracket = text.indexOf("]", index + 1);
      if (closeBracket > index + 1 && text[closeBracket + 1] === "(") {
        let depth = 1;
        let closeParen = -1;
        for (let pos = closeBracket + 2; pos < text.length; pos += 1) {
          if (text[pos] === "(") depth += 1;
          else if (text[pos] === ")") {
            depth -= 1;
            if (depth === 0) {
              closeParen = pos;
              break;
            }
          }
        }
        if (closeParen > closeBracket + 2) {
          const label = text.slice(index + 1, closeBracket);
          const rawUrl = text.slice(closeBracket + 2, closeParen).trim();
          if (isSafeHttpUrl(rawUrl)) {
            nodes.push({ type: "link", label, href: rawUrl });
          } else {
            pushText(label);
          }
          index = closeParen + 1;
          continue;
        }
      }
    }

    // Bold: **text** or __text__
    if (text.startsWith("**", index) || text.startsWith("__", index)) {
      const marker = text.slice(index, index + 2);
      const end = text.indexOf(marker, index + 2);
      if (end > index + 2) {
        const inner = text.slice(index + 2, end);
        nodes.push({ type: "bold", children: parseInlineMarkdown(inner) });
        index = end + 2;
        continue;
      }
    }

    // Italic: *text* (only when non-space after opening *)
    if (text[index] === "*" && text[index + 1] && text[index + 1] !== "*" && text[index + 1] !== " ") {
      const end = text.indexOf("*", index + 1);
      if (end > index + 1 && text[end - 1] !== " ") {
        const inner = text.slice(index + 1, end);
        nodes.push({ type: "italic", children: parseInlineMarkdown(inner) });
        index = end + 1;
        continue;
      }
    }

    pushText(text[index]);
    index += 1;
  }

  return nodes;
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const cells = splitTableRow(trimmed);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isBlockStarter(line: string, nextLine?: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^```/.test(trimmed)) return true;
  if (/^#{1,4}\s+/.test(trimmed)) return true;
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return true;
  if (/^>\s?/.test(trimmed)) return true;
  if (/^[-*+]\s+/.test(trimmed)) return true;
  if (/^\d+[.)]\s+/.test(trimmed)) return true;
  if (trimmed.includes("|") && nextLine && isTableSeparator(nextLine)) return true;
  return false;
}

export function parseMarkdown(input: string): MarkdownBlock[] {
  const normalized = input.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block
    const fenceMatch = trimmed.match(/^```([a-zA-Z0-9_-]*)\s*$/);
    if (fenceMatch) {
      const language = fenceMatch[1] || "";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", language, code: codeLines.join("\n") });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({ type: "heading", level, children: parseInlineMarkdown(headingMatch[2]) });
      i += 1;
      continue;
    }

    // Table
    if (trimmed.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(trimmed).map((cell) => parseInlineMarkdown(cell));
      i += 2;
      const rows: InlineNode[][][] = [];
      while (i < lines.length && lines[i].trim().includes("|") && !/^```/.test(lines[i].trim())) {
        rows.push(splitTableRow(lines[i]).map((cell) => parseInlineMarkdown(cell)));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      const quoteLines: InlineNode[][] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^>\s?/, "");
        if (content) quoteLines.push(parseInlineMarkdown(content));
        i += 1;
      }
      if (quoteLines.length) blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: InlineNode[][] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(parseInlineMarkdown(lines[i].trim().replace(/^[-*+]\s+/, "")));
        i += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: InlineNode[][] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(parseInlineMarkdown(lines[i].trim().replace(/^\d+[.)]\s+/, "")));
        i += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // Paragraph
    const paragraphLines: InlineNode[][] = [];
    while (i < lines.length && !isBlockStarter(lines[i], lines[i + 1])) {
      paragraphLines.push(parseInlineMarkdown(lines[i].trim()));
      i += 1;
    }
    if (paragraphLines.length) {
      blocks.push({ type: "paragraph", lines: paragraphLines });
    } else {
      paragraphLines.push(parseInlineMarkdown(trimmed));
      blocks.push({ type: "paragraph", lines: paragraphLines });
      i += 1;
    }
  }

  return blocks;
}

const COVER_LETTER_HEADER_RE = /^(?:#{1,4}\s*|\*{1,2})?(?:cover\s+letter(?:\s*\([^)]*\))?|thư\s+(?:ứng\s+tuyển|xin\s+việc))(?:\*{1,2})?(?:\s*[:\-–—]?\s*)$/i;
const TRAILING_NOTE_RE = /^(?:#{1,4}\s*|\*{1,2})(?:lưu\s+ý|gợi\s+ý|ghi\s+chú|câu\s+hỏi\s+gợi\s+ý|notes?|tips?|next\s+steps?)\b/i;
const SALUTATION_RE = /^(?:dear\s+[^\n]{1,80},|kính\s+gửi\b[^\n]{0,80})/i;
const SIGN_OFF_RE = /^(?:sincerely|best\s+regards|kind\s+regards|warm\s+regards|yours\s+(?:sincerely|faithfully)|trân\s+trọng)\b/i;

/**
 * Trích xuất nội dung Cover Letter sạch (không kèm lời mở đầu/gợi ý chỉnh sửa của trợ lý)
 * khi câu trả lời chứa Cover Letter hợp lệ. Trả về null nếu không phát hiện Cover Letter.
 */
export function extractCoverLetter(markdown: string): string | null {
  const normalized = markdown.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return null;

  const lines = normalized.split("\n");
  const headerIdx = lines.findIndex((line) => COVER_LETTER_HEADER_RE.test(line.trim()));

  if (headerIdx >= 0) {
    const afterHeader = lines.slice(headerIdx + 1);
    while (afterHeader.length > 0 && !afterHeader[0].trim()) {
      afterHeader.shift();
    }

    // If immediately followed by a fenced block, extract that fenced block cleanly.
    if (afterHeader[0]?.trim().startsWith("```")) {
      const endFence = afterHeader.findIndex((line, idx) => idx > 0 && /^```\s*$/.test(line.trim()));
      if (endFence > 1) {
        const fenced = afterHeader.slice(1, endFence).join("\n").trim();
        return fenced.length >= 60 ? fenced : null;
      }
    }

    const collected: string[] = [];
    for (const line of afterHeader) {
      const trimmed = line.trim();
      if (/^---+$/.test(trimmed) || TRAILING_NOTE_RE.test(trimmed)) break;
      collected.push(line);
    }

    const body = collected.join("\n").trim();
    return body.length >= 60 ? body : null;
  }

  // Fallback: detect salutation + sign-off pattern directly in the message.
  const salutationIdx = lines.findIndex((line) => SALUTATION_RE.test(line.trim()));
  if (salutationIdx < 0) return null;

  const remaining = lines.slice(salutationIdx);
  const signOffOffset = remaining.findIndex((line) => SIGN_OFF_RE.test(line.trim()));
  if (signOffOffset < 0) return null;

  const letterLines: string[] = [];
  for (let idx = 0; idx < remaining.length; idx += 1) {
    const trimmed = remaining[idx].trim();
    if (idx > signOffOffset && (/^---+$/.test(trimmed) || TRAILING_NOTE_RE.test(trimmed))) break;
    letterLines.push(remaining[idx]);
  }

  const body = letterLines.join("\n").trim();
  return body.length >= 60 ? body : null;
}
