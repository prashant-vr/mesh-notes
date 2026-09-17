# Notes & Writing Guide

Mesh Notes features a hybrid WYSIWYG markdown editor that combines the simplicity of plain text with the convenience of visual formatting tools.

---

## Formatting Toolbar & Live Preview

At the top of the note composer and Daily Journal editor, you will find a formatting toolbar:
- **Bold (`B`)**, **Italic (`I`)**, **Strikethrough (`S`)**, and **Inline Code (`</>`)**.
- **Headings**: H1, H2, and H3 for structuring long notes.
- **Lists**: Bullet lists, numbered lists, and interactive task checklists.
- **Tables & Dividers**: Insert 3-column markdown tables or horizontal divider lines with 1 click.
- **Write / Preview Tabs**: Toggle between editing markdown and viewing live rendered typography.

---

## Interactive Task Checklists

You can write checklists using standard markdown:

```markdown
- [ ] Research domain registrars
- [ ] Set up backup cron job
- [x] Test SQLite database connection
```

> [!TIP]
> You don't need to enter edit mode to complete a task! Simply click any checkbox directly in your stream or in preview mode to tick it off. Mesh Notes updates the note in place.

---

## Notion-Style Slash (`/`) Commands

Type `/` on any new line to open the quick insert popover menu:
- `/table` inserts a formatted markdown table.
- `/h1`, `/h2`, `/h3` inserts section headings.
- `/bullet` or `/numbered` starts an auto-incrementing list.
- `/image` opens the device image picker.
- `/ai` opens the AI assistant prompt window.

---

## Smart List Continuation

When typing lists, press `Enter` to automatically create the next list item:
- Pressing `Enter` after `- [ ] Buy milk` creates a new checkbox: `- [ ] `.
- Pressing `Enter` after `1. Step one` creates `2. `.
- Pressing `Enter` on an empty bullet line automatically clears the marker, returning to normal text.
- Press `Tab` to indent 2 spaces, or `Shift + Tab` to un-indent.

---

## Images & File Attachments

You can attach images, screenshots, and diagrams in three ways:
1. **Paste**: Take a screenshot and press `Ctrl + V` (or `Cmd + V`) inside the note composer.
2. **Drag and Drop**: Drag an image from your desktop directly onto the note editor.
3. **Button**: Click the Image icon in the toolbar to select a file from your device.

Images are saved securely in your server's `/uploads` folder and linked directly into your note markdown.
