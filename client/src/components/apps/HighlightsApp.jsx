import React, { useState, useMemo } from 'react';
import {
  Highlighter,
  Quote,
  Copy,
  Check,
  Search,
  ExternalLink,
  BookOpen,
  Trash2
} from 'lucide-react';
import { marked } from 'marked';

export const HighlightsApp = ({ memos = [], onOpenReader, onDeleteMemo }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Extract all highlights and quotes
  const highlights = useMemo(() => {
    return memos
      .filter((m) => {
        const isTag = m.tags?.some(t => t.name.toLowerCase() === 'highlight' || t.name.toLowerCase() === 'quote');
        const hasBlockquote = m.content.includes('> ');
        return isTag || hasBlockquote;
      })
      .sort((a, b) => b.created_at - a.created_at);
  }, [memos]);

  const filteredHighlights = useMemo(() => {
    if (!searchQuery.trim()) return highlights;
    const q = searchQuery.toLowerCase();
    return highlights.filter(h =>
      h.content.toLowerCase().includes(q) ||
      (h.bookmark && h.bookmark.title?.toLowerCase().includes(q))
    );
  }, [highlights, searchQuery]);

  const copyQuote = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMarkdown = (text) => {
    try {
      return { __html: marked.parse(text || '', { breaks: true }) };
    } catch (_) {
      return { __html: text };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-info/10 text-info flex items-center justify-center font-bold">
              <Highlighter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Highlights & Quotes Inbox</h2>
              <span className="text-xs text-base-content/50">{highlights.length} passages saved</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4 pt-3 border-t border-base-content/5">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-5 text-base-content/40" />
          <input
            type="text"
            placeholder="Search saved highlights and quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-xs input-bordered w-full pl-8 text-xs"
          />
        </div>
      </div>

      {/* Highlights Feed */}
      {filteredHighlights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {filteredHighlights.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <article
                key={item.id}
                className="card bg-base-100 border border-base-content/10 shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-all hover:border-base-content/25"
              >
                {/* Quote Header */}
                <div className="flex items-center justify-between text-xs text-base-content/50 pb-2 mb-2 border-b border-base-content/5">
                  <div className="flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-primary opacity-60" />
                    <span className="text-[11px] font-mono">
                      {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyQuote(item.id, item.content)}
                      className={`btn btn-xs btn-square ${isCopied ? 'btn-success text-success-content' : 'btn-ghost text-base-content/60'}`}
                      title="Copy passage"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteMemo(item.id)}
                      className="btn btn-xs btn-ghost btn-square text-error/40 hover:text-error"
                      title="Delete highlight"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Quote Body */}
                <div
                  className="markdown-body text-xs sm:text-sm italic text-base-content/90 font-serif leading-relaxed my-2"
                  dangerouslySetInnerHTML={renderMarkdown(item.content)}
                />

                {/* Bookmark Source footer */}
                {item.bookmark && (
                  <div className="mt-3 pt-2.5 border-t border-base-content/5 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      {item.bookmark.favicon ? (
                        <img src={item.bookmark.favicon} alt="" className="w-3.5 h-3.5 rounded shrink-0" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5 text-secondary shrink-0" />
                      )}
                      <span className="truncate text-base-content/75 font-sans text-[11px]">
                        {item.bookmark.title || item.bookmark.domain}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenReader(item.bookmark.id)}
                      className="btn btn-xs btn-ghost gap-1 text-[11px] font-normal shrink-0 text-primary"
                      title="Open full article in Reader Mode"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Reader</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card bg-base-100 border border-base-content/10 shadow-sm p-10 text-center flex flex-col items-center justify-center gap-2">
          <Highlighter className="w-10 h-10 opacity-30 stroke-1" />
          <p className="text-sm font-medium">No highlights or quotes found</p>
          <p className="text-xs text-base-content/60 max-w-xs">
            Highlight text while reading in Reader Mode, or write any note starting with &gt; &quot;quote...&quot; #highlight to save it here.
          </p>
        </div>
      )}
    </div>
  );
};
