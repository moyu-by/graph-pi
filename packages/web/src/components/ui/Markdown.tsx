import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export function Markdown({ content }: Props) {
  return (
    <div className="markdown-content text-sm text-fg-primary leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="text-base font-semibold mb-2 mt-3 first:mt-0 bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-accent">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-medium mb-2 mt-3 first:mt-0 text-fg-primary">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-fg-primary">{children}</li>,
          code: ({ className, children }) => {
            // A fenced block with no language tag (bare ```) never gets a
            // "language-*" className, so that check alone misclassified it
            // as inline — losing `pre`'s whitespace/newline preservation and
            // collapsing multi-line content (e.g. ascii diagrams) onto one
            // line. Inline code spans can never contain a literal newline
            // (not representable in Markdown's inline syntax), so treating
            // any multi-line content as block-level is a safe, correct check.
            const isBlock = className?.includes("language-") || String(children).includes("\n");
            if (isBlock) {
              return (
                <pre className="bg-bg-surface border border-border-subtle rounded-lg p-3 mb-2 overflow-x-auto">
                  <code className="text-xs font-mono text-fg-secondary">{children}</code>
                </pre>
              );
            }
            return (
              <code className="bg-accent-muted/50 border border-accent/10 rounded-md px-1.5 py-0.5 text-xs font-mono text-accent">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 pl-3 mb-2 text-fg-secondary italic" style={{ borderColor: "var(--accent)" }}>
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover underline decoration-accent/30 hover:decoration-accent transition-colors"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full border border-border-subtle rounded-lg text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border-subtle" style={{ background: "var(--bg-elevated)" }}>{children}</thead>
          ),
          tbody: ({ children }) => <tbody className="divide-y divide-border-subtle">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-bg-hover/50">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-1.5 text-left font-medium text-fg-secondary">{children}</th>
          ),
          td: ({ children }) => <td className="px-3 py-1.5 text-fg-primary">{children}</td>,
          hr: () => <hr className="border-border-subtle my-3" />,
          strong: ({ children }) => <strong className="font-semibold text-fg-primary">{children}</strong>,
          em: ({ children }) => <em className="italic text-fg-secondary">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
