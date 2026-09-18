import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { AuthView } from './components/AuthModal.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Composer } from './components/Composer.jsx';
import { MemoCard } from './components/MemoCard.jsx';
import { ReaderDrawer } from './components/ReaderDrawer.jsx';
import { QuickSearchModal } from './components/QuickSearchModal.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { AuditLogsModal } from './components/AuditLogsModal.jsx';
import { AiGenerateModal } from './components/AiGenerateModal.jsx';
import { MobileNav } from './components/MobileNav.jsx';
import { PublicShareView } from './components/PublicShareView.jsx';

const DailyNotesApp = lazy(() => import('./components/apps/DailyNotesApp.jsx').then(m => ({ default: m.DailyNotesApp })));
const CodeVaultApp = lazy(() => import('./components/apps/CodeVaultApp.jsx').then(m => ({ default: m.CodeVaultApp })));
const ExpenseTrackerApp = lazy(() => import('./components/apps/ExpenseTrackerApp.jsx').then(m => ({ default: m.ExpenseTrackerApp })));
const FlashcardsApp = lazy(() => import('./components/apps/FlashcardsApp.jsx').then(m => ({ default: m.FlashcardsApp })));
const HighlightsApp = lazy(() => import('./components/apps/HighlightsApp.jsx').then(m => ({ default: m.HighlightsApp })));

import {
  apiListMemos,
  apiCreateMemo,
  apiUpdateMemo,
  apiDeleteMemo,
  apiListFolders,
  apiCreateFolder,
  apiUpdateFolder,
  apiDeleteFolder,
  apiListTags,
  apiUpdateBookmarkStatus
} from './api.js';

import {
  Menu,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Inbox,
  Layers,
  BookMarked,
  LayoutList,
  LayoutGrid,
  Rows3
} from 'lucide-react';

