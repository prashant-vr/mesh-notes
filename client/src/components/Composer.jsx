import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Folder,
  Tag as TagIcon,
  Globe,
  Lock,
  Loader2,
  Link2,
  Plus,
  X,
  Check,
  Table as TableIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Slash,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';


import { marked } from 'marked';
import { apiUploadImage } from '../api.js';
import { WysiwygToolbar } from './WysiwygToolbar.jsx';
import { handleEditorKeyDown } from '../utils/editorUtils.js';

const SLASH_COMMANDS = [
  {
    id: 'ai',
    title: 'Ask AI Assistant',
    description: 'Brainstorm, draft, or outline with LLM',
    icon: Sparkles,
    keywords: ['ai', 'ask', 'generate', 'draft', 'gpt', 'llm'],
    type: 'ai'
  },
  {
    id: 'image',
    title: 'Upload Image',
    description: 'Insert an image from device or paste from clipboard',
    icon: ImageIcon,
    keywords: ['image', 'photo', 'picture', 'upload', 'img', 'file'],
    type: 'upload'
  },
  {
    id: 'table',
    title: 'Table',
    description: 'Insert a 3-column markdown table',
    icon: TableIcon,
    keywords: ['table', 'grid', 'columns'],
    type: 'insert',
    template: `| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Item 1 | Item 2 | Item 3 |
`
  },
  {
    id: 'h1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: Heading1,
    keywords: ['h1', 'heading', 'title', 'big'],
    type: 'insert',
    template: '# Heading 1\n'
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: Heading2,
    keywords: ['h2', 'heading', 'subtitle'],
    type: 'insert',
    template: '## Heading 2\n'
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small sub-section heading',
    icon: Heading3,
    keywords: ['h3', 'heading', 'sub'],
    type: 'insert',
    template: '### Heading 3\n'
  },
  {
    id: 'bullet',
    title: 'Bullet List',
    description: 'Create an unordered bullet list',
    icon: List,
    keywords: ['bullet', 'list', 'ul', 'items'],
    type: 'insert',
    template: '- First item\n- Second item\n'
  },
  {
    id: 'numbered',
    title: 'Numbered List',
    description: 'Create a sequential numbered list',
    icon: ListOrdered,
    keywords: ['number', 'ordered', 'ol', 'steps', '1.'],
    type: 'insert',
    template: '1. First step\n2. Second step\n'
  },
  {
    id: 'todo',
    title: 'To-do List',
    description: 'Track tasks with markdown checkboxes',
    icon: CheckSquare,
    keywords: ['todo', 'task', 'check', 'checkbox', 'action'],
    type: 'insert',
    template: '- [ ] Task item\n- [ ] Follow up\n'
  },
  {
    id: 'quote',
    title: 'Quote / Callout',
    description: 'Capture a quote or highlight key notes',
    icon: Quote,
    keywords: ['quote', 'blockquote', 'callout', 'cite'],
    type: 'insert',
    template: '> Important note or quotation\n'
  },
  {
    id: 'code',
    title: 'Code Block',
    description: 'Format syntax highlighted code snippet',
    icon: Code,
    keywords: ['code', 'snippet', 'pre', 'script'],
    type: 'insert',
    template: '```javascript\n// Write code here\n```\n'
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Separate content visually with horizontal line',
    icon: Minus,
    keywords: ['divider', 'hr', 'line', 'separator'],
    type: 'insert',
    template: '\n---\n\n'
  },
  {
    id: 'link',
    title: 'Web Bookmark / Link',
    description: 'Add a formatted web link',
    icon: Link2,
    keywords: ['link', 'url', 'web', 'bookmark', 'http'],
    type: 'insert',
    template: '[Link title](https://example.com)'
  }
];

// Extract all images in content (both <img ...> and ![alt](url)) for visual preview & interactive resizing
const extractImagesFromContent = (text) => {
  if (!text) return [];
  const images = [];
  // 1. Match HTML <img ...>
  const imgRegex = /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)\/?>/gi;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const src = match[2];
    const combinedAttrs = match[1] + ' ' + match[3];
    const widthMatch = combinedAttrs.match(/width=["']([^"']+)["']/i);
    const width = widthMatch ? widthMatch[1] : '100%';
    const altMatch = combinedAttrs.match(/alt=["']([^"']+)["']/i);
    const alt = altMatch ? altMatch[1] : 'image';
    images.push({ fullMatch, src, width, alt, isHtml: true });
  }
  // 2. Match markdown ![alt](url)
  const mdRegex = /!\[([^\]]*?)\]\(([^)\s]+)\)/gi;
  while ((match = mdRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const alt = match[1] || 'image';
    const src = match[2];
    images.push({ fullMatch, src, width: '100%', alt, isHtml: false });
  }
  return images;
};

