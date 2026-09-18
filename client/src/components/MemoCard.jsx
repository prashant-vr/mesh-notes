import React, { useState } from 'react';
import { marked } from 'marked';
import { Pin, Trash2, Edit3, Folder, Tag, Sparkles, Globe, Lock, Check, Share2, Eye, EyeOff } from 'lucide-react';
import { BookmarkCard } from './BookmarkCard.jsx';
import { ShareModal } from './ShareModal.jsx';


export const MemoCard = ({
  memo,
  layout = 'stream',
  privacyMode = false,
  onTogglePin,
  onDelete,
  onEdit,
  onOpenReader,
  onUpdateBookmarkStatus,
  onTriggerAiSelection
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memo.content);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUnmasked, setIsUnmasked] = useState(false);

  // When privacyMode is on, card is masked unless explicitly unmasked by user click
  const isMasked = privacyMode && !isUnmasked;


  const formattedDate = new Date(memo.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const renderMarkdown = (text) => {
    try {
      return { __html: marked.parse(text || '', { breaks: true }) };
    } catch (_) {
      return { __html: text };
    }
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    onEdit(memo.id, { content: editContent.trim() });
    setIsEditing(false);
  };

  if (layout === 'compact') {
    return (
      <article
        className={`bg-base-100 border rounded-xl py-2 px-3 transition-all hover:bg-base-200/50 flex items-center justify-between gap-3 text-xs shadow-2xs group ${
          memo.pinned ? 'border-primary/40 bg-primary/5' : 'border-base-content/10 hover:border-base-content/20'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onTogglePin(memo.id, !memo.pinned)}
            className={`btn btn-xs btn-ghost btn-square h-5 w-5 min-h-0 shrink-0 ${
              memo.pinned ? 'text-primary' : 'text-base-content/30 opacity-0 group-hover:opacity-100'
            }`}
            title={memo.pinned ? 'Unpin memo' : 'Pin to top'}
          >
            <Pin className={`w-3 h-3 ${memo.pinned ? 'fill-current' : ''}`} />
          </button>

          {memo.folder_name && (
            <span className="badge badge-neutral badge-xs gap-1 shrink-0 font-mono text-[10px]">
              <Folder className="w-2.5 h-2.5 text-primary" />
              {memo.folder_name}
            </span>
          )}

          <span
            onClick={() => (isMasked ? setIsUnmasked(true) : setIsEditing(true))}
            className={`truncate font-medium cursor-pointer transition-colors flex-1 ${
              isMasked ? 'privacy-masked text-base-content/40 select-none' : 'text-base-content/90 hover:text-primary'
            }`}
            title={isMasked ? 'Click to reveal' : ''}
          >
            {isMasked ? '••••••••••••••••••••••••' : (memo.content.split('\n')[0] || 'Empty note')}
          </span>

          {memo.tags && memo.tags.length > 0 && (
            <div className="hidden md:flex items-center gap-1 shrink-0">
              {memo.tags.slice(0, 2).map((t) => (
                <span key={t.id || t.name} className="badge badge-outline badge-xs opacity-70">
                  #{t.name}
                </span>
              ))}
              {memo.tags.length > 2 && (
                <span className="text-[10px] text-base-content/40">+{memo.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-base-content/40 font-mono hidden sm:inline">
            {formattedDate}
          </span>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="btn btn-xs btn-ghost btn-square h-6 w-6 min-h-0 text-base-content/40 hover:text-primary"
              title="Share"
            >
              <Share2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn btn-xs btn-ghost btn-square h-6 w-6 min-h-0 text-base-content/40 hover:text-base-content"
              title="Edit"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(memo.id)}
              className="btn btn-xs btn-ghost btn-square h-6 w-6 min-h-0 text-error/40 hover:text-error"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {isShareModalOpen && (
          <ShareModal
            memo={memo}
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            onUpdateMemo={onEdit}
          />
        )}
      </article>
    );
  }

  const [aiTooltip, setAiTooltip] = useState(null);
  const cardRef = React.useRef(null);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (text && text.length >= 3 && onTriggerAiSelection) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const cardRect = cardRef.current ? cardRef.current.getBoundingClientRect() : { left: 0, top: 0 };

      setAiTooltip({
        text,
        x: rect.left + rect.width / 2 - cardRect.left,
        y: rect.top - cardRect.top - 8
      });
    } else {
      setAiTooltip(null);
    }
  };

  const handleTriggerAiFromTooltip = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (aiTooltip?.text && onTriggerAiSelection) {
      onTriggerAiSelection(aiTooltip.text, memo.content);
      setAiTooltip(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleContentClick = (e) => {
    const target = e.target;
    if (target && target.tagName === 'INPUT' && target.type === 'checkbox') {
      e.preventDefault();
      const container = target.closest('.markdown-body');
      if (!container) return;
      const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
      const index = checkboxes.indexOf(target);
      if (index === -1) return;

      let currentIndex = 0;
      const newContent = memo.content.replace(/(- \[[ xX]\])/g, (match) => {
        if (currentIndex === index) {
          currentIndex++;
          return match.toLowerCase().includes('x') ? '- [ ]' : '- [x]';
        }
        currentIndex++;
        return match;
      });

      if (newContent !== memo.content) {
        onEdit(memo.id, { content: newContent });
      }
    }
  };

  return (
    <article
      ref={cardRef}
      className={`card bg-base-100 border transition-all duration-200 shadow-sm relative ${
        layout === 'grid' ? 'h-full flex flex-col justify-between' : ''
      } ${
        memo.pinned ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'border-base-content/10 hover:border-base-content/20'
      }`}
    >
      <div className="card-body p-4 sm:p-5">
        {/* Card Header: folder, tags, visibility, date, actions */}
        <div className="flex items-center justify-between gap-2 text-xs text-base-content/60 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {memo.pinned && (
              <span className="badge badge-primary badge-sm gap-1 font-semibold">
                <Pin className="w-3 h-3 fill-current" />
                Pinned
              </span>
            )}

            {memo.folder_name && (
              <span className="badge badge-neutral badge-sm gap-1">
                <Folder className="w-3 h-3 text-primary" />
                {memo.folder_name}
              </span>
            )}

            <span className="flex items-center gap-1 opacity-75" title={memo.visibility}>
              {memo.visibility === 'public' ? (
                <Globe className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
            </span>

            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-1">
            {privacyMode && (
              <button
                type="button"
                onClick={() => setIsUnmasked(!isUnmasked)}
                className={`btn btn-xs btn-ghost btn-square ${isMasked ? 'text-warning' : 'text-base-content/40 hover:text-base-content'}`}
                title={isMasked ? 'Click to reveal note' : 'Hide note content'}
              >
                {isMasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="btn btn-xs btn-ghost btn-square text-base-content/50 hover:text-primary"
              title="Share note (public, N-views, password)"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onTogglePin(memo.id, !memo.pinned)}
              className={`btn btn-xs btn-ghost btn-square ${memo.pinned ? 'text-primary' : 'text-base-content/50'}`}
              title={memo.pinned ? 'Unpin memo' : 'Pin to top'}
            >
              <Pin className={`w-3.5 h-3.5 ${memo.pinned ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="btn btn-xs btn-ghost btn-square text-base-content/50 hover:text-base-content"
              title="Edit memo"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(memo.id)}
              className="btn btn-xs btn-ghost btn-square text-error/60 hover:text-error"
              title="Delete memo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isEditing ? (
          <div className="flex flex-col gap-2 mt-2">
            <textarea
              className="textarea textarea-bordered w-full font-mono text-sm min-h-[100px]"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => {
                  setEditContent(memo.content);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-xs btn-primary gap-1"
                onClick={handleSaveEdit}
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="relative mt-1">
            <div
              className={`markdown-body text-sm select-text transition-all duration-200 ${
                isMasked ? 'privacy-masked select-none' : ''
              } ${
                layout === 'grid' ? 'max-h-[380px] overflow-y-auto pr-1' : ''
              }`}
              onMouseUp={handleMouseUp}
              onClick={handleContentClick}
              dangerouslySetInnerHTML={renderMarkdown(memo.content)}
            />
            {isMasked && (
              <div
                onClick={() => setIsUnmasked(true)}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer bg-base-100/30 hover:bg-base-100/50 rounded-lg backdrop-blur-[2px] transition-colors"
                title="Click to reveal note content"
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-base-200/90 shadow-md border border-base-content/10 text-xs font-medium text-base-content/70 hover:text-base-content">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>Hidden (Privacy Mode) · Click to reveal</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating AI Button on text selection */}
        {aiTooltip && (
          <div
            className="absolute z-30 transform -translate-x-1/2 -translate-y-full animate-fadeIn pointer-events-auto"
            style={{ left: `${aiTooltip.x}px`, top: `${aiTooltip.y}px` }}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleTriggerAiFromTooltip}
              className="btn btn-xs btn-primary gap-1 shadow-lg hover:scale-105 transition-transform rounded-full px-2.5 py-1 text-[11px] font-medium"
              title="Ask AI about selected text"
            >
              <Sparkles className="w-3 h-3 text-warning animate-pulse" />
              <span>Ask AI</span>
            </button>
          </div>
        )}

        {/* Attached Bookmark Card */}
        {memo.bookmark && (
          <BookmarkCard
            bookmark={memo.bookmark}
            onOpenReader={onOpenReader}
            onUpdateStatus={onUpdateBookmarkStatus}
          />
        )}

        {/* Tags footer */}
        {memo.tags && memo.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-1">
            {memo.tags.map((tag) => (
              <span
                key={tag.id || tag.name}
                className="badge badge-sm badge-outline gap-1 text-xs text-base-content/75 hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                <Tag className="w-2.5 h-2.5 opacity-60" />
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Share Note Dialog Modal */}
      {isShareModalOpen && (
        <ShareModal
          memo={memo}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onUpdateMemo={onEdit}
        />
      )}
    </article>
  );
};
