import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  CheckSquare,
  Plus,
  Edit3,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { marked } from 'marked';
import { WysiwygToolbar } from '../WysiwygToolbar.jsx';
import { handleEditorKeyDown } from '../../utils/editorUtils.js';

export const DailyNotesApp = ({ memos = [], onCreateMemo, onUpdateMemo }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editPreview, setEditPreview] = useState(false);
  const editRef = useRef(null);

  // Find daily note for the selected date
  const dailyNote = useMemo(() => {
    return memos.find(m => {
      const isDaily = m.tags?.some(t => t.name.toLowerCase() === 'daily') || m.content.includes('#daily');
      const hasDate = m.content.includes(selectedDate) ||
        new Date(m.created_at).toISOString().slice(0, 10) === selectedDate;
      return isDaily && hasDate;
    });
  }, [memos, selectedDate]);

  // Calculate habit streak across all past daily notes
  const habitStreak = useMemo(() => {
    const dailyMemos = memos
      .filter(m => m.tags?.some(t => t.name.toLowerCase() === 'daily') || m.content.includes('#daily'))
      .sort((a, b) => b.created_at - a.created_at);

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = new Date();

    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const noteForDate = dailyMemos.find(m =>
        m.content.includes(dateStr) || new Date(m.created_at).toISOString().slice(0, 10) === dateStr
      );

      if (noteForDate && noteForDate.content.includes('- [x]')) {
        streak++;
      } else if (dateStr !== today) {
        // If not today and no completed habits, streak breaks
        break;
      }

      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }, [memos]);

  const shiftDate = (deltaDays) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + deltaDays);
    setSelectedDate(d.toISOString().slice(0, 10));
    setIsEditing(false);
  };

  const handleCreateDailyNote = () => {
    const template = `# 📅 Daily Note - ${selectedDate} #daily

### 🎯 Top Priorities
- [ ] Priority 1
- [ ] Priority 2
- [ ] Priority 3

### ⚡ Daily Habits
- [ ] Morning movement / exercise
- [ ] Drink 2L water
- [ ] 30m Reading or building
- [ ] Meditate / Reflect

### 📝 Notes & Reflections
- 
`;
    onCreateMemo({
      content: template,
      tags: ['daily'],
      visibility: 'private'
    });
  };

  const handleToggleCheckbox = (index) => {
    if (!dailyNote) return;

    let currentIndex = 0;
    const newContent = dailyNote.content.replace(/(- \[[ xX]\])/g, (match) => {
      if (currentIndex === index) {
        currentIndex++;
        return match.toLowerCase().includes('x') ? '- [ ]' : '- [x]';
      }
      currentIndex++;
      return match;
    });

    if (newContent !== dailyNote.content) {
      onUpdateMemo(dailyNote.id, { content: newContent });
    }
  };

  const handleSaveEdit = () => {
    if (!dailyNote) return;
    onUpdateMemo(dailyNote.id, { content: editContent });
    setIsEditing(false);
  };

  const renderMarkdown = (text) => {
    try {
      return { __html: marked.parse(text || '', { breaks: true }) };
    } catch (_) {
      return { __html: text };
    }
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-fadeIn">
      {/* App Header & Date Navigator */}
      <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Daily Journal & Habits</h2>
              <span className="text-xs text-base-content/50">One page per day</span>
            </div>
          </div>

          {/* Habit Streak Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 text-warning border border-warning/20 rounded-xl text-xs font-semibold">
            <Flame className="w-4 h-4 fill-current" />
            <span>{habitStreak} Day Streak</span>
          </div>
        </div>

        {/* Date Controls */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-base-content/5 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="btn btn-xs btn-ghost btn-square"
              title="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className={`btn btn-xs ${isToday ? 'btn-primary font-semibold' : 'btn-ghost'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="btn btn-xs btn-ghost btn-square"
              title="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setIsEditing(false);
                }
              }}
              className="input input-xs input-bordered text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Note Content / Editor Area */}
      {dailyNote ? (
        <article className="card bg-base-100 border border-base-content/10 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-base-content/5 text-xs text-base-content/60">
            <span className="font-mono">{selectedDate}</span>
            <button
              type="button"
              onClick={() => {
                setEditContent(dailyNote.content);
                setIsEditing(!isEditing);
              }}
              className="btn btn-xs btn-ghost gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Note'}</span>
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div className="border border-base-content/15 rounded-xl overflow-hidden shadow-xs bg-base-100">
                <WysiwygToolbar
                  textareaRef={editRef}
                  setContent={setEditContent}
                  isPreview={editPreview}
                  onTogglePreview={setEditPreview}
                />
                {editPreview ? (
                  <div
                    className="markdown-body p-4 min-h-[260px] max-h-[500px] overflow-y-auto text-sm leading-relaxed bg-base-100"
                    dangerouslySetInnerHTML={renderMarkdown(editContent || '*Nothing to preview*')}
                  />
                ) : (
                  <textarea
                    ref={editRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => handleEditorKeyDown(e, editRef.current, setEditContent)}
                    rows={12}
                    className="w-full bg-base-100 p-3.5 focus:outline-none font-mono text-sm leading-relaxed resize-y border-0 min-h-[260px]"
                    placeholder="Write daily notes, priorities, habits..."
                  />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditPreview(false);
                  }}
                  className="btn btn-xs btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveEdit();
                    setEditPreview(false);
                  }}
                  className="btn btn-xs btn-primary gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div
              className="markdown-body text-sm leading-relaxed"
              onClick={(e) => {
                if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                  e.preventDefault();
                  const container = e.target.closest('.markdown-body');
                  if (!container) return;
                  const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
                  const index = checkboxes.indexOf(e.target);
                  if (index !== -1) handleToggleCheckbox(index);
                }
              }}
              dangerouslySetInnerHTML={renderMarkdown(dailyNote.content)}
            />
          )}
        </article>
      ) : (
        /* Empty State for Date */
        <div className="card bg-base-100 border border-base-content/10 shadow-sm p-8 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-base-200 flex items-center justify-center text-base-content/40">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm">No Daily Note for {selectedDate}</h3>
          <p className="text-xs text-base-content/60 max-w-sm">
            Start today's entry with daily priorities, habit checklists, and reflection notes.
          </p>
          <button
            type="button"
            onClick={handleCreateDailyNote}
            className="btn btn-sm btn-primary gap-1.5 mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Daily Note</span>
          </button>
        </div>
      )}
    </div>
  );
};
