import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Plus,
  Check,
  Sparkles,
  HelpCircle,
  Eye,
  Trash2
} from 'lucide-react';
import { marked } from 'marked';

export const FlashcardsApp = ({ memos = [], onCreateMemo, onDeleteMemo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // Extract flashcards from notes
  const cards = useMemo(() => {
    const list = [];

    memos.forEach((memo) => {
      const isCardTag = memo.tags?.some(t => t.name.toLowerCase() === 'flashcard') || memo.content.includes('#flashcard');

      // Pattern 1: Q: question \n A: answer
      const qaMatch = memo.content.match(/Q:\s*([\s\S]*?)\nA:\s*([\s\S]*?)(?:$|\n\n)/i);
      if (qaMatch) {
        list.push({
          id: memo.id,
          question: qaMatch[1].trim(),
          answer: qaMatch[2].replace(/#flashcard/gi, '').trim(),
          createdAt: memo.created_at
        });
        return;
      }

      // Pattern 2: Term :: Definition
      const splitMatch = memo.content.match(/^([^:\n]+)::([^:\n]+)/m);
      if (splitMatch) {
        list.push({
          id: memo.id,
          question: splitMatch[1].trim(),
          answer: splitMatch[2].replace(/#flashcard/gi, '').trim(),
          createdAt: memo.created_at
        });
        return;
      }

      // Pattern 3: If tagged #flashcard but unstructured, use first line as question and rest as answer
      if (isCardTag) {
        const lines = memo.content.replace(/#flashcard/gi, '').trim().split('\n');
        const q = lines[0] || 'Question';
        const a = lines.slice(1).join('\n').trim() || 'No answer provided.';
        list.push({
          id: memo.id,
          question: q,
          answer: a,
          createdAt: memo.created_at
        });
      }
    });

    return list;
  }, [memos]);

  const currentCard = cards[currentIndex] || null;

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCurrentIndex(Math.floor(Math.random() * cards.length));
  };

  const handleCreateCard = (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const formatted = `Q: ${newQuestion.trim()}\nA: ${newAnswer.trim()} #flashcard`;

    onCreateMemo({
      content: formatted,
      tags: ['flashcard'],
      visibility: 'private'
    });

    setNewQuestion('');
    setNewAnswer('');
    setIsAdding(false);
  };

  const renderMarkdown = (text) => {
    try {
      return { __html: marked.parse(text || '', { breaks: true }) };
    } catch (_) {
      return { __html: text };
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Flashcard Study Deck</h2>
              <span className="text-xs text-base-content/50">{cards.length} flashcards available</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cards.length > 1 && (
              <button
                type="button"
                onClick={handleShuffle}
                className="btn btn-xs btn-ghost gap-1"
                title="Shuffle deck"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Shuffle</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="btn btn-xs btn-primary gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {cards.length > 0 && (
          <div className="mt-4 pt-3 border-t border-base-content/5 flex items-center justify-between text-xs text-base-content/60">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <progress
              className="progress progress-primary w-44 h-1.5"
              value={currentIndex + 1}
              max={cards.length}
            ></progress>
          </div>
        )}
      </div>

      {/* Add Card Form Modal / Expandable */}
      {isAdding && (
        <div className="card bg-base-100 border border-primary/30 shadow-md p-4 animate-fadeIn text-xs">
          <h3 className="font-bold text-xs uppercase tracking-wider text-base-content/70 mb-2">
            Create Flashcard
          </h3>
          <form onSubmit={handleCreateCard} className="space-y-2">
            <div>
              <label className="text-[11px] text-base-content/60 block mb-1">Question / Term (Front)</label>
              <input
                type="text"
                placeholder="e.g. What is SQLite WAL mode?"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="input input-xs input-bordered w-full text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-base-content/60 block mb-1">Answer / Definition (Back)</label>
              <textarea
                placeholder="e.g. Write-Ahead Logging allows concurrent reads while writing."
                rows={3}
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="textarea textarea-bordered w-full text-xs"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="btn btn-xs btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-xs btn-primary">
                Save Card
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interactive Card Canvas */}
      {currentCard ? (
        <div className="space-y-4">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`card border cursor-pointer min-h-[260px] sm:min-h-[300px] flex flex-col justify-between p-6 sm:p-8 rounded-3xl transition-all duration-300 shadow-md select-none relative group ${
              isFlipped
                ? 'bg-base-200 border-primary/40 shadow-primary/10'
                : 'bg-base-100 border-base-content/15 hover:border-base-content/30'
            }`}
          >
            {/* Card Badge */}
            <div className="flex items-center justify-between text-xs text-base-content/50">
              <span className="badge badge-xs badge-neutral font-semibold uppercase tracking-wider text-[9px]">
                {isFlipped ? 'Answer (Back)' : 'Question (Front)'}
              </span>
              <span className="text-[10px] text-base-content/40 font-mono">
                Click anywhere to flip ↵
              </span>
            </div>

            {/* Question / Answer Text */}
            <div className="my-auto py-6 text-center">
              {isFlipped ? (
                <div
                  className="markdown-body text-base sm:text-lg font-medium text-base-content leading-relaxed"
                  dangerouslySetInnerHTML={renderMarkdown(currentCard.answer)}
                />
              ) : (
                <h3 className="text-lg sm:text-xl font-bold text-base-content leading-snug">
                  {currentCard.question}
                </h3>
              )}
            </div>

            {/* Card Footer Hint */}
            <div className="flex items-center justify-between text-xs text-base-content/40 pt-3 border-t border-base-content/5">
              <span className="text-[10px]">Mesh Flashcards</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
                className="btn btn-xs btn-ghost gap-1"
              >
                <RotateCw className="w-3 h-3" />
                <span>{isFlipped ? 'Show Question' : 'Reveal Answer'}</span>
              </button>
            </div>
          </div>

          {/* Navigation & Self-Assessment Controls */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={cards.length <= 1}
              className="btn btn-sm btn-ghost gap-1 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-sm btn-outline btn-error text-xs"
              >
                Again
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-sm btn-primary text-xs font-semibold px-4"
              >
                Good ✓
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-sm btn-outline btn-success text-xs"
              >
                Easy
              </button>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={cards.length <= 1}
              className="btn btn-sm btn-ghost gap-1 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 border border-base-content/10 shadow-sm p-10 text-center flex flex-col items-center justify-center gap-3">
          <HelpCircle className="w-10 h-10 opacity-30 stroke-1" />
          <h3 className="font-bold text-sm">No Flashcards Found</h3>
          <p className="text-xs text-base-content/60 max-w-xs">
            Create cards using the "Add Card" button above, or write any note with `Q: Question` and `A: Answer #flashcard`.
          </p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="btn btn-xs btn-primary gap-1 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Flashcard</span>
          </button>
        </div>
      )}
    </div>
  );
};
