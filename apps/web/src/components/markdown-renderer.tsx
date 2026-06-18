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

function isTableDivider(line: string) {
  return /^\s*\|?[\s:-]+\|[\s|:-]+\|?\s*$/.test(line);
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function listItemClassName(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.startsWith('source snippet:') || normalized.startsWith('citation note:')) {
    return 'rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600';
  }
  return 'text-slate-700';
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
          ? 'text-3xl font-semibold tracking-tight text-ink'
          : level === 2
            ? 'border-b border-slate-200 pb-2 text-2xl font-semibold tracking-tight text-ink'
            : level === 3
              ? 'pt-2 text-xl font-semibold text-ink'
              : 'text-base font-semibold uppercase tracking-[0.12em] text-slate-600';

      blocks.push(
        <div key={`heading-${index}`} className={className}>
          {content}
        </div>,
      );
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s/.test(line)) {
      const ordered = /^\s*\d+\.\s/.test(line);
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const candidate = lines[index].trimEnd();
        if (!candidate.trim()) {
          break;
        }
        if (ordered && /^\s*\d+\.\s/.test(candidate)) {
          const content = candidate.replace(/^\s*\d+\.\s/, '');
          items.push(
            <li key={`item-${index}`} className={listItemClassName(content)}>
              {renderInline(content)}
            </li>,
          );
          index += 1;
          continue;
        }
        if (!ordered && /^\s*[-*]\s+/.test(candidate)) {
          const content = candidate.replace(/^\s*[-*]\s+/, '');
          items.push(
            <li key={`item-${index}`} className={listItemClassName(content)}>
              {renderInline(content)}
            </li>,
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
          className={ordered ? 'list-decimal space-y-2 pl-5 leading-7' : 'list-disc space-y-2 pl-5 leading-7'}
        >
          {items}
        </ListTag>,
      );
      continue;
    }

    if (line.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headers = parseTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }

      blocks.push(
        <div key={`table-${index}`} className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3">
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 text-slate-700">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      if (/^(#{1,4})\s+/.test(lines[index]) || /^\s*[-*]\s+/.test(lines[index]) || /^\s*\d+\.\s/.test(lines[index])) {
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

  return <div className="space-y-5 text-[15px] leading-7">{blocks}</div>;
}
