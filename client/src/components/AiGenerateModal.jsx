import React, { useState, useEffect } from 'react';
import { Sparkles, X, Send, Copy, Check, ArrowDownToLine, Loader2 } from 'lucide-react';
import { apiListPrompts, apiStreamAI } from '../api.js';

export const AiGenerateModal = ({ isOpen, onClose, onInsertToComposer, initialQuery = '' }) => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setOutput('');
    setInputQuery(initialQuery || '');
    apiListPrompts('generation')
      .then((res) => {
        setPrompts(res.prompts || []);
        if (res.prompts?.length > 0) {
          setSelectedPromptId(res.prompts[0].id);
        }
      })
      .catch(() => {});
  }, [isOpen, initialQuery]);

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!inputQuery.trim() || isStreaming) return;

    setIsStreaming(true);
    setOutput('');

    try {
      await apiStreamAI({
        eventType: 'generation',
        promptId: selectedPromptId || null,
        customInstruction: inputQuery.trim(),
        selectedText: inputQuery.trim(),
        contextText: '',
        onChunk: (chunk) => {
          setOutput((prev) => prev + chunk);
        },
        onDone: () => {
          setIsStreaming(false);
        },
        onError: (err) => {
          setOutput((prev) => prev + `\n\n[Error: ${err.message}]`);
          setIsStreaming(false);
        }
      });
    } catch (err) {
      setOutput(`[Error: ${err.message}]`);
      setIsStreaming(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    onInsertToComposer(output);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-16 flex justify-center items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-content/10 w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] animate-scaleUp">
        {/* Header */}
        <div className="p-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Ask AI / Draft with LLM</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-square"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* Prompt template selector */}
          {prompts.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-base-content/60 mr-1">Template:</span>
              {prompts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPromptId(p.id)}
                  className={`btn btn-xs rounded-lg ${
                    selectedPromptId === p.id ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}

          {/* User Prompt Input */}
          <form onSubmit={handleGenerate} className="flex gap-2">
            <textarea
              required
              rows={2}
              placeholder="What would you like AI to draft, summarize, or brainstorm?..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate(e);
              }}
              className="textarea textarea-bordered w-full text-xs placeholder:text-base-content/40 resize-none"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isStreaming}
              className="btn btn-primary btn-sm self-end gap-1 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Generate</span>
            </button>
          </form>

          {/* Streaming Output Canvas */}
          {(output || isStreaming) && (
            <div className="p-4 bg-base-200/60 rounded-xl border border-base-content/10 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-base-content/60 border-b border-base-content/5 pb-2">
                <span className="font-semibold text-primary flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Generated Draft
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn btn-xs btn-ghost gap-1 text-[11px]"
                  >
                    {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleInsert}
                    className="btn btn-xs btn-primary gap-1 text-[11px]"
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    <span>Insert to Note</span>
                  </button>
                </div>
              </div>

              <div className="markdown-body text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {output}
                {isStreaming && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