export const Composer = ({

  folders = [],
  folderTree = [],
  tags = [],
  onSubmitMemo,
  onTriggerAiGenerate,
  initialValue = ''
}) => {
  const [content, setContent] = useState(initialValue);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedUrl, setDetectedUrl] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Image upload and drag/drop states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Slash command menu state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);

  // WYSIWYG Live Preview state
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setContent(initialValue);
    }
  }, [initialValue]);

  // Detected images in active note content
  const attachedImages = extractImagesFromContent(content);



  // Upload and insert image markdown/HTML
  const uploadAndInsertImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      setIsUploadingImage(true);
      const res = await apiUploadImage(file);
      const textarea = textareaRef.current;
      const text = content;
      const cursor = textarea ? textarea.selectionStart : text.length;

      const altText = (file.name || 'image').replace(/\.[^/.]+$/, '');
      const imgTag = `\n<img src="${res.url}" alt="${altText}" width="100%" />\n`;

      const newContent = text.slice(0, cursor) + imgTag + text.slice(cursor);
      setContent(newContent);

      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          const newPos = cursor + imgTag.length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.style.height = 'auto';
          textarea.style.height = `${Math.min(textarea.scrollHeight, 350)}px`;
        }
      }, 20);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert(err.message || 'Image upload failed.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Change width of an image in content
  const handleSetImageWidth = (imgItem, newWidth) => {
    let replacement;
    if (imgItem.isHtml) {
      if (/width=["'][^"']*["']/i.test(imgItem.fullMatch)) {
        replacement = imgItem.fullMatch.replace(/width=["'][^"']*["']/i, `width="${newWidth}"`);
      } else {
        replacement = imgItem.fullMatch.replace(/<img\s+/i, `<img width="${newWidth}" `);
      }
    } else {
      // Convert markdown image to HTML img with width
      replacement = `<img src="${imgItem.src}" alt="${imgItem.alt}" width="${newWidth}" />`;
    }
    const updated = content.replace(imgItem.fullMatch, replacement);
    setContent(updated);
  };

  // Remove an image from content
  const handleRemoveImage = (imgItem) => {
    const updated = content.replace(imgItem.fullMatch, '').trim();
    setContent(updated);
  };


  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await uploadAndInsertImage(file);
          return;
        }
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type && file.type.startsWith('image/')) {
          await uploadAndInsertImage(file);
          break;
        }
      }
    }
  };

  // Flatten folder tree into depth-aware list for dropdown
  const getIndentedFolderOptions = (tree, depth = 0) => {
    const list = [];
    for (const f of tree) {
      list.push({ ...f, depth });
      if (f.children && f.children.length > 0) {
        list.push(...getIndentedFolderOptions(f.children, depth + 1));
      }
    }
    return list;
  };

  const indentedFolders = folderTree && folderTree.length > 0
    ? getIndentedFolderOptions(folderTree)
    : (folders || []).map(f => ({ ...f, depth: 0 }));

  // Filter slash commands based on typed query after '/'
  const filteredCommands = SLASH_COMMANDS.filter(cmd => {
    if (!slashQuery) return true;
    const q = slashQuery.toLowerCase();
    return (
      cmd.id.includes(q) ||
      cmd.title.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.includes(q))
    );
  });

  const checkSlashCommand = (val, cursor) => {
    const textBefore = val.slice(0, cursor);
    const slashMatch = textBefore.match(/(?:^|\n|\s)\/([a-zA-Z0-9_-]*)$/);
    if (slashMatch) {
      setSlashQuery(slashMatch[1].toLowerCase());
      setShowSlashMenu(true);
      setSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  };

  const executeSlashCommand = (command) => {
    const textarea = textareaRef.current;
    const text = content;
    const cursor = textarea ? textarea.selectionStart : text.length;

    const textBefore = text.slice(0, cursor);
    const textAfter = text.slice(cursor);

    const lastSlash = textBefore.lastIndexOf('/');
    const prefix = lastSlash !== -1 ? textBefore.slice(0, lastSlash) : textBefore;

    if (command.type === 'ai') {
      setContent(prefix + textAfter);
      setShowSlashMenu(false);
      onTriggerAiGenerate();
      return;
    }

    if (command.type === 'upload') {
      setContent(prefix + textAfter);
      setShowSlashMenu(false);
      fileInputRef.current?.click();
      return;
    }

    const insertedText = command.template;
    const newContent = prefix + insertedText + textAfter;
    setContent(newContent);
    setShowSlashMenu(false);

    // Auto-focus and position caret
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newPos = prefix.length + insertedText.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 350)}px`;
      }
    }, 15);
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);

    const cursor = e.target.selectionStart;
    checkSlashCommand(val, cursor);

    // Detect URL for instant magic preview badge
    const urlMatch = val.match(/(https?:\/\/[^\s<>"'{}|\\^`]+)/i);
    setDetectedUrl(urlMatch ? urlMatch[1] : null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 350)}px`;
    }
  };

  const handleKeyUp = (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.key)) {
      checkSlashCommand(e.target.value, e.target.selectionStart);
    }
  };

  const handleKeyDown = (e) => {
    // Navigate slash menu if open
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        executeSlashCommand(filteredCommands[slashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    // WYSIWYG keyboard shortcuts (Cmd/Ctrl + B, I, K, E, Tab) & Smart Enter
    if (!showSlashMenu && handleEditorKeyDown(e, textareaRef.current, setContent)) {
      return;
    }

    // Cmd+Enter or Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const clean = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (!clean) return;
    if (!selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
    }
    setNewTagInput('');
  };

  const toggleTag = (tagName) => {
    const clean = tagName.trim().toLowerCase();
    if (selectedTags.includes(clean)) {
      setSelectedTags(selectedTags.filter(t => t !== clean));
    } else {
      setSelectedTags([...selectedTags, clean]);
    }
  };

  const removeTag = (tagName) => {
    setSelectedTags(selectedTags.filter(t => t !== tagName));
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmitMemo({
        content: content.trim(),
        folder_id: selectedFolder || null,
        visibility,
        tags: selectedTags
      });
      setContent('');
      setSelectedTags([]);
      setDetectedUrl(null);
      setShowSlashMenu(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to post memo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFolderName = selectedFolder
    ? (folders || []).find(f => f.id === selectedFolder)?.name || 'Folder'
    : 'Folder';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`card bg-base-100 border shadow-sm overflow-visible relative mb-6 transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 z-20 ${
        isDraggingOver ? 'border-primary ring-2 ring-primary/40 border-dashed bg-primary/5' : 'border-base-content/10'
      }`}
    >
      {/* Visual Dropzone overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-30 bg-base-100/90 backdrop-blur-xs flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary pointer-events-none animate-fadeIn">
          <ImageIcon className="w-8 h-8 text-primary mb-1 animate-bounce" />
          <span className="font-semibold text-sm text-primary">Drop image to upload</span>
        </div>
      )}

      {/* Hidden file input for image picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            uploadAndInsertImage(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* WYSIWYG Formatting & Preview Toolbar */}
      <WysiwygToolbar
        textareaRef={textareaRef}
        setContent={setContent}
        isPreview={isPreview}
        onTogglePreview={setIsPreview}
      />

      <div className="p-3.5 sm:p-4 relative">
        {isPreview ? (
          <div
            className="markdown-body w-full min-h-[56px] text-sm leading-relaxed p-1 select-text"
            onClick={(e) => {
              if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                e.preventDefault();
                const container = e.target.closest('.markdown-body');
                if (!container) return;
                const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
                const index = checkboxes.indexOf(e.target);
                if (index !== -1) {
                  let curr = 0;
                  const updated = content.replace(/(- \[[ xX]\])/g, (match) => {
                    if (curr === index) {
                      curr++;
                      return match.toLowerCase().includes('x') ? '- [ ]' : '- [x]';
                    }
                    curr++;
                    return match;
                  });
                  setContent(updated);
                }
              }
            }}
            dangerouslySetInnerHTML={{
              __html: marked.parse(content || '*Nothing to preview*', { breaks: true })
            }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyUp={handleKeyUp}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Write a note, paste image/link, or type / for commands (table, lists, headings, ai)..."
            rows={2}
            className="w-full bg-transparent border-0 focus:outline-none resize-none text-sm placeholder:text-base-content/40 leading-relaxed min-h-[56px]"
          />
        )}

        {/* Uploading image indicator */}
        {isUploadingImage && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium w-fit mb-2 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Uploading image attachment...</span>
          </div>
        )}

        {/* Notion-style Slash Command Popover Menu */}
        {showSlashMenu && (
          <div className="absolute top-14 left-3 sm:left-4 z-50 w-72 max-h-64 overflow-y-auto bg-base-200/98 backdrop-blur-md border border-base-content/20 shadow-2xl rounded-2xl p-1.5 animate-fadeIn text-xs ring-1 ring-black/10">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-base-content/50 uppercase tracking-wider border-b border-base-content/10 mb-1 flex items-center justify-between">
              <span>Notion Commands</span>
              <span className="font-mono text-[9px]">↑↓ navigate · ↵ enter</span>
            </div>

            {filteredCommands.length > 0 ? (
              <div className="space-y-0.5">
                {filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === slashIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => executeSlashCommand(cmd)}
                      onMouseEnter={() => setSlashIndex(idx)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-content font-medium shadow-xs'
                          : 'hover:bg-base-300 text-base-content/85'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-primary-content/20' : 'bg-base-100 border border-base-content/10'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col truncate flex-1">
                        <span className="text-xs font-semibold leading-tight truncate">
                          {cmd.title}
                        </span>
                        <span
                          className={`text-[10px] leading-tight truncate ${
                            isSelected ? 'text-primary-content/80' : 'text-base-content/50'
                          }`}
                        >
                          {cmd.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-base-content/50 italic">
                No commands matching "/{slashQuery}"
              </div>
            )}
          </div>
        )}

        {/* Selected Tags Chips */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {selectedTags.map(tag => (
              <span key={tag} className="badge badge-primary badge-sm gap-1 text-xs">
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Attached Images Tray & Interactive Resizing */}
        {attachedImages.length > 0 && (
          <div className="mb-3 space-y-2 border border-base-content/10 bg-base-200/40 rounded-xl p-2.5">
            <div className="flex items-center justify-between text-[11px] text-base-content/60 font-medium px-1">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-secondary" />
                Attached Images ({attachedImages.length})
              </span>
              <span className="text-[10px] text-base-content/40">Choose size or remove</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {attachedImages.map((imgItem, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2 bg-base-100 rounded-lg border border-base-content/10 shadow-2xs group"
                >
                  <img
                    src={imgItem.src}
                    alt={imgItem.alt}
                    className="w-14 h-14 object-cover rounded-md border border-base-content/10 shrink-0 bg-base-200"
                  />
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium truncate text-base-content/80">
                        {imgItem.alt || 'Attached image'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(imgItem)}
                        className="btn btn-ghost btn-xs btn-square h-5 w-5 text-error/60 hover:text-error shrink-0"
                        title="Remove image from note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Quick Resize Chips: 25%, 50%, 75%, 100% */}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-base-content/40 uppercase font-mono mr-0.5">Size:</span>
                      {['25%', '50%', '75%', '100%'].map((w) => {
                        const isSelected = imgItem.width === w;
                        return (
                          <button
                            key={w}
                            type="button"
                            onClick={() => handleSetImageWidth(imgItem, w)}
                            className={`btn btn-xs px-1.5 h-5 min-h-0 text-[10px] rounded ${
                              isSelected
                                ? 'btn-primary font-bold shadow-2xs'
                                : 'btn-ghost bg-base-200 hover:bg-base-300 text-base-content/70'
                            }`}
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex items-center justify-between border-t border-base-content/5 pt-3 mt-1 flex-wrap gap-2 relative">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Ask AI button */}
            <button
              type="button"
              onClick={onTriggerAiGenerate}
              className="btn btn-xs btn-outline btn-primary gap-1 font-medium hover:scale-105 transition-transform"
              title="Generate content or brainstorm with AI (or type /ai)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>

            {/* Quick Slash Commands Button */}
            <button
              type="button"
              onClick={() => {
                setShowSlashMenu(!showSlashMenu);
                setSlashQuery('');
                setSlashIndex(0);
                if (textareaRef.current) textareaRef.current.focus();
              }}
              className={`btn btn-xs gap-1 text-xs transition-colors ${
                showSlashMenu ? 'btn-neutral' : 'btn-ghost text-base-content/70 hover:text-base-content'
              }`}
              title="Insert Tables, Lists, Headings, Code via / command"
            >
              <Slash className="w-3.5 h-3.5 text-primary" />
              <span>Commands</span>
            </button>

            {/* Image upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
              title="Upload image or screenshot (Ctrl+V / Drop image)"
            >
              {isUploadingImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-secondary" />
              )}
              <span className="hidden sm:inline">Image</span>
            </button>

            {/* Folder picker dropdown */}
            <div className="dropdown dropdown-bottom dropdown-start">
              <label
                tabIndex={0}
                className={`btn btn-xs gap-1 text-xs transition-colors ${
                  selectedFolder
                    ? 'btn-primary btn-outline'
                    : 'btn-ghost text-base-content/70 hover:text-base-content'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-primary" />
                <span className="max-w-[110px] truncate">{selectedFolderName}</span>
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-50 menu p-1.5 shadow-2xl bg-base-200 border border-base-content/15 rounded-box w-56 text-xs max-h-60 overflow-y-auto mt-1"
              >
                <li>
                  <button
                    type="button"
                    onClick={() => setSelectedFolder('')}
                    className={!selectedFolder ? 'active' : ''}
                  >
                    <span>Unorganized</span>
                  </button>
                </li>
                <li className="menu-title text-[10px] text-base-content/50 px-2 py-0.5">
                  Folder Hierarchy
                </li>
                {indentedFolders.map(f => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedFolder(f.id)}
                      className={`flex items-center gap-1.5 truncate ${selectedFolder === f.id ? 'active' : ''}`}
                      style={{ paddingLeft: `${Math.max(8, f.depth * 14 + 8)}px` }}
                    >
                      {f.depth > 0 && <span className="opacity-40 font-mono text-[10px]">└─</span>}
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color || '#6366f1' }} />
                      <span className="truncate">{f.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tag Picker Dropdown */}
            <div className="dropdown dropdown-bottom dropdown-start">
              <label
                tabIndex={0}
                className={`btn btn-xs gap-1 text-xs transition-colors ${
                  selectedTags.length > 0
                    ? 'btn-secondary btn-outline'
                    : 'btn-ghost text-base-content/70 hover:text-base-content'
                }`}
                title="Attach tags to this memo"
              >
                <TagIcon className="w-3.5 h-3.5" />
                <span>Tags {selectedTags.length > 0 && `(${selectedTags.length})`}</span>
              </label>
              <div
                tabIndex={0}
                className="dropdown-content z-50 p-2 shadow-2xl bg-base-200 border border-base-content/15 rounded-box w-60 text-xs mt-1"
              >
                {/* New Tag Input Form */}
                <form onSubmit={handleAddTag} className="flex gap-1 mb-2">
                  <input
                    type="text"
                    placeholder="New tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="input input-xs input-bordered w-full text-xs"
                  />
                  <button type="submit" className="btn btn-xs btn-primary shrink-0">
                    <Plus className="w-3 h-3" />
                  </button>
                </form>

                {/* Tag Selection List */}
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {tags && tags.length > 0 ? (
                    tags.map(t => {
                      const isSelected = selectedTags.includes(t.name.toLowerCase());
                      return (
                        <button
                          key={t.id || t.name}
                          type="button"
                          onClick={() => toggleTag(t.name)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                            isSelected ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-base-300'
                          }`}
                        >
                          <span className="truncate">#{t.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-[11px] text-base-content/50 text-center py-2">
                      Type above to create tags or use #tags in note text
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Visibility Toggle */}
            <button
              type="button"
              onClick={() => setVisibility(visibility === 'private' ? 'public' : 'private')}
              className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
              title={`Visibility: ${visibility}`}
            >
              {visibility === 'public' ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-info" />
                  <span className="hidden sm:inline">Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-warning" />
                  <span className="hidden sm:inline">Private</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!content.trim() || isSubmitting}
              onClick={handleSubmit}
              className="btn btn-xs sm:btn-sm btn-primary gap-1 shadow-sm px-3"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Post</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
