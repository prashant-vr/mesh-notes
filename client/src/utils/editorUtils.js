// Reusable WYSIWYG & Markdown editor formatting helpers

export const applyFormat = (textarea, type) => {
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);

  let replacement = '';
  let newCursorStart = start;
  let newCursorEnd = end;

  switch (type) {
    case 'bold': {
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        replacement = selected.slice(2, -2);
        newCursorEnd = start + replacement.length;
      } else {
        replacement = `**${selected || 'bold text'}**`;
        newCursorStart = selected ? start : start + 2;
        newCursorEnd = selected ? start + replacement.length : start + 2 + 'bold text'.length;
      }
      break;
    }
    case 'italic': {
      if (selected.startsWith('*') && selected.endsWith('*') && selected.length >= 2) {
        replacement = selected.slice(1, -1);
        newCursorEnd = start + replacement.length;
      } else {
        replacement = `*${selected || 'italic text'}*`;
        newCursorStart = selected ? start : start + 1;
        newCursorEnd = selected ? start + replacement.length : start + 1 + 'italic text'.length;
      }
      break;
    }
    case 'strike': {
      if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length >= 4) {
        replacement = selected.slice(2, -2);
        newCursorEnd = start + replacement.length;
      } else {
        replacement = `~~${selected || 'strikethrough'}~~`;
        newCursorStart = selected ? start : start + 2;
        newCursorEnd = selected ? start + replacement.length : start + 2 + 'strikethrough'.length;
      }
      break;
    }
    case 'code': {
      if (selected.includes('\n')) {
        replacement = `\`\`\`\n${selected || '// code here'}\n\`\`\`\n`;
        newCursorStart = start + 4;
        newCursorEnd = start + 4 + (selected || '// code here').length;
      } else if (selected.startsWith('`') && selected.endsWith('`') && selected.length >= 2) {
        replacement = selected.slice(1, -1);
        newCursorEnd = start + replacement.length;
      } else {
        replacement = `\`${selected || 'code'}\``;
        newCursorStart = selected ? start : start + 1;
        newCursorEnd = selected ? start + replacement.length : start + 1 + 'code'.length;
      }
      break;
    }
    case 'h1':
    case 'h2':
    case 'h3': {
      const prefix = type === 'h1' ? '# ' : type === 'h2' ? '## ' : '### ';
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = text.indexOf('\n', end);
      const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
      const currentLine = text.slice(lineStart, actualLineEnd);
      const strippedLine = currentLine.replace(/^#{1,6}\s*/, '');
      const newLine = `${prefix}${strippedLine}`;

      const updatedText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
      textarea.value = updatedText;
      const cursorOffset = lineStart + newLine.length;
      textarea.focus();
      textarea.setSelectionRange(cursorOffset, cursorOffset);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return updatedText;
    }
    case 'bullet':
    case 'numbered':
    case 'task': {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = text.indexOf('\n', end);
      const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
      const lines = text.slice(lineStart, actualLineEnd).split('\n');

      const newLines = lines.map((line, idx) => {
        const stripped = line.replace(/^([-*+]|\d+\.)\s*(\[[ xX]\])?\s*/, '');
        if (type === 'bullet') return `- ${stripped}`;
        if (type === 'numbered') return `${idx + 1}. ${stripped}`;
        if (type === 'task') return `- [ ] ${stripped}`;
        return line;
      });

      const joined = newLines.join('\n');
      const updatedText = text.slice(0, lineStart) + joined + text.slice(actualLineEnd);
      textarea.value = updatedText;
      textarea.focus();
      textarea.setSelectionRange(lineStart + joined.length, lineStart + joined.length);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return updatedText;
    }
    case 'quote': {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = text.indexOf('\n', end);
      const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
      const lines = text.slice(lineStart, actualLineEnd).split('\n');
      const newLines = lines.map((line) => {
        if (line.startsWith('> ')) return line.slice(2);
        return `> ${line}`;
      });
      const joined = newLines.join('\n');
      const updatedText = text.slice(0, lineStart) + joined + text.slice(actualLineEnd);
      textarea.value = updatedText;
      textarea.focus();
      textarea.setSelectionRange(lineStart + joined.length, lineStart + joined.length);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return updatedText;
    }
    case 'link': {
      const url = 'https://';
      if (selected) {
        replacement = `[${selected}](${url})`;
        newCursorStart = start + selected.length + 3;
        newCursorEnd = newCursorStart + url.length;
      } else {
        replacement = `[link title](${url})`;
        newCursorStart = start + 1;
        newCursorEnd = start + 11;
      }
      break;
    }
    case 'table': {
      replacement = `\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Item 1 | Item 2 | Item 3 |\n`;
      newCursorStart = start + replacement.length;
      newCursorEnd = newCursorStart;
      break;
    }
    case 'hr': {
      replacement = `\n\n---\n\n`;
      newCursorStart = start + replacement.length;
      newCursorEnd = newCursorStart;
      break;
    }
    default:
      return;
  }

  const updatedText = text.slice(0, start) + replacement + text.slice(end);
  textarea.value = updatedText;
  textarea.focus();
  textarea.setSelectionRange(newCursorStart, newCursorEnd);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  return updatedText;
};

