import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Send,
  Sparkles,
  Folder,
  Tag as TagIcon,
  Globe,
  Lock,
  Loader2,
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

// Inline Image NodeView with quick resize controls
const TiptapImageComponent = ({ node, updateAttributes, deleteNode, selected }) => {
  const width = node.attrs.width || '100%';

  return (
    <NodeViewWrapper
      as="div"
      className="my-3 group relative inline-block max-w-full text-center select-none leading-none"
      style={{ width: width === '100%' ? '100%' : width }}
    >
      <div
        className={`relative inline-block max-w-full rounded-xl overflow-hidden border transition-all ${
          selected ? 'ring-2 ring-primary border-primary' : 'border-base-content/15 hover:border-primary/40'
        }`}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          className="rounded-lg object-contain max-h-[500px]"
        />

        {/* Hover / Select Quick Resize Controls overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-base-200/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-lg border border-base-content/15 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-semibold text-base-content/60 mr-0.5">Size:</span>
          {['25%', '50%', '75%', '100%'].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => updateAttributes({ width: w })}
              className={`btn btn-xs h-5 px-1.5 text-[10px] font-medium rounded-md transition-colors ${
                width === w
                  ? 'btn-primary text-primary-content shadow-2xs'
                  : 'btn-ghost text-base-content/75 hover:bg-base-300'
              }`}
            >
              {w}
            </button>
          ))}
          <div className="w-[1px] h-3 bg-base-content/20 mx-0.5" />
          <button
            type="button"
            onClick={deleteNode}
            className="btn btn-ghost btn-xs h-5 px-1.5 text-error/80 hover:text-error hover:bg-error/15 rounded-md"
            title="Delete image"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('width') || element.style.width || '100%',
        renderHTML: (attributes) => ({
          width: attributes.width,
          style: `width: ${attributes.width}; max-width: 100%;`
        })
      }
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(TiptapImageComponent);
  }
});

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
    id: 'h1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: Heading1,
    keywords: ['h1', 'heading', 'title', 'big'],
    type: 'heading',
    level: 1
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: Heading2,
    keywords: ['h2', 'heading', 'subtitle'],
    type: 'heading',
    level: 2
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small sub-section heading',
    icon: Heading3,
    keywords: ['h3', 'heading', 'sub'],
    type: 'heading',
    level: 3
  },
  {
    id: 'bullet',
    title: 'Bullet List',
    description: 'Create an unordered bullet list',
    icon: List,
    keywords: ['bullet', 'list', 'ul', 'items'],
    type: 'bullet'
  },
  {
    id: 'numbered',
    title: 'Numbered List',
    description: 'Create a sequential numbered list',
    icon: ListOrdered,
    keywords: ['number', 'ordered', 'ol', 'steps', '1.'],
    type: 'numbered'
  },
  {
    id: 'todo',
    title: 'To-do List',
    description: 'Track tasks with interactive checkboxes',
    icon: CheckSquare,
    keywords: ['todo', 'task', 'check', 'checkbox', 'action'],
    type: 'todo'
  },
  {
    id: 'quote',
    title: 'Quote / Callout',
    description: 'Capture a quote or highlight key notes',
    icon: Quote,
    keywords: ['quote', 'blockquote', 'callout', 'cite'],
    type: 'quote'
  },
  {
    id: 'code',
    title: 'Code Block',
    description: 'Format syntax highlighted code snippet',
    icon: Code,
    keywords: ['code', 'snippet', 'pre', 'script'],
    type: 'code'
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Separate content visually with horizontal line',
    icon: Minus,
    keywords: ['divider', 'hr', 'line', 'separator'],
    type: 'divider'
  }
];

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

  // Mode: 'visual' (TipTap WYSIWYG) or 'raw' (Markdown / HTML source)
  const [editorMode, setEditorMode] = useState('visual');
  const [isPreview, setIsPreview] = useState(false);

  const fileInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Slash commands popover
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);

  // Filter slash commands
  const filteredCommands = SLASH_COMMANDS.filter((cmd) => {
    if (!slashQuery) return true;
    const q = slashQuery.toLowerCase();
    return (
      cmd.id.includes(q) ||
      cmd.title.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.includes(q))
    );
  });

  // TipTap Editor Instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Placeholder.configure({
        placeholder: 'Write a note, paste image/link, or type / for commands (headings, lists, tasks)...'
      }),
      Link.configure({
        openOnClick: false
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      ResizableImage
    ],
    content: initialValue
      ? initialValue.startsWith('<')
        ? initialValue
        : marked.parse(initialValue, { breaks: true })
      : '',
    editorProps: {
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length > 0) {
          const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
          if (files.length > 0) {
            event.preventDefault();
            uploadAndInsertImages(files);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (event.clipboardData?.files?.length > 0) {
          const files = Array.from(event.clipboardData.files).filter((f) => f.type.startsWith('image/'));
          if (files.length > 0) {
            event.preventDefault();
            uploadAndInsertImages(files);
            return true;
          }
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        // Cmd/Ctrl + Enter to submit
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          handleSubmit();
          return true;
        }

        // Navigate slash menu if open
        if (showSlashMenu && filteredCommands.length > 0) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSlashIndex((prev) => (prev + 1) % filteredCommands.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSlashIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (filteredCommands[slashIndex]) {
              executeSlashCommand(filteredCommands[slashIndex]);
            }
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setShowSlashMenu(false);
            return true;
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setContent(html);

      // Slash command detection
      const { from } = ed.state.selection;
      const textBefore = ed.state.doc.textBetween(Math.max(0, from - 20), from, '\n');
      const slashMatch = textBefore.match(/(?:^|\n|\s)\/([a-zA-Z0-9_-]*)$/);
      if (slashMatch) {
        setSlashQuery(slashMatch[1].toLowerCase());
        setShowSlashMenu(true);
        setSlashIndex(0);
      } else {
        setShowSlashMenu(false);
      }

      // Detect URL for bookmark unfurl
      const fullText = ed.getText();
      const urlMatch = fullText.match(/(https?:\/\/[^\s<>"'{}|\\^`]+)/i);
      setDetectedUrl(urlMatch ? urlMatch[1] : null);
    }
  });

  // Sync initialValue when changed from external props (e.g. quote, AI generate)
  useEffect(() => {
    if (initialValue && editor) {
      const html = initialValue.startsWith('<')
        ? initialValue
        : marked.parse(initialValue, { breaks: true });
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html);
        setContent(html);
      }
    }
  }, [initialValue, editor]);

  // Upload and insert multiple images directly into TipTap
  const uploadAndInsertImages = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f && f.type && f.type.startsWith('image/'));
    if (files.length === 0) return;

    try {
      setIsUploadingImage(true);
      setUploadingCount(files.length);

      for (const file of files) {
        const res = await apiUploadImage(file);
        const altText = (file.name || 'image').replace(/\.[^/.]+$/, '');
        if (editor) {
          editor
            .chain()
            .focus()
            .setImage({
              src: res.url,
              alt: altText,
              width: '100%'
            })
            .run();
        }
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert(err.message || 'Image upload failed.');
    } finally {
      setIsUploadingImage(false);
      setUploadingCount(0);
    }
  };

  const executeSlashCommand = (cmd) => {
    if (!editor) return;

    // Remove the typed slash trigger
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from, '\n');
    const slashIdx = textBefore.lastIndexOf('/');
    if (slashIdx !== -1) {
      const deleteCount = textBefore.length - slashIdx;
      editor.chain().focus().deleteRange({ from: from - deleteCount, to: from }).run();
    }

    setShowSlashMenu(false);

    if (cmd.type === 'ai') {
      onTriggerAiGenerate();
      return;
    }
    if (cmd.type === 'upload') {
      fileInputRef.current?.click();
      return;
    }

    switch (cmd.id) {
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'numbered':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'todo':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'quote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'code':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'divider':
        editor.chain().focus().setHorizontalRule().run();
        break;
      default:
        break;
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
      const imgFiles = Array.from(files).filter((f) => f.type && f.type.startsWith('image/'));
      if (imgFiles.length > 0) {
        await uploadAndInsertImages(imgFiles);
      }
    }
  };

  // Flatten folder tree for dropdown
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

  const indentedFolders =
    folderTree && folderTree.length > 0
      ? getIndentedFolderOptions(folderTree)
      : (folders || []).map((f) => ({ ...f, depth: 0 }));

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
      setSelectedTags(selectedTags.filter((t) => t !== clean));
    } else {
      setSelectedTags([...selectedTags, clean]);
    }
  };

  const removeTag = (tagName) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  };

  const handleSubmit = async () => {
    const rawContent = editor ? editor.getHTML() : content;
    const isEmpty = editor ? editor.isEmpty : !rawContent.trim();
    if (isEmpty || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmitMemo({
        content: rawContent.trim(),
        folder_id: selectedFolder || null,
        visibility,
        tags: selectedTags
      });
      if (editor) {
        editor.commands.clearContent();
      }
      setContent('');
      setSelectedTags([]);
      setDetectedUrl(null);
      setShowSlashMenu(false);
    } catch (err) {
      console.error('Failed to post memo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFolderName = selectedFolder
    ? (folders || []).find((f) => f.id === selectedFolder)?.name || 'Folder'
    : 'Folder';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`card bg-base-100 border shadow-sm overflow-visible relative mb-6 transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 z-20 ${
        isDraggingOver
          ? 'border-primary ring-2 ring-primary/40 border-dashed bg-primary/5'
          : 'border-base-content/10'
      }`}
    >
      {/* Visual Dropzone overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-30 bg-base-100/90 backdrop-blur-xs flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary pointer-events-none animate-fadeIn">
          <ImageIcon className="w-8 h-8 text-primary mb-1 animate-bounce" />
          <span className="font-semibold text-sm text-primary">Drop images to upload</span>
        </div>
      )}

      {/* Hidden file input for image picker (with multiple support) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadAndInsertImages(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* WYSIWYG Formatting & Preview Toolbar */}
      <WysiwygToolbar
        editor={editor}
        isPreview={isPreview}
        onTogglePreview={setIsPreview}
        editorMode={editorMode}
        onToggleEditorMode={(newMode) => {
          setEditorMode(newMode);
          if (newMode === 'visual' && editor) {
            editor.commands.setContent(content);
          }
        }}
      />

      <div className="p-3.5 sm:p-4 relative">
        {isPreview ? (
          <div
            className="markdown-body w-full min-h-[70px] text-sm leading-relaxed p-1 select-text"
            dangerouslySetInnerHTML={{
              __html: marked.parse(content || '*Nothing to preview*', { breaks: true })
            }}
          />
        ) : editorMode === 'raw' ? (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (editor) {
                editor.commands.setContent(e.target.value);
              }
            }}
            placeholder="Write HTML/Markdown source..."
            rows={4}
            className="w-full bg-transparent border-0 focus:outline-none resize-none font-mono text-xs placeholder:text-base-content/40 leading-relaxed min-h-[70px]"
          />
        ) : (
          <div className="tiptap-editor w-full min-h-[70px] text-sm cursor-text" onClick={() => editor?.commands.focus()}>
            <EditorContent editor={editor} />
          </div>
        )}

        {/* Uploading image indicator */}
        {isUploadingImage && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium w-fit my-2 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>
              {uploadingCount > 1
                ? `Uploading ${uploadingCount} images...`
                : 'Uploading image...'}
            </span>
          </div>
        )}

        {/* Slash Command Popover Menu */}
        {showSlashMenu && (
          <div className="absolute top-14 left-3 sm:left-4 z-50 w-72 max-h-64 overflow-y-auto bg-base-200/98 backdrop-blur-md border border-base-content/20 shadow-2xl rounded-2xl p-1.5 animate-fadeIn text-xs ring-1 ring-black/10">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-base-content/50 uppercase tracking-wider border-b border-base-content/10 mb-1 flex items-center justify-between">
              <span>Commands</span>
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
                          isSelected
                            ? 'bg-primary-content/20'
                            : 'bg-base-100 border border-base-content/10'
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
          <div className="flex items-center gap-1.5 flex-wrap my-2">
            {selectedTags.map((tag) => (
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
                editor?.commands.focus();
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
              title="Upload image (Drop multiple or Ctrl+V)"
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
                {indentedFolders.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedFolder(f.id)}
                      className={`flex items-center gap-1.5 truncate ${
                        selectedFolder === f.id ? 'active' : ''
                      }`}
                      style={{ paddingLeft: `${Math.max(8, f.depth * 14 + 8)}px` }}
                    >
                      {f.depth > 0 && <span className="opacity-40 font-mono text-[10px]">└─</span>}
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: f.color || '#6366f1' }}
                      />
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
                    tags.map((t) => {
                      const isSelected = selectedTags.includes(t.name.toLowerCase());
                      return (
                        <button
                          key={t.id || t.name}
                          type="button"
                          onClick={() => toggleTag(t.name)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                            isSelected
                              ? 'bg-primary/20 text-primary font-medium'
                              : 'hover:bg-base-300'
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
              disabled={(!editor || editor.isEmpty) && !content.trim()}
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
