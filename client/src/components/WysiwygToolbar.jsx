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
  textareaRef,
  setContent,
  isPreview = false,
  onTogglePreview = null,
  compact = false
}) => {
  const handleAction = (type) => {
    if (!textareaRef?.current) return;
    const updated = applyFormat(textareaRef.current, type);
    if (updated !== undefined && setContent) {
      setContent(updated);
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
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('italic')}
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('strike')}
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('code')}
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Inline Code / Code Block (Ctrl+E)"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-base-content/15 mx-1" />

        {/* Heading 1 & 2 */}
        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('h1')}
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('h2')}
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('h3')}
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
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
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Bullet List (- item)"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('numbered')}
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Numbered List (1. item)"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('task')}
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Task Checklist (- [ ] item)"
        >
          <CheckSquare className="w-3.5 h-3.5 text-success" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={isPreview}
          onClick={() => handleAction('quote')}
          className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
          title="Blockquote (> quote)"
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
              className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
              title="Insert Link [title](url) (Ctrl+K)"
            >
              <Link2 className="w-3.5 h-3.5 text-info" />
            </button>

            <button
              type="button"
              tabIndex={-1}
              disabled={isPreview}
              onClick={() => handleAction('table')}
              className="btn btn-ghost btn-xs btn-square h-7 w-7 min-h-0 hover:bg-base-300"
              title="Insert Table"
            >
              <TableIcon className="w-3.5 h-3.5 text-secondary" />
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

      {/* Right Side: Write / Preview Tab Switcher */}
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
  );
};