export const handleEditorKeyDown = (e, textarea, setContent) => {
  if (!textarea) return false;

  // 1. Keyboard Shortcuts (Cmd / Ctrl)
  if (e.metaKey || e.ctrlKey) {
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      const updated = applyFormat(textarea, 'bold');
      if (updated !== undefined && setContent) setContent(updated);
      return true;
    }
    if (key === 'i') {
      e.preventDefault();
      const updated = applyFormat(textarea, 'italic');
      if (updated !== undefined && setContent) setContent(updated);
      return true;
    }
    if (key === 'k') {
      e.preventDefault();
      const updated = applyFormat(textarea, 'link');
      if (updated !== undefined && setContent) setContent(updated);
      return true;
    }
    if (key === 'e') {
      e.preventDefault();
      const updated = applyFormat(textarea, 'code');
      if (updated !== undefined && setContent) setContent(updated);
      return true;
    }
  }

  // 2. Tab / Shift+Tab Indent
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    if (e.shiftKey) {
      // Un-indent 2 spaces
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      if (text.slice(lineStart, lineStart + 2) === '  ') {
        const updated = text.slice(0, lineStart) + text.slice(lineStart + 2);
        textarea.value = updated;
        textarea.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        if (setContent) setContent(updated);
        return true;
      }
    } else {
      // Indent 2 spaces
      const updated = text.slice(0, start) + '  ' + text.slice(end);
      textarea.value = updated;
      textarea.setSelectionRange(start + 2, start + 2);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (setContent) setContent(updated);
      return true;
    }
  }

  // 3. Smart Enter (Auto-continue - [ ], -, 1.)
  if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
    const cursor = textarea.selectionStart;
    const text = textarea.value;
    const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
    const currentLine = text.slice(lineStart, cursor);

    // Empty task line? Delete prefix on enter
    if (/^\s*- \[[ xX]\]\s*$/.test(currentLine)) {
      e.preventDefault();
      const updated = text.slice(0, lineStart) + text.slice(cursor);
      textarea.value = updated;
      textarea.setSelectionRange(lineStart, lineStart);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (setContent) setContent(updated);
      return true;
    }

    // Task list continuation: "- [ ] "
    const taskMatch = currentLine.match(/^(\s*)- \[[ xX]\]\s+(.+)$/);
    if (taskMatch) {
      e.preventDefault();
      const indent = taskMatch[1] || '';
      const insertion = `\n${indent}- [ ] `;
      const updated = text.slice(0, cursor) + insertion + text.slice(cursor);
      textarea.value = updated;
      const newPos = cursor + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (setContent) setContent(updated);
      return true;
    }

    // Empty bullet line? Delete prefix on enter
    if (/^\s*[-*+]\s*$/.test(currentLine)) {
      e.preventDefault();
      const updated = text.slice(0, lineStart) + text.slice(cursor);
      textarea.value = updated;
      textarea.setSelectionRange(lineStart, lineStart);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (setContent) setContent(updated);
      return true;
    }

    // Bullet continuation: "- "
    const bulletMatch = currentLine.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      e.preventDefault();
      const indent = bulletMatch[1] || '';
      const insertion = `\n${indent}- `;
      const updated = text.slice(0, cursor) + insertion + text.slice(cursor);
      textarea.value = updated;
      const newPos = cursor + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (setContent) setContent(updated);
      return true;
    }

    // Numbered list continuation: "1. " -> "2. "
    const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numMatch) {
      e.preventDefault();
      const indent = numMatch[1] || '';
      const nextNum = parseInt(numMatch[2], 10) + 1;
      const insertion = `\n${indent}${nextNum}. `;
      const updated = text.slice(0, cursor) + insertion + text.slice(cursor);
      textarea.value = updated;
      const newPos = cursor + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (setContent) setContent(updated);
      return true;
    }

    // Blockquote continuation: "> "
    const quoteMatch = currentLine.match(/^(\s*)>\s+(.+)$/);
    if (quoteMatch) {
      e.preventDefault();
      const indent = quoteMatch[1] || '';
      const insertion = `\n${indent}> `;
      const updated = text.slice(0, cursor) + insertion + text.slice(cursor);
      textarea.value = updated;
      const newPos = cursor + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (setContent) setContent(updated);
      return true;
    }
  }

  return false;
};
