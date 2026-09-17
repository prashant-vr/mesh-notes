import React, { useState, useMemo } from 'react';
import {
  Code,
  Copy,
  Check,
  Search,
  Plus,
  Terminal,
  FileCode,
  Layers,
  ExternalLink,
  X
} from 'lucide-react';

const COMMON_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'bash',
  'sql',
  'json',
  'html',
  'css',
  'rust',
  'go',
  'markdown'
];

export const CodeVaultApp = ({ memos = [], onCreateMemo, onOpenComposer }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  // New snippet modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState('javascript');
  const [newCode, setNewCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Parse all code snippets from memos
  const snippets = useMemo(() => {
    const list = [];

    memos.forEach((memo) => {
      // Regex to extract all ```language ... ``` blocks
      const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
      let match;
      let snippetIndex = 0;

      while ((match = regex.exec(memo.content)) !== null) {
        const lang = match[1]?.trim().toLowerCase() || 'text';
        const code = match[2];
        const firstLine = memo.content.split('\n')[0].replace(/^[#\s]+/, '') || 'Code Snippet';

        list.push({
          id: `${memo.id}-${snippetIndex}`,
          memoId: memo.id,
          title: firstLine,
          language: lang,
          code: code,
          createdAt: memo.created_at,
          tags: memo.tags || []
        });

        snippetIndex++;
      }
    });

    return list;
  }, [memos]);

  // Extract unique languages
  const languages = useMemo(() => {
    const set = new Set();
    snippets.forEach(s => set.add(s.language));
    return Array.from(set).sort();
  }, [snippets]);

  // Filter snippets based on search and language
  const filteredSnippets = useMemo(() => {
    return snippets.filter(s => {
      const matchesLang = selectedLanguage === 'all' || s.language === selectedLanguage;
      const matchesSearch = !searchQuery ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.language.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLang && matchesSearch;
    });
  }, [snippets, selectedLanguage, searchQuery]);

  const copyCode = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewSnippetClick = () => {
    if (onCreateMemo) {
      setShowNewModal(true);
    } else if (typeof onOpenComposer === 'function') {
      onOpenComposer('```javascript\n// Write code snippet here\n```\n');
    } else {
      setShowNewModal(true);
    }
  };

  const handleSaveSnippet = async (e) => {
    e.preventDefault();
    if (!newCode.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const header = newTitle.trim() ? `# ${newTitle.trim()}\n\n` : '';
      const snippetMarkdown = `${header}\`\`\`${newLang}\n${newCode.trim()}\n\`\`\`\n\n#code #${newLang}`;
      if (onCreateMemo) {
        await onCreateMemo({
          content: snippetMarkdown,
          tags: ['code', newLang],
          visibility: 'private'
        });
      } else if (typeof onOpenComposer === 'function') {
        onOpenComposer(snippetMarkdown);
      }
      setNewTitle('');
      setNewCode('');
      setShowNewModal(false);
    } catch (err) {
      console.error('Failed to create snippet:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 animate-fadeIn">
      {/* App Header & Search */}
      <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-bold">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Code Snippet Vault</h2>
              <span className="text-xs text-base-content/50">{snippets.length} snippets captured</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewSnippetClick}
            className="btn btn-xs btn-primary gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Snippet</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-base-content/5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-base-content/40" />
            <input
              type="text"
              placeholder="Search code or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-xs input-bordered w-full pl-8 text-xs"
            />
          </div>

          {/* Language filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedLanguage('all')}
              className={`badge badge-sm cursor-pointer transition-colors ${
                selectedLanguage === 'all' ? 'badge-primary' : 'badge-ghost hover:badge-neutral'
              }`}
            >
              All ({snippets.length})
            </button>
            {languages.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                className={`badge badge-sm font-mono cursor-pointer transition-colors ${
                  selectedLanguage === lang ? 'badge-primary' : 'badge-ghost hover:badge-neutral'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Snippet Grid */}
      {filteredSnippets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {filteredSnippets.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <article
                key={item.id}
                className="card bg-base-100 border border-base-content/10 shadow-sm overflow-hidden text-xs transition-all hover:border-base-content/20"
              >
                {/* Snippet Header */}
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-base-200/50 border-b border-base-content/5">
                  <div className="flex items-center gap-2 truncate flex-1 mr-2">
                    <Terminal className="w-3.5 h-3.5 text-secondary shrink-0" />
                    <span className="font-semibold text-xs truncate">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="badge badge-neutral badge-xs font-mono uppercase text-[9px]">
                      {item.language}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCode(item.id, item.code)}
                      className={`btn btn-xs btn-square ${
                        isCopied ? 'btn-success text-success-content' : 'btn-ghost text-base-content/60'
                      }`}
                      title="Copy code"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Code Block Content */}
                <div className="p-3 bg-neutral text-neutral-content overflow-x-auto max-h-72 font-mono text-[11px] leading-relaxed">
                  <pre>
                    <code>{item.code}</code>
                  </pre>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card bg-base-100 border border-base-content/10 shadow-sm p-10 text-center flex flex-col items-center justify-center gap-2">
          <FileCode className="w-10 h-10 opacity-30 stroke-1" />
          <p className="text-sm font-medium">No code snippets found</p>
          <p className="text-xs text-base-content/60 max-w-xs">
            Write any note with ```code blocks to automatically index it here in your Snippet Vault.
          </p>
        </div>
      )}

      {/* New Snippet Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="card bg-base-100 border border-base-content/15 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Create New Code Snippet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="btn btn-xs btn-ghost btn-square"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSnippet} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-base-content/70 block mb-1">
                  Title / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Quick SQLite connection helper"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input input-sm input-bordered w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-base-content/70 block mb-1">
                  Language
                </label>
                <select
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  className="select select-sm select-bordered w-full text-xs font-mono capitalize"
                >
                  {COMMON_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-base-content/70 block mb-1">
                  Code Snippet
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="// Paste or write code here..."
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="textarea textarea-bordered w-full font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-content/10">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn btn-xs btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCode.trim() || isSaving}
                  className="btn btn-xs btn-primary gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Snippet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
