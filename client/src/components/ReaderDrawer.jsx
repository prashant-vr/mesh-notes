import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Sparkles, Clock, Globe, Copy, Check, ChevronDown, Highlighter } from 'lucide-react';
import { apiGetReaderContent, apiStreamAI, apiListPrompts } from '../api.js';

export const ReaderDrawer = ({ bookmarkId, onClose, onInsertQuoteToNote, onSaveHighlight }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection & AI state
  const [selectedText, setSelectedText] = useState('');
  const [aiPrompts, setAiPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const [aiResponseText, setAiResponseText] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedHighlight, setSavedHighlight] = useState(false);

  useEffect(() => {
    if (!bookmarkId) return;
    setLoading(true);
    setError(null);
    setAiResponseText('');
    setSelectedText('');

    apiGetReaderContent(bookmarkId)
      .then((res) => {
        setData(res.reader);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load article reader.');
      })
      .finally(() => {
        setLoading(false);
      });

    // Fetch selection AI prompts
    apiListPrompts('selection')
      .then((res) => {
        setAiPrompts(res.prompts || []);
        if (res.prompts?.length > 0) {
          setSelectedPrompt(res.prompts[0].id);
        }
      })
      .catch(() => {});
  }, [bookmarkId]);

  const handleSelection = () => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (text && text.length > 5) {
      setSelectedText(text);
    }
  };

  const handleRunAi = async (promptIdToUse = null, customText = '') => {
    if (!selectedText && !data?.readable_text) return;

    setIsAiStreaming(true);
    setAiResponseText('');

    const targetText = selectedText || data.readable_text.slice(0, 3000);

    try {
      await apiStreamAI({
        eventType: 'selection',
        promptId: promptIdToUse || selectedPrompt,
        customInstruction: customText || customInstruction,
        selectedText: targetText,
        contextText: data?.title || '',
        onChunk: (chunk) => {
          setAiResponseText((prev) => prev + chunk);
        },
        onDone: () => {
          setIsAiStreaming(false);
        },
        onError: (err) => {
          setAiResponseText((prev) => prev + `\n\n[Error: ${err.message}]`);
          setIsAiStreaming(false);
        }
      });
    } catch (err) {
      setAiResponseText(`[Error: ${err.message}]`);
      setIsAiStreaming(false);
    }
  };

  const handleCopyAi = () => {
    navigator.clipboard.writeText(aiResponseText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!bookmarkId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer Canvas */}
      <aside className="relative z-10 w-full max-w-2xl bg-base-100 shadow-2xl border-l border-base-content/10 flex flex-col h-full overflow-hidden animate-slideLeft">
        {/* Top Header */}
        <div className="p-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="badge badge-primary badge-sm">Reader Mode</span>
            {data?.domain && (
              <span className="text-xs text-base-content/60 truncate flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {data.domain}
              </span>
            )}
            {data?.reading_time_mins && (
              <span className="text-xs text-base-content/60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {data.reading_time_mins} min read
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {data?.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-ghost btn-square"
                title="Open original page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-ghost btn-square"
              title="Close reader"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          className="flex-1 overflow-y-auto p-5 sm:p-8 select-text"
          onMouseUp={handleSelection}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-base-content/50">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <p className="text-sm">Extracting clean readable article...</p>
            </div>
          ) : error ? (
            <div className="alert alert-warning text-xs">
              <span>{error}</span>
            </div>
          ) : data ? (
            <article className="max-w-prose mx-auto">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 leading-tight">
                {data.title}
              </h1>

              {data.byline && (
                <p className="text-sm text-base-content/60 italic mb-6">
                  By {data.byline}
                </p>
              )}

              {data.readable_html ? (
                <div
                  className="markdown-body text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: data.readable_html }}
                />
              ) : data.readable_text ? (
                <div className="text-base leading-relaxed whitespace-pre-line">
                  {data.readable_text}
                </div>
              ) : (
                <p className="text-base-content/50 italic">
                  No readable content available. Visit the original page directly.
                </p>
              )}
            </article>
          ) : null}
        </div>

        {/* Highlight / AI Assistance Bar */}
        <div className="p-3 sm:p-4 border-t border-base-content/10 bg-base-200/90 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-base-content/70">
            <span className="flex items-center gap-1 font-medium text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              {selectedText ? 'Highlighted Passage' : 'AI Reader Actions'}
            </span>
            {selectedText && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    const highlightContent = `> "${selectedText}"\n\n#highlight ${data?.url ? `[Source](${data.url})` : ''}`;
                    if (onSaveHighlight) {
                      await onSaveHighlight(highlightContent);
                      setSavedHighlight(true);
                      setTimeout(() => setSavedHighlight(false), 2000);
                    } else {
                      onInsertQuoteToNote?.(selectedText, data?.url);
                    }
                  }}
                  className="btn btn-xs btn-primary gap-1 text-[11px]"
                  title="Save directly to Highlights Inbox"
                >
                  <Highlighter className="w-3 h-3" />
                  {savedHighlight ? 'Saved ✓' : 'Save Highlight'}
                </button>
                <button
                  type="button"
                  onClick={() => onInsertQuoteToNote?.(selectedText, data?.url)}
                  className="btn btn-xs btn-ghost gap-1 text-[11px]"
                  title="Insert quote into Note Composer"
                >
                  Quote in Note
                </button>
              </div>
            )}
          </div>

          {/* Quick AI Action Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {aiPrompts.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isAiStreaming}
                onClick={() => {
                  setSelectedPrompt(p.id);
                  handleRunAi(p.id);
                }}
                className="btn btn-xs btn-outline btn-primary text-xs"
              >
                {p.title}
              </button>
            ))}
          </div>

          {/* Custom Instruction Input */}
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              placeholder={selectedText ? "Ask AI about selected text..." : "Ask AI about this article..."}
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunAi(null, customInstruction);
              }}
              className="input input-xs input-bordered w-full text-xs"
            />
            <button
              type="button"
              disabled={isAiStreaming || (!customInstruction.trim() && !selectedText)}
              onClick={() => handleRunAi(null, customInstruction)}
              className="btn btn-xs btn-primary shrink-0"
            >
              {isAiStreaming ? <span className="loading loading-spinner loading-xs" /> : 'Ask'}
            </button>
          </div>

          {/* Streamed AI Response Card */}
          {aiResponseText && (
            <div className="mt-2 p-3 bg-base-100 rounded-lg border border-primary/30 max-h-48 overflow-y-auto text-xs relative">
              <div className="flex items-center justify-between mb-1 text-[11px] text-base-content/60 border-b border-base-content/5 pb-1">
                <span className="font-semibold text-primary">AI Output</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyAi}
                    className="btn btn-ghost btn-xs p-1 h-auto"
                    title="Copy AI response"
                  >
                    {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">
                {aiResponseText}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
