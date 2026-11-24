import assert from "node:assert/strict";
import test from "node:test";
import { extractCoverLetter, isSafeHttpUrl, parseInlineMarkdown, parseMarkdown } from "./markdown.ts";
import { MVP_SAMPLE_PROMPTS } from "./prompts.ts";

test("rejects unsafe link protocols and allows http/https links", () => {
  assert.equal(isSafeHttpUrl("https://futurecv.vn/jobs/1"), true);
  assert.equal(isSafeHttpUrl("http://localhost:5173"), true);
  assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
  assert.equal(isSafeHttpUrl("data:text/html,<script>alert(1)</script>"), false);

  const safeNodes = parseInlineMarkdown("Xem [tại đây](https://futurecv.vn) và [click](javascript:alert(1))");
  assert.deepEqual(safeNodes, [
    { type: "text", text: "Xem " },
    { type: "link", label: "tại đây", href: "https://futurecv.vn" },
    { type: "text", text: " và click" },
  ]);
});

test("keeps raw HTML as plain text and parses headings, lists, code blocks, and tables", () => {
  const md = [
    "# Đánh giá CV",
    "",
    "<script>alert('xss')</script>",
    "",
    "- **Kỹ năng**: `React` và *TypeScript*",
    "1. Bước một",
    "",
    "| Tiêu chí | Kết quả |",
    "| --- | --- |",
    "| React | Đạt |",
    "",
    "```ts",
    "const score = 85;",
    "```",
  ].join("\n");

  const blocks = parseMarkdown(md);
  assert.equal(blocks[0]?.type, "heading");
  assert.equal(blocks[1]?.type, "paragraph");
  assert.equal(blocks[2]?.type, "list");
  assert.equal(blocks[3]?.type, "list");
  assert.equal(blocks[4]?.type, "table");
  assert.equal(blocks[5]?.type, "code");
  if (blocks[1]?.type === "paragraph") {
    assert.deepEqual(blocks[1].lines[0], [{ type: "text", text: "<script>alert('xss')</script>" }]);
  }
  if (blocks[4]?.type === "table") {
    assert.equal(blocks[4].headers.length, 2);
    assert.equal(blocks[4].rows.length, 1);
  }
});

test("extracts Cover Letter body cleanly when present and returns null otherwise", () => {
  const replyWithHeading = [
    "Dưới đây là bản Cover Letter gợi ý theo CV của bạn:",
    "",
    "## Cover Letter",
    "",
    "Dear Hiring Manager,",
    "",
    "I am excited to apply for the Frontend Developer role at FutureCV. With hands-on experience in React and TypeScript, I look forward to contributing to your product team.",
    "",
    "Sincerely,",
    "Nguyen Van A",
    "",
    "---",
    "### Lưu ý chỉnh sửa",
    "- Bạn nên bổ sung số liệu dự án thực tế.",
  ].join("\n");

  const extracted = extractCoverLetter(replyWithHeading);
  assert.ok(extracted);
  assert.ok(extracted.startsWith("Dear Hiring Manager,"));
  assert.ok(extracted.endsWith("Nguyen Van A"));
  assert.equal(extracted.includes("Lưu ý chỉnh sửa"), false);

  const regularReply = "Bạn đang thiếu kinh nghiệm thực tế với Docker và Kubernetes. Hãy thử tự triển khai một dự án nhỏ.";
  assert.equal(extractCoverLetter(regularReply), null);
});

test("provides sample prompts covering all 5 MVP capabilities", () => {
  assert.equal(MVP_SAMPLE_PROMPTS.length, 5);
  assert.deepEqual(
    MVP_SAMPLE_PROMPTS.map((item) => item.id),
    ["match", "skills", "summary", "cover-letter", "roadmap"],
  );
  const coverLetter = MVP_SAMPLE_PROMPTS.find((item) => item.id === "cover-letter");
  assert.ok(coverLetter?.alternatePrompt?.prompt.includes("English"));
});
