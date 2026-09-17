import React from 'react';
import { ExternalLink, BookOpen, Check, Archive, Clock } from 'lucide-react';

export const BookmarkCard = ({ bookmark, onOpenReader, onUpdateStatus }) => {
  if (!bookmark) return null;

  const {
    id,
    url,
    domain,
    title,
    description,
    image_url,
    favicon,
    reading_status,
    has_reader_cache
  } = bookmark;

  return (
    <div className="card bg-base-200/70 border border-base-content/10 shadow-sm overflow-hidden hover:border-primary/40 transition-colors mt-3">
      {image_url && (
        <div className="w-full h-36 md:h-44 overflow-hidden bg-base-300 relative">
          <img
            src={image_url}
            alt={title || domain}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      <div className="p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-xs text-base-content/70">
          <div className="flex items-center gap-1.5 truncate">
            {favicon && (
              <img
                src={favicon}
                alt=""
                className="w-4 h-4 rounded-sm shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <span className="font-medium tracking-wide truncate">{domain}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Reading status pill */}
            <span className={`badge badge-sm ${
              reading_status === 'archived' ? 'badge-ghost opacity-60' :
              reading_status === 'reading' ? 'badge-primary badge-outline' :
              'badge-warning badge-outline'
            }`}>
              {reading_status}
            </span>
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold hover:text-primary line-clamp-2 transition-colors flex items-start justify-between gap-1 group"
        >
          <span>{title || url}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
        </a>

        {description && (
          <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-base-content/5 mt-1">
          <div className="flex items-center gap-1.5">
            {has_reader_cache && (
              <button
                type="button"
                onClick={() => onOpenReader(id)}
                className="btn btn-xs btn-primary gap-1 text-xs"
                title="Open clean Reader View"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read</span>
              </button>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-xs btn-ghost gap-1 text-xs"
            >
              <span>Visit</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-1">
            {reading_status !== 'reading' && (
              <button
                type="button"
                onClick={() => onUpdateStatus(id, 'reading')}
                className="btn btn-xs btn-ghost btn-square"
                title="Mark as Reading"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
            )}
            {reading_status !== 'archived' && (
              <button
                type="button"
                onClick={() => onUpdateStatus(id, 'archived')}
                className="btn btn-xs btn-ghost btn-square"
                title="Mark as Done / Archive"
              >
                <Check className="w-3.5 h-3.5 text-success" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
