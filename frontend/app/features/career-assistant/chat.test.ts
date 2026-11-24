import assert from "node:assert/strict";
import test from "node:test";
import { prepareChat } from "./chat.ts";

test("keeps the last 20 messages within Python limits without changing stored history", () => {
  const history = Array.from({ length: 24 }, (_, index) => ({ role: "assistant" as const, content: `${index}:` + "a".repeat(5000) }));
  const request = prepareChat(" Advice ", history, "cv-id", "job-id");
  assert.equal(request.message, "Advice");
  assert.equal(request.history.length, 20);
  assert.ok(request.history[0].content.startsWith("4:"));
  assert.equal(request.history[0].content.length, 4000);
  assert.ok(history[0].content.length > 4000);
  assert.equal(request.cvId, "cv-id");
  assert.equal(request.jobId, "job-id");
});

test("rejects blank and oversized questions", () => {
  assert.throws(() => prepareChat(" ", []));
  assert.throws(() => prepareChat("a".repeat(4001), []));
  assert.equal(prepareChat("a".repeat(4000), []).message.length, 4000);
  assert.equal(prepareChat("Hello", [], "", "", "conv-123").conversationId, "conv-123");
});