export const App = () => {
  const { user, loading: authLoading } = useAuth();

  // Navigation & Filters
  const [activeFilter, setActiveFilter] = useState({ type: 'all', value: null });
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'oldest' | 'updated'
  const [typeToggle, setTypeToggle] = useState('all'); // 'all' | 'note' | 'bookmark'
  const [streamLayout, setStreamLayout] = useState(() => localStorage.getItem('mesh_notes_layout') || 'stream'); // 'stream' | 'grid' | 'compact'

  const handleLayoutChange = (mode) => {
    setStreamLayout(mode);
    localStorage.setItem('mesh_notes_layout', mode);
  };

  // Data states
  const [memos, setMemos] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderTree, setFolderTree] = useState([]);
  const [unorganizedCount, setUnorganizedCount] = useState(0);
  const [tags, setTags] = useState([]);
  const [loadingMemos, setLoadingMemos] = useState(true);

  // Modals & Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeReaderBookmarkId, setActiveReaderBookmarkId] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalPrefill, setAiModalPrefill] = useState('');

  // Composer prefill text from quote or AI
  const [composerPrefill, setComposerPrefill] = useState('');

  // Fetch Folders & Tags
  const fetchMetadata = useCallback(async () => {
    try {
      const [foldersRes, tagsRes] = await Promise.all([
        apiListFolders(),
        apiListTags()
      ]);
      setFolders(foldersRes.folders || []);
      setFolderTree(foldersRes.tree || []);
      setUnorganizedCount(foldersRes.unorganized_count || 0);
      setTags(tagsRes.tags || []);
    } catch (err) {
      console.error('Error fetching folders/tags:', err);
    }
  }, []);

  // Fetch Memos based on active filters
  const fetchMemos = useCallback(async () => {
    setLoadingMemos(true);
    try {
      const params = {
        sort: sortOption
      };

      if (typeToggle !== 'all') {
        params.type = typeToggle;
      }

      if (activeFilter.type === 'folder') {
        params.folder_id = activeFilter.value;
      } else if (activeFilter.type === 'tag') {
        params.tag = activeFilter.value;
      } else if (activeFilter.type === 'pinned') {
        params.pinned = 'true';
      } else if (activeFilter.type === 'type') {
        params.type = activeFilter.value;
      } else if (activeFilter.type === 'reading_status') {
        params.reading_status = activeFilter.value;
      } else if (activeFilter.type === 'app') {
        params.limit = 500;
      }

      const res = await apiListMemos(params);
      setMemos(res.memos || []);
    } catch (err) {
      console.error('Error fetching memos:', err);
    } finally {
      setLoadingMemos(false);
    }
  }, [activeFilter, sortOption, typeToggle]);

  useEffect(() => {
    if (user) {
      fetchMetadata();
      fetchMemos();
    }
  }, [user, fetchMetadata, fetchMemos]);

  // Keyboard shortcut: Cmd/Ctrl + K for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memo Actions
  const handleCreateMemo = async (memoData) => {
    const res = await apiCreateMemo(memoData);
    if (res.memo) {
      setMemos((prev) => [res.memo, ...prev]);
      fetchMetadata(); // update folder and tag counts
    }
    return res.memo;
  };

  const handleTogglePin = async (id, pinned) => {
    await apiUpdateMemo(id, { pinned });
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pinned } : m))
    );
  };

  const handleEditMemo = async (id, data) => {
    const res = await apiUpdateMemo(id, data);
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...data } : m))
    );
    return res;
  };

  const handleDeleteMemo = async (id) => {
    if (!confirm('Are you sure you want to delete this memo?')) return;
    await apiDeleteMemo(id);
    setMemos((prev) => prev.filter((m) => m.id !== id));
    fetchMetadata();
  };

  const handleUpdateBookmarkStatus = async (bookmarkId, status) => {
    await apiUpdateBookmarkStatus(bookmarkId, status);
    setMemos((prev) =>
      prev.map((m) => {
        if (m.bookmark && m.bookmark.id === bookmarkId) {
          return {
            ...m,
            bookmark: { ...m.bookmark, reading_status: status }
          };
        }
        return m;
      })
    );
  };

  const handleCreateFolder = async (folderData) => {
    await apiCreateFolder(folderData);
    fetchMetadata();
  };

  const handleUpdateFolder = async (id, data) => {
    console.log('[App] handleUpdateFolder called:', id, data);
    try {
      await apiUpdateFolder(id, data);
      await fetchMetadata();
      await fetchMemos();
      console.log('[App] handleUpdateFolder success');
    } catch (err) {
      console.error('[App] handleUpdateFolder failed:', err);
    }
  };

  const handleDeleteFolder = async (id) => {
    console.log('[App] handleDeleteFolder called:', id);
    try {
      await apiDeleteFolder(id, false);
      if (activeFilter.type === 'folder' && activeFilter.value === id) {
        setActiveFilter({ type: 'all', value: null });
      }
      await fetchMetadata();
      await fetchMemos();
      console.log('[App] handleDeleteFolder success');
    } catch (err) {
      console.error('[App] handleDeleteFolder failed:', err);
    }
  };

  const handleInsertQuoteToNote = (quote, sourceUrl) => {
    const formatted = `> "${quote}"\n\n#highlight\nSource: ${sourceUrl || ''}\n\n`;
    setComposerPrefill(formatted);
    setActiveReaderBookmarkId(null);
  };

  const handleSaveHighlight = async (content) => {
    await handleCreateMemo({ content, type: 'note' });
  };

  // Check if viewing a public/shared note link e.g. /s/:token
  const isSharePath = window.location.pathname.startsWith('/s/');
  const shareToken = isSharePath ? window.location.pathname.replace(/^\/s\//, '').split('/')[0] : null;

  if (shareToken) {
    return <PublicShareView token={shareToken} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-base-300 flex text-base-content antialiased">
      {/* Notion-style Persistent / Collapsible Left Sidebar */}
      <Sidebar
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        folders={folders}
        folderTree={folderTree}
        unorganizedCount={unorganizedCount}
        tags={tags}
        onCreateFolder={handleCreateFolder}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={handleDeleteFolder}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Distraction-free Content Canvas */}
      <main className="flex-1 h-screen overflow-y-auto min-w-0 pb-20 lg:pb-8">
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-base-100/90 backdrop-blur-md border-b border-base-content/10 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="btn btn-sm btn-ghost btn-square"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-base tracking-tight">Mesh Notes</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="btn btn-sm btn-ghost btn-square"
              title="Quick Search (Cmd+K)"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="btn btn-sm btn-ghost btn-square text-primary"
              title="Ask AI"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className={`w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 flex-1 flex flex-col transition-all duration-200 ${
          activeFilter.type === 'app'
            ? 'max-w-5xl'
            : streamLayout === 'grid'
            ? 'max-w-7xl'
            : 'max-w-3xl'
        }`}>
          {activeFilter.type === 'app' ? (
            <div className="pb-12">
              <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-base-content/10">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-base-content">
                    {activeFilter.label || 'App'}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setActiveFilter({ type: 'all', value: null })}
                    className="badge badge-sm badge-ghost hover:badge-neutral cursor-pointer"
                  >
                    Back to Stream ✕
                  </button>
                </div>
              </div>

              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-base-content/50">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                    <span className="text-xs">Loading app...</span>
                  </div>
                }
              >
                {activeFilter.value === 'daily' && (
                  <DailyNotesApp
                    memos={memos}
                    onCreateMemo={handleCreateMemo}
                    onUpdateMemo={handleEditMemo}
                  />
                )}
                {activeFilter.value === 'code' && (
                  <CodeVaultApp
                    memos={memos}
                    onCreateMemo={handleCreateMemo}
                    onOpenComposer={(prefill) => {
                      setComposerPrefill(prefill);
                      setActiveFilter({ type: 'all', value: null });
                    }}
                  />
                )}
                {activeFilter.value === 'expenses' && (
                  <ExpenseTrackerApp
                    memos={memos}
                    onCreateMemo={handleCreateMemo}
                    onDeleteMemo={handleDeleteMemo}
                  />
                )}
                {activeFilter.value === 'flashcards' && (
                  <FlashcardsApp
                    memos={memos}
                    onCreateMemo={handleCreateMemo}
                  />
                )}
                {activeFilter.value === 'highlights' && (
                  <HighlightsApp
                    memos={memos}
                    onOpenReader={(bId) => setActiveReaderBookmarkId(bId)}
                  />
                )}
              </Suspense>
            </div>
          ) : (
            <>
              {/* Top Memos-Style Composer */}
              <div className="w-full max-w-3xl mx-auto">
            <Composer
              folders={folders}
              folderTree={folderTree}
              tags={tags}
              onSubmitMemo={handleCreateMemo}
              onTriggerAiGenerate={() => setIsAiModalOpen(true)}
              initialValue={composerPrefill}
            />
          </div>

          {/* Filter & Sort Toolbar */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-base-content/5 text-xs text-base-content/70 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-base-content">
                {activeFilter.label ||
                  (activeFilter.type === 'all'
                    ? 'All Stream'
                    : activeFilter.type === 'tag'
                    ? `#${activeFilter.value}`
                    : activeFilter.type === 'reading_status'
                    ? `Reading: ${activeFilter.value}`
                    : activeFilter.type)}
              </span>
              {activeFilter.type !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveFilter({ type: 'all', value: null })}
                  className="badge badge-xs badge-ghost hover:badge-neutral cursor-pointer"
                >
                  Clear filter ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Toggle: All / Notes / Bookmarks */}
              <div className="join">
                <button
                  type="button"
                  onClick={() => setTypeToggle('all')}
                  className={`btn btn-xs join-item ${typeToggle === 'all' ? 'btn-active btn-primary' : 'btn-ghost'}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setTypeToggle('note')}
                  className={`btn btn-xs join-item ${typeToggle === 'note' ? 'btn-active btn-primary' : 'btn-ghost'}`}
                >
                  Notes
                </button>
                <button
                  type="button"
                  onClick={() => setTypeToggle('bookmark')}
                  className={`btn btn-xs join-item ${typeToggle === 'bookmark' ? 'btn-active btn-primary' : 'btn-ghost'}`}
                >
                  Links
                </button>
              </div>

              {/* Sort Order Dropdown */}
              <div className="dropdown dropdown-end">
                <label
                  tabIndex={0}
                  className="btn btn-xs btn-ghost gap-1 font-normal text-xs"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span className="capitalize">{sortOption}</span>
                </label>
                <ul
                  tabIndex={0}
                  className="dropdown-content z-20 menu p-1 shadow-lg bg-base-200 border border-base-content/10 rounded-box w-36 text-xs"
                >
                  <li>
                    <button
                      type="button"
                      onClick={() => setSortOption('newest')}
                      className={sortOption === 'newest' ? 'active' : ''}
                    >
                      Newest First
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setSortOption('oldest')}
                      className={sortOption === 'oldest' ? 'active' : ''}
                    >
                      Oldest First
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setSortOption('updated')}
                      className={sortOption === 'updated' ? 'active' : ''}
                    >
                      Recently Updated
                    </button>
                  </li>
                </ul>
              </div>

              {/* Layout Switcher (Stream / Grid / Compact) */}
              <div className="join bg-base-200/80 p-0.5 rounded-lg border border-base-content/10 shrink-0">
                <button
                  type="button"
                  onClick={() => handleLayoutChange('stream')}
                  className={`btn btn-xs join-item btn-square h-6 w-6 min-h-0 ${
                    streamLayout === 'stream' ? 'btn-primary' : 'btn-ghost text-base-content/60'
                  }`}
                  title="Stream View (Single column)"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleLayoutChange('grid')}
                  className={`btn btn-xs join-item btn-square h-6 w-6 min-h-0 ${
                    streamLayout === 'grid' ? 'btn-primary' : 'btn-ghost text-base-content/60'
                  }`}
                  title="Responsive Grid View (Multi-column)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleLayoutChange('compact')}
                  className={`btn btn-xs join-item btn-square h-6 w-6 min-h-0 ${
                    streamLayout === 'compact' ? 'btn-primary' : 'btn-ghost text-base-content/60'
                  }`}
                  title="Compact View (Dense list)"
                >
                  <Rows3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Memos Stream Feed */}
          {loadingMemos ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-base-content/50">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <span className="text-xs">Loading stream...</span>
            </div>
          ) : memos.length > 0 ? (
            <div
              className={
                streamLayout === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start'
                  : streamLayout === 'compact'
                  ? 'space-y-1.5'
                  : 'space-y-4'
              }
            >
              {memos.map((memo) => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  layout={streamLayout}
                  onTogglePin={handleTogglePin}
                  onDelete={handleDeleteMemo}
                  onEdit={handleEditMemo}
                  onOpenReader={(bId) => setActiveReaderBookmarkId(bId)}
                  onUpdateBookmarkStatus={handleUpdateBookmarkStatus}
                  onTriggerAiSelection={(text) => {
                    setAiModalPrefill(text);
                    setIsAiModalOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-2 text-base-content/50">
              <Inbox className="w-12 h-12 opacity-30 stroke-1" />
              <p className="text-sm font-medium">No memos in this view</p>
              <p className="text-xs max-w-xs opacity-70">
                Write a note, paste a link, or ask AI above to get started.
              </p>
            </div>
          )}
            </>
          )}
        </div>
      </main>

      {/* Slide-out Distraction-Free Reader Mode Drawer */}
      {activeReaderBookmarkId && (
        <ReaderDrawer
          bookmarkId={activeReaderBookmarkId}
          onClose={() => setActiveReaderBookmarkId(null)}
          onInsertQuoteToNote={handleInsertQuoteToNote}
          onSaveHighlight={handleSaveHighlight}
        />
      )}

      {/* Quick Search Modal (Cmd/Ctrl + K) */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMemo={(memo) => {
          // Scroll or filter
        }}
        onOpenReader={(bId) => setActiveReaderBookmarkId(bId)}
      />

      {/* Settings Hub Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          fetchMetadata();
        }}
      />

      {/* Audit Logs Modal */}
      <AuditLogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />

      {/* AI Generate / Ask AI Modal */}
      <AiGenerateModal
        isOpen={isAiModalOpen}
        initialQuery={aiModalPrefill}
        onClose={() => {
          setIsAiModalOpen(false);
          setAiModalPrefill('');
        }}
        onInsertToComposer={(text) => {
          setComposerPrefill((prev) => (prev ? `${prev}\n\n${text}` : text));
        }}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(true)}
      />
    </div>
  );
};
