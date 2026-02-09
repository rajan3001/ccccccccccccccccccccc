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
  return text.split('\n').map(line => {
    const optionPattern = /[A-D]\)\s+\S/g;
    const matches = line.match(optionPattern);
    if (matches && matches.length >= 2) {
      return line.replace(/\s*([B-D]\))\s+/g, '  \n$1 ');
    }
    return line;
  }).join('\n');
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

export { markdownComponents, remarkGfm };
