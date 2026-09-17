import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Layers, ExternalLink } from 'lucide-react';
import { apiListMemos } from '../api.js';

export const QuickSearchModal = ({ isOpen, onClose, onSelectMemo, onOpenReader }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiListMemos({ search: query.trim() });
        setResults(res.memos || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 flex justify-center items-start">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-content/10 w-full max-w-2xl overflow-hidden z-10 animate-scaleUp">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-base-content/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-base-content/50 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes, bookmark titles, cached articles, and tags... (FTS5 BM25)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-0 focus:outline-none text-base placeholder:text-base-content/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="kbd kbd-xs bg-base-200 border-base-content/10 shrink-0">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-base-content/50 text-sm">
              <span className="loading loading-spinner loading-sm text-primary"></span>
              <span>Searching rank-indexed knowledge base...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-1">
              {results.map((r) => {
                const isBookmark = r.entity_type === 'bookmark';
                const entity = r.entity;
                if (!entity) return null;

                return (
                  <div
                    key={`${r.entity_type}-${r.entity_id}`}
                    onClick={() => {
                      if (isBookmark && entity.id) {
                        onOpenReader(entity.id);
                      } else {
                        onSelectMemo(entity);
                      }
                      onClose();
                    }}
                    className="p-3 rounded-xl hover:bg-base-200/80 cursor-pointer transition-colors border border-transparent hover:border-base-content/5 group"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-base-content/60 mb-1">
                      <div className="flex items-center gap-1.5">
                        {isBookmark ? (
                          <span className="badge badge-secondary badge-xs">Bookmark</span>
                        ) : (
                          <span className="badge badge-primary badge-xs">Memo</span>
                        )}
                        {entity.folder_name && (
                          <span className="opacity-75">in {entity.folder_name}</span>
                        )}
                      </div>
                      <span className="text-[10px] opacity-50 font-mono">
                        rank: {Number(r.rank).toFixed(2)}
                      </span>
                    </div>

                    <h4 className="font-semibold text-sm text-base-content group-hover:text-primary transition-colors truncate">
                      {r.title || entity.title || entity.content?.slice(0, 60) || 'Untitled'}
                    </h4>

                    {/* Snippet with highlight markup */}
                    {r.content_snippet && (
                      <p
                        className="text-xs text-base-content/75 mt-1 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: r.content_snippet }}
                      />
                    )}
                    {r.article_snippet && (
                      <p
                        className="text-xs text-base-content/60 mt-0.5 line-clamp-1 italic"
                        dangerouslySetInnerHTML={{ __html: r.article_snippet }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : query.trim() ? (
            <div className="text-center py-12 text-base-content/50 text-sm">
              No matching notes or bookmarks found for "{query}".
            </div>
          ) : (
            <div className="text-center py-10 text-base-content/40 text-xs">
              Type keywords to search across notes, URLs, tags, and cached full texts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
