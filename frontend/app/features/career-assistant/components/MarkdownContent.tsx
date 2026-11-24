import { Fragment, useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { parseMarkdown, type InlineNode } from "../markdown";

function renderInlineNodes(nodes: InlineNode[], keyPrefix: string) {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.text}</Fragment>;
      case "bold":
        return (
          <strong key={key} className="font-semibold text-navy">
            {renderInlineNodes(node.children, key)}
          </strong>
        );
      case "italic":
        return (
          <em key={key} className="italic">
            {renderInlineNodes(node.children, key)}
          </em>
        );
      case "code":
        return (
          <code
            key={key}
            className="rounded-tag bg-surface-high/80 px-1.5 py-0.5 font-mono text-[0.85em] text-navy"
          >
            {node.text}
          </code>
        );
      case "link":
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-navy underline decoration-gold underline-offset-2 hover:text-gold"
          >
            {node.label}
          </a>
        );
    }
  });
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable in restricted context.
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-default border border-border-subtle bg-surface-low">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-1.5 text-label-sm text-ink-muted">
        <span className="font-mono lowercase">{language || "văn bản"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-tag px-2 py-0.5 text-label-sm font-medium text-navy hover:bg-navy/5"
        >
          {copied ? <IconCheck size={13} className="text-success" /> : <IconCopy size={13} />}
          <span>{copied ? "Đã chép" : "Chép"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownContent({ content }: { content: string }) {
  const blocks = parseMarkdown(content);

  if (!blocks.length) {
    return <p className="whitespace-pre-wrap break-words text-label leading-relaxed text-ink-variant">{content}</p>;
  }

  return (
    <div className="space-y-2.5 text-label leading-relaxed text-ink-variant">
      {blocks.map((block, index) => {
        const key = `md-${index}`;
        switch (block.type) {
          case "heading": {
            const headingClasses: Record<1 | 2 | 3 | 4, string> = {
              1: "mt-3 text-body-lg font-bold text-navy",
              2: "mt-3 text-body font-bold text-navy",
              3: "mt-2.5 text-label font-bold text-navy",
              4: "mt-2 text-label font-semibold text-navy-secondary",
            };
            const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
            return (
              <Tag key={key} className={headingClasses[block.level]}>
                {renderInlineNodes(block.children, key)}
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p key={key} className="break-words">
                {block.lines.map((line, lineIdx) => (
                  <Fragment key={`${key}-l-${lineIdx}`}>
                    {lineIdx > 0 && <br />}
                    {renderInlineNodes(line, `${key}-l-${lineIdx}`)}
                  </Fragment>
                ))}
              </p>
            );

          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag
                key={key}
                className={
                  block.ordered
                    ? "ml-5 list-decimal space-y-1.5 marker:font-semibold marker:text-navy"
                    : "ml-5 list-disc space-y-1.5 marker:text-gold"
                }
              >
                {block.items.map((item, itemIdx) => (
                  <li key={`${key}-i-${itemIdx}`} className="break-words pl-1">
                    {renderInlineNodes(item, `${key}-i-${itemIdx}`)}
                  </li>
                ))}
              </ListTag>
            );
          }

          case "blockquote":
            return (
              <blockquote
                key={key}
                className="rounded-r-default border-l-3 border-gold bg-gold/5 px-3.5 py-2 text-ink-variant"
              >
                {block.lines.map((line, lineIdx) => (
                  <p key={`${key}-q-${lineIdx}`} className="break-words">
                    {renderInlineNodes(line, `${key}-q-${lineIdx}`)}
                  </p>
                ))}
              </blockquote>
            );

          case "code":
            return <CodeBlock key={key} language={block.language} code={block.code} />;

          case "table":
            return (
              <div key={key} className="my-2 overflow-x-auto rounded-default border border-border-subtle">
                <table className="w-full border-collapse text-left text-label-sm">
                  <thead className="bg-surface-low text-navy">
                    <tr>
                      {block.headers.map((header, hIdx) => (
                        <th key={`${key}-h-${hIdx}`} className="border-b border-border-subtle px-3 py-2 font-semibold">
                          {renderInlineNodes(header, `${key}-h-${hIdx}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-surface">
                    {block.rows.map((row, rIdx) => (
                      <tr key={`${key}-r-${rIdx}`}>
                        {block.headers.map((_, cIdx) => (
                          <td key={`${key}-r-${rIdx}-c-${cIdx}`} className="px-3 py-2 align-top text-ink-variant">
                            {row[cIdx] ? renderInlineNodes(row[cIdx], `${key}-r-${rIdx}-c-${cIdx}`) : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "hr":
            return <hr key={key} className="my-3 border-border-subtle" />;
        }
      })}
    </div>
  );
}
