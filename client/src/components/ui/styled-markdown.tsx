import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mt-6 mb-3 pb-2 border-b border-border text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold mt-5 mb-2 text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold mt-3 mb-1 text-foreground">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed text-foreground/90">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-5 space-y-1 list-disc marker:text-foreground/50">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-5 space-y-1 list-decimal marker:text-foreground/60 marker:font-medium">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 text-foreground/90 leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 pl-4 border-l-4 border-primary/40 bg-primary/5 rounded-r-md py-2 pr-3 text-foreground/80 italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-primary/10">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-foreground border-b border-border">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-sm text-foreground/90 border-b border-border/50">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-muted/30">{children}</tr>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono text-foreground" {...props}>
          {children}
        </code>
      );
    }
    return (
      <div className="my-3 rounded-lg overflow-hidden border border-border">
        <div className="bg-muted/70 px-4 py-1.5 text-xs font-mono text-muted-foreground border-b border-border">
          {className?.replace("language-", "") || "code"}
        </div>
        <pre className="p-4 overflow-x-auto bg-muted/30">
          <code className="text-sm font-mono text-foreground" {...props}>{children}</code>
        </pre>
      </div>
    );
  },
  hr: () => <hr className="my-4 border-border" />,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-primary/50 hover:decoration-primary font-medium">
      {children}
    </a>
  ),
};

function preprocessMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    const mcqPattern = /[A-D]\)\s+\S/g;
    const mcqMatches = line.match(mcqPattern);
    if (mcqMatches && mcqMatches.length >= 2) {
      line = line.replace(/\s*([B-D]\))\s+/g, '  \n$1 ');
    }

    const mixedNumMatch = line.match(/^(\s*)[*\-+]\s+(\d+)\.\s+/);
    if (mixedNumMatch) {
      line = line.replace(/^(\s*)[*\-+]\s+(\d+\.\s+)/, '$1$2');
    }

    if (!mixedNumMatch && line.match(/^(\s*)[*\-+]\s+[a-d]\.\s+/)) {
      line = line.replace(/^(\s*)[*\-+]\s+([a-d]\.\s+)/, '$1$2');
    }

    result.push(line);
  }

  return result.join('\n');
}

interface StyledMarkdownProps {
  children: string;
  className?: string;
}

export function StyledMarkdown({ children, className }: StyledMarkdownProps) {
  const processed = preprocessMarkdown(children);
  return (
    <div className={cn("max-w-none text-sm sm:text-base", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {processed}
      </ReactMarkdown>
    </div>
  );
}

function renderLightMarkdown(text: string): (string | JSX.Element)[] {
  const result: (string | JSX.Element)[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  let key = 0;
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      result.push(<strong key={key++} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>);
    } else {
      result.push(part);
    }
  }
  return result;
}

interface StreamingMarkdownProps {
  content: string;
  className?: string;
}

export function StreamingMarkdown({ content, className }: StreamingMarkdownProps) {
  const lines = content.split("\n");

  return (
    <div className={cn("max-w-none text-sm sm:text-base leading-relaxed", className)}>
      {lines.map((line, i) => {
        const trimmed = line.trimStart();
        const isHeading = trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ");
        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed);

        if (isHeading) {
          const level = trimmed.startsWith("### ") ? 3 : trimmed.startsWith("## ") ? 2 : 1;
          const text = trimmed.replace(/^#{1,3}\s+/, "");
          const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
          const cls = level === 1
            ? "text-lg font-bold mt-5 mb-2 text-foreground"
            : level === 2
            ? "text-base font-semibold mt-4 mb-2 text-foreground"
            : "text-sm font-semibold mt-3 mb-1 text-foreground";
          return <Tag key={i} className={cls}>{renderLightMarkdown(text)}</Tag>;
        }

        if (isBullet) {
          const bulletText = trimmed.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
          return (
            <div key={i} className="flex gap-2 ml-4 mb-1 text-foreground/90">
              <span className="text-foreground/50 flex-shrink-0">{/^\d+\./.test(trimmed) ? trimmed.match(/^\d+/)?.[0] + "." : "\u2022"}</span>
              <span>{renderLightMarkdown(bulletText)}</span>
            </div>
          );
        }

        if (trimmed === "") {
          return <div key={i} className="h-3" />;
        }

        return (
          <p key={i} className="mb-2 text-foreground/90">
            {renderLightMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

export { markdownComponents, remarkGfm };
