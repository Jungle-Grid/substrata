import type { ReactNode } from 'react';

function renderInline(text: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  match = pattern.exec(text);
  while (match) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${match.index}-strong`}>
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`${match.index}-code`}
          className="rounded bg-slate-100 px-1 py-0.5 text-[0.95em] text-ink"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }

    lastIndex = match.index + token.length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function MarkdownRenderer({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2]);
      const className =
        level === 1
          ? 'text-2xl font-semibold text-ink'
          : level === 2
            ? 'text-xl font-semibold text-ink'
            : level === 3
              ? 'text-lg font-semibold text-ink'
              : 'text-base font-semibold text-ink';

      blocks.push(
        <div key={`heading-${index}`} className={className}>
          {content}
        </div>,
      );
      index += 1;
      continue;
    }

    if (/^- /.test(line) || /^\d+\.\s/.test(line)) {
      const ordered = /^\d+\.\s/.test(line);
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const candidate = lines[index].trimEnd();
        if (!candidate.trim()) {
          break;
        }
        if (ordered && /^\d+\.\s/.test(candidate)) {
          items.push(
            <li key={`item-${index}`}>{renderInline(candidate.replace(/^\d+\.\s/, ''))}</li>,
          );
          index += 1;
          continue;
        }
        if (!ordered && /^- /.test(candidate)) {
          items.push(
            <li key={`item-${index}`}>{renderInline(candidate.replace(/^- /, ''))}</li>,
          );
          index += 1;
          continue;
        }
        break;
      }

      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag
          key={`list-${index}`}
          className={ordered ? 'list-decimal space-y-2 pl-5' : 'list-disc space-y-2 pl-5'}
        >
          {items}
        </ListTag>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      if (/^(#{1,4})\s+/.test(lines[index]) || /^- /.test(lines[index]) || /^\d+\.\s/.test(lines[index])) {
        break;
      }
      paragraph.push(lines[index].trim());
      index += 1;
    }

    blocks.push(
      <p key={`paragraph-${index}`} className="leading-7 text-slate-700">
        {renderInline(paragraph.join(' '))}
      </p>,
    );
  }

  return <div className="space-y-4 text-sm">{blocks}</div>;
}
