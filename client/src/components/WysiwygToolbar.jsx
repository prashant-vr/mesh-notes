import React from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link2,
  Table as TableIcon,
  Minus,
  Eye,
  PenTool
} from 'lucide-react';
import { applyFormat } from '../utils/editorUtils.js';

export const WysiwygToolbar = ({
  editor = null,
  textareaRef = null,
  setContent = null,
  isPreview = false,
  onTogglePreview = null,
  compact = false,
  editorMode = 'visual',
  onToggleEditorMode = null
}) => {
  const handleAction = (type) => {
    if (editor) {
      switch (type) {
        case 'bold':
          editor.chain().focus().toggleBold().run();
          break;
        case 'italic':
          editor.chain().focus().toggleItalic().run();
          break;
        case 'strike':
          editor.chain().focus().toggleStrike().run();
          break;
        case 'code':
          editor.chain().focus().toggleCode().run();
          break;
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
        case 'task':
          editor.chain().focus().toggleTaskList().run();
          break;
        case 'quote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'link': {
          const prevUrl = editor.getAttributes('link').href || '';
          const url = window.prompt('Enter link URL:', prevUrl);
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
          break;
        }
        case 'hr':
          editor.chain().focus().setHorizontalRule().run();
          break;
        default:
          break;
      }
      return;
    }

    if (!textareaRef?.current) return;
    const updated = applyFormat(textareaRef.current, type);
    if (updated !== undefined && setContent) {
      setContent(updated);
    }
  };

  const isActionActive = (type) => {
    if (!editor || isPreview) return false;
    switch (type) {
      case 'bold': return editor.isActive('bold');
      case 'italic': return editor.isActive('italic');
      case 'strike': return editor.isActive('strike');
      case 'code': return editor.isActive('code');
      case 'h1': return editor.isActive('heading', { level: 1 });
      case 'h2': return editor.isActive('heading', { level: 2 });
      case 'h3': return editor.isActive('heading', { level: 3 });
      case 'bullet': return editor.isActive('bulletList');
      case 'numbered': return editor.isActive('orderedList');
      case 'task': return editor.isActive('taskList');
      case 'quote': return editor.isActive('blockquote');
      case 'link': return editor.isActive('link');
      default: return false;
    }
  };

  return (
    <div className="flex items-center justify-between gap-1 py-1.5 px-2 border-b border-base-content/10 bg-base-200/40 text-base-content/70 flex-wrap select-none text-xs rounded-t-xl">
      {/* Formatting Action Buttons */}
      <div className="flex items-center gap-0.5 flex-wrap">
        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('bold')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('bold') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('italic')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('italic') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('strike')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('strike') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('code')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('code') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Inline Code / Code Block (Ctrl+E)"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-base-content/15 mx-1" />

        {/* Heading 1, 2, 3 */}
        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('h1')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('h1') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('h2')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('h2') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('h3')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('h3') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-base-content/15 mx-1" />

        {/* Lists & Tasks */}
        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('bullet')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('bullet') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('numbered')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('numbered') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('task')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('task') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Task Checklist"
        >
          <CheckSquare className="w-3.5 h-3.5 text-success" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('quote')}
          className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
            isActionActive('quote') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
          }`}
          title="Blockquote"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        {!compact && (
          <>
            <div className="w-[1px] h-4 bg-base-content/15 mx-1" />

            <button
              type="button"
              tabIndex={-1}
              disabled={isPreview}
              onClick={() => handleAction('link')}
              className={`btn btn-xs btn-square h-7 w-7 min-h-0 ${
                isActionActive('link') ? 'btn-primary text-primary-content shadow-xs' : 'btn-ghost hover:bg-base-300'
              }`}
              title="Insert Link"
            >
              <Link2 className="w-3.5 h-3.5 text-info" />
            </button>

            <button
              type="button"
              tabIndex={-1}
              disabled={isPreview}
              onClick={() => handleAction('hr')}
              className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
              title="Divider line (---)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Right Side: Mode Switcher (Rich/Markdown) and Write/Preview Tab Switcher */}
      <div className="flex items-center gap-1 shrink-0">
        {!isPreview && onToggleEditorMode && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onToggleEditorMode(editorMode === 'visual' ? 'raw' : 'visual')}
            className={`btn btn-xs h-6 px-2 min-h-0 font-normal gap-1 text-[11px] rounded-lg border border-base-content/10 ${
              editorMode === 'visual'
                ? 'bg-primary/15 text-primary border-primary/30 font-medium'
                : 'bg-base-300/60 text-base-content/70 hover:bg-base-300'
            }`}
            title={editorMode === 'visual' ? 'Switch to Markdown source' : 'Switch to Visual rich text'}
          >
            {editorMode === 'visual' ? 'Rich' : 'Markdown'}
          </button>
        )}

        {onTogglePreview && (
          <div className="join bg-base-300/60 p-0.5 rounded-lg border border-base-content/10 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onTogglePreview(false)}
              className={`btn btn-xs join-item h-6 px-2 min-h-0 font-normal gap-1 ${
                !isPreview ? 'btn-primary btn-active font-semibold shadow-xs' : 'btn-ghost text-base-content/60'
              }`}
            >
              <PenTool className="w-3 h-3" />
              <span>Write</span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onTogglePreview(true)}
              className={`btn btn-xs join-item h-6 px-2 min-h-0 font-normal gap-1 ${
                isPreview ? 'btn-primary btn-active font-semibold shadow-xs' : 'btn-ghost text-base-content/60'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
