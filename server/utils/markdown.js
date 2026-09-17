// Lean, zero-dependency Markdown-to-HTML parser for SSR documentation

const escapeHtml = (str) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const renderMarkdown = (markdown) => {
  if (!markdown) return { html: '', toc: [] };

  const toc = [];
  const lines = markdown.split('\n');
  const output = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  let inList = false;
  let listType = 'ul';
  let inTable = false;
  let tableHeader = true;

  const closeList = () => {
    if (inList) {
      output.push(`</${listType}>`);
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      output.push('</tbody></table>');
      inTable = false;
      tableHeader = true;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        output.push(`<pre><code class="language-${codeLang}">${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
      } else {
        closeList();
        closeTable();
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim().toLowerCase();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      closeList();
      closeTable();
      continue;
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      closeList();
      closeTable();
      output.push('<hr />');
      continue;
    }

    // Callout Box: > [!NOTE], > [!TIP], > [!WARNING]
    const calloutMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*(.*)$/i);
    if (calloutMatch) {
      closeList();
      closeTable();
      const type = calloutMatch[1].toLowerCase();
      const firstLine = calloutMatch[2];
      const calloutClass = type === 'tip' ? 'callout-tip' : type === 'warning' ? 'callout-warning' : 'callout-note';
      output.push(`<div class="callout ${calloutClass}"><strong>${calloutMatch[1]}:</strong> ${firstLine ? parseInline(firstLine) : ''}`);
      
      // Consume succeeding blockquote lines
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++;
        const nextContent = lines[i].trim().replace(/^>\s*/, '');
        output.push(`<p>${parseInline(nextContent)}</p>`);
      }
      output.push('</div>');
      continue;
    }

    // Standard Blockquote
    if (trimmed.startsWith('>')) {
      closeList();
      closeTable();
      const quoteText = trimmed.replace(/^>\s*/, '');
      output.push(`<blockquote><p>${parseInline(quoteText)}</p></blockquote>`);
      continue;
    }

    // Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      closeList();
      // Separator row e.g. |---|---|
      if (/^\|(\s*[-:]+[-|\s:]*)\|$/.test(trimmed)) {
        continue;
      }

      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => parseInline(c.trim()));

      if (!inTable) {
        inTable = true;
        tableHeader = true;
        output.push('<table><thead><tr>');
        cells.forEach(c => output.push(`<th>${c}</th>`));
        output.push('</tr></thead><tbody>');
        tableHeader = false;
      } else {
        output.push('<tr>');
        cells.forEach(c => output.push(`<td>${c}</td>`));
        output.push('</tr>');
      }
      continue;
    } else {
      closeTable();
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      closeTable();
      const level = headingMatch[1].length;
      const rawText = headingMatch[2].trim();
      const cleanText = rawText.replace(/\*\*|\*|`|\[.*?\]\(.*?\)/g, '');
      const id = slugify(cleanText);

      if (level === 2 || level === 3) {
        toc.push({ level, title: cleanText, id });
      }

      output.push(`<h${level} id="${id}"><a href="#${id}" class="heading-anchor">${parseInline(rawText)}</a></h${level}>`);
      continue;
    }

    // Bullet Lists (- or *)
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bulletMatch) {
      closeTable();
      const itemContent = bulletMatch[2];

      // Task checklist: - [ ] or - [x]
      const taskMatch = itemContent.match(/^\[([ xX])\]\s+(.*)$/);
      let contentHtml;
      if (taskMatch) {
        const isChecked = taskMatch[1].toLowerCase() === 'x';
        contentHtml = `<input type="checkbox" disabled ${isChecked ? 'checked' : ''} /> <span>${parseInline(taskMatch[2])}</span>`;
      } else {
        contentHtml = parseInline(itemContent);
      }

      if (!inList || listType !== 'ul') {
        closeList();
        inList = true;
        listType = 'ul';
        output.push('<ul>');
      }
      output.push(`<li>${contentHtml}</li>`);
      continue;
    }

    // Numbered Lists (1. )
    const numMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (numMatch) {
      closeTable();
      if (!inList || listType !== 'ol') {
        closeList();
        inList = true;
        listType = 'ol';
        output.push('<ol>');
      }
      output.push(`<li>${parseInline(numMatch[2])}</li>`);
      continue;
    }

    // Paragraph
    closeList();
    closeTable();
    output.push(`<p>${parseInline(trimmed)}</p>`);
  }

  closeList();
  closeTable();

  return {
    html: output.join('\n'),
    toc
  };
};

const parseInline = (text) => {
  let res = escapeHtml(text);

  // Images: ![alt](url)
  res = res.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="doc-img" />');

  // Links: [text](url)
  res = res.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bold: **text** or __text__
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
  res = res.replace(/_(.*?)_/g, '<em>$1</em>');

  // Strikethrough: ~~text~~
  res = res.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // Inline code: `text`
  res = res.replace(/`(.*?)`/g, '<code>$1</code>');

  return res;
};
