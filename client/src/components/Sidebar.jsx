import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  BookMarked,
  Layers,
  Pin,
  FolderPlus,
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Tag as TagIcon,
  Settings,
  Activity,
  LogOut,
  Palette,
  CheckCircle2,
  Clock,
  Archive,
  Plus,
  Hash,
  Edit2,
  Trash2,
  Paintbrush,
  FolderMinus,
  Calendar,
  Code,
  Receipt,
  GraduationCap,
  Highlighter,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme, THEMES } from '../context/ThemeContext.jsx';

const FOLDER_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6'  // Purple
];

export const Sidebar = ({
  activeFilter,
  setActiveFilter,
  folderTree = [],
  unorganizedCount = 0,
  tags = [],
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onOpenSearch,
  onOpenSettings,
  onOpenLogs,
  isOpen,
  onCloseMobile
}) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Expanded folders map: defaults to open (true)
  const [expandedFolders, setExpandedFolders] = useState({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [parentFolderForNew, setParentFolderForNew] = useState(null);

  // Rename modal/inline state
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  // Delete folder confirmation modal state
  const [folderToDelete, setFolderToDelete] = useState(null);

  // Right-click Context Menu state
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    folder: null
  });

  // Toggleable Tags section state
  const [isTagsOpen, setIsTagsOpen] = useState(true);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleCloseMenu = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, folder: null });
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseMenu();
        setRenamingFolder(null);
      }
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.visible]);

  const toggleFolderExpand = (folderId, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const current = prev[folderId] !== undefined ? prev[folderId] : true;
      return { ...prev, [folderId]: !current };
    });
  };

  const handleCreateFolderSubmit = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder({
      name: newFolderName.trim(),
      parent_id: parentFolderForNew
    });
    setNewFolderName('');
    setShowNewFolderInput(false);
    setParentFolderForNew(null);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameInput.trim() || !renamingFolder) return;
    const targetId = renamingFolder.id;
    const newName = renameInput.trim();
    console.log('[Sidebar] Renaming folder:', targetId, 'to:', newName);
    setRenamingFolder(null);
    setRenameInput('');
    await onUpdateFolder(targetId, { name: newName });
  };

  const handleFolderContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      folder
    });
  };

  // Render recursive folder tree with nested child lists and visual indent guides
  const renderFolderItems = (items, depth = 0) => {
    if (!items || items.length === 0) return null;

    return items.map((f) => {
      const isExpanded = expandedFolders[f.id] !== undefined ? expandedFolders[f.id] : true;
      const hasChildren = f.children && f.children.length > 0;
      const isSelected = activeFilter.type === 'folder' && activeFilter.value === f.id;
      const isRenamingThis = renamingFolder && renamingFolder.id === f.id;

      return (
        <li key={f.id} className="w-full">
          {isRenamingThis ? (
            <form
              onSubmit={handleRenameSubmit}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 py-1 px-1.5 w-full bg-base-200/95 rounded-lg border border-primary shadow-xs my-0.5"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: f.color || '#6366f1' }}
              />
              <input
                type="text"
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setRenamingFolder(null);
                  }
                }}
                className="input input-xs input-bordered flex-1 min-w-0 text-xs h-6.5 px-2"
                placeholder="Folder name..."
              />
              <button
                type="submit"
                className="btn btn-xs btn-primary h-6.5 min-h-0 px-2 font-medium shrink-0"
                title="Save name"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setRenamingFolder(null)}
                className="btn btn-xs btn-ghost h-6.5 min-h-0 px-1.5 shrink-0"
                title="Cancel"
              >
                ✕
              </button>
            </form>
          ) : (
            <div
              onContextMenu={(e) => handleFolderContextMenu(e, f)}
              className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors group ${
                isSelected
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'hover:bg-base-200 text-base-content/80'
              }`}
              onClick={() => {
                setActiveFilter({ type: 'folder', value: f.id, label: f.name });
                onCloseMobile();
              }}
            >
            <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => toggleFolderExpand(f.id, e)}
                  className="p-0.5 hover:bg-base-content/10 rounded shrink-0 transition-transform"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-base-content/60" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-base-content/60" />
                  )}
                </button>
              ) : (
                <span className="w-3.5 h-3.5 shrink-0" />
              )}

              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: f.color || '#6366f1' }}
              />

              {isExpanded && hasChildren ? (
                <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0 opacity-80" />
              ) : (
                <FolderIcon className="w-3.5 h-3.5 text-base-content/50 shrink-0" />
              )}

              <span className="truncate text-xs">{f.name}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Add subfolder button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setParentFolderForNew(f.id);
                  setShowNewFolderInput(true);
                }}
                className="p-1 text-base-content/40 hover:text-primary rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title={`Add subfolder under ${f.name}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {f.memo_count > 0 && (
                <span className="text-[10px] text-base-content/50 px-1 font-mono">
                  {f.memo_count}
                </span>
              )}
            </div>
          </div>
        )}

          {/* Subfolders list indented with vertical guide line */}
          {hasChildren && isExpanded && (
            <ul className="w-full border-l border-base-content/15 pl-2.5 ml-3 my-0.5 space-y-0.5">
              {renderFolderItems(f.children, depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 bottom-0 z-40 w-64 sm:w-72 h-screen max-h-screen bg-base-100 border-r border-base-content/10 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header & Navigation - Extends naturally and scrolls internally */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {/* Brand Header & Profile */}
          <div className="p-4 border-b border-base-content/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-content font-black text-base shadow-sm">
                M
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight leading-none">Mesh Notes</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-base-content/50 truncate max-w-[100px]" title={user?.email}>
                    {user?.email || 'Self-hosted'}
                  </span>
                  {user?.email_verified === 1 ? (
                    <span className="text-[9px] text-success" title="Email verified">●</span>
                  ) : (
                    <span className="text-[9px] text-warning" title="Email pending verification">○</span>
                  )}
                </div>
              </div>
            </div>

            {user?.role && (
              <span className="badge badge-xs badge-neutral uppercase font-mono tracking-wider text-[9px]">
                {user.role}
              </span>
            )}
          </div>

          {/* Quick Search Shortcut Button */}
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={onOpenSearch}
              className="btn btn-sm btn-ghost bg-base-200/80 hover:bg-base-200 border border-base-content/5 w-full justify-between text-base-content/60 font-normal px-2.5 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Quick find...</span>
              </div>
              <kbd className="kbd kbd-xs bg-base-100 text-[10px] border-base-content/10">⌘K</kbd>
            </button>
          </div>

          {/* Quick Access Menu */}
          <div className="px-3 py-3">
            <span className="text-[10px] font-semibold tracking-wider text-base-content/40 uppercase px-2">
              Views
            </span>
            <ul className="menu menu-xs p-0 mt-1 gap-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'all', value: null });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'all' ? 'active font-medium' : ''}
                >
                  <Layers className="w-4 h-4 text-primary" />
                  <span>All Stream</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'pinned', value: 'true' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'pinned' ? 'active font-medium' : ''}
                >
                  <Pin className="w-4 h-4 text-warning" />
                  <span>Pinned Memos</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'type', value: 'bookmark' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'type' && activeFilter.value === 'bookmark' ? 'active font-medium' : ''}
                >
                  <BookMarked className="w-4 h-4 text-secondary" />
                  <span>Bookmarks Only</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Reading List Segment */}
          <div className="px-3 py-1">
            <span className="text-[10px] font-semibold tracking-wider text-base-content/40 uppercase px-2">
              Reading List
            </span>
            <ul className="menu menu-xs p-0 mt-1 gap-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'reading_status', value: 'unread' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'reading_status' && activeFilter.value === 'unread' ? 'active' : ''}
                >
                  <Clock className="w-3.5 h-3.5 text-warning" />
                  <span>Unread</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'reading_status', value: 'reading' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'reading_status' && activeFilter.value === 'reading' ? 'active' : ''}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-info" />
                  <span>In-Progress</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'reading_status', value: 'archived' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'reading_status' && activeFilter.value === 'archived' ? 'active' : ''}
                >
                  <Archive className="w-3.5 h-3.5 text-base-content/50" />
                  <span>Archived</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Productivity Apps Segment */}
          <div className="px-3 py-1">
            <span className="text-[10px] font-semibold tracking-wider text-base-content/40 uppercase px-2">
              Apps
            </span>
            <ul className="menu menu-xs p-0 mt-1 gap-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'app', value: 'daily', label: 'Daily Journal & Habits' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'app' && activeFilter.value === 'daily' ? 'active font-medium' : ''}
                >
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Daily Journal</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'app', value: 'code', label: 'Code Snippet Vault' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'app' && activeFilter.value === 'code' ? 'active font-medium' : ''}
                >
                  <Code className="w-3.5 h-3.5 text-info" />
                  <span>Code Vault</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'app', value: 'expenses', label: 'Expense Tracker' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'app' && activeFilter.value === 'expenses' ? 'active font-medium' : ''}
                >
                  <Receipt className="w-3.5 h-3.5 text-success" />
                  <span>Expenses & Subs</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'app', value: 'flashcards', label: 'Flashcards (Anki-lite)' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'app' && activeFilter.value === 'flashcards' ? 'active font-medium' : ''}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-warning" />
                  <span>Flashcards</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter({ type: 'app', value: 'highlights', label: 'Highlights Inbox' });
                    onCloseMobile();
                  }}
                  className={activeFilter.type === 'app' && activeFilter.value === 'highlights' ? 'active font-medium' : ''}
                >
                  <Highlighter className="w-3.5 h-3.5 text-secondary" />
                  <span>Highlights Inbox</span>
                </button>
              </li>
            </ul>
          </div>

          {/* FOLDERS SECTION */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-semibold tracking-wider text-base-content/40 uppercase">
                Folders (Right-click to manage)
              </span>
              <button
                type="button"
                onClick={() => {
                  setParentFolderForNew(null);
                  setShowNewFolderInput(true);
                }}
                className="btn btn-ghost btn-xs btn-square h-5 w-5 text-base-content/50 hover:text-primary"
                title="New root folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* In-place New Folder Form */}
            {showNewFolderInput && (
              <form onSubmit={handleCreateFolderSubmit} className="p-2 bg-base-200/90 rounded-lg mb-2 flex gap-1 border border-base-content/10 shadow-xs">
                <input
                  type="text"
                  autoFocus
                  placeholder={parentFolderForNew ? "Subfolder name..." : "Folder name..."}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="input input-xs input-bordered w-full text-xs"
                />
                <button type="submit" className="btn btn-xs btn-primary shrink-0">Add</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setParentFolderForNew(null);
                  }}
                  className="btn btn-xs btn-ghost shrink-0"
                >
                  ✕
                </button>
              </form>
            )}

            {/* Distinct Unorganized Row (Clearly Separated) */}
            <div className="mb-1">
              <button
                type="button"
                onClick={() => {
                  setActiveFilter({ type: 'folder', value: 'unorganized', label: 'Unorganized' });
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-colors ${
                  activeFilter.type === 'folder' && activeFilter.value === 'unorganized'
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'hover:bg-base-200 text-base-content/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderMinus className="w-3.5 h-3.5 opacity-40" />
                  <span>Unorganized</span>
                </div>
                {unorganizedCount > 0 && (
                  <span className="text-[10px] text-base-content/50 font-mono">
                    {unorganizedCount}
                  </span>
                )}
              </button>
            </div>

            {/* Divider separating Unorganized from Custom Folders Tree */}
            <div className="divider my-1 border-base-content/10 opacity-30 text-[9px] uppercase font-mono tracking-widest text-base-content/40">
              Folder Tree
            </div>

            {/* Custom Hierarchical Folder Tree */}
            <ul className="menu menu-xs p-0 gap-0.5">
              {folderTree && folderTree.length > 0 ? (
                renderFolderItems(folderTree)
              ) : (
                <li className="text-[11px] text-base-content/40 px-2 py-1 italic">
                  No custom folders. Click + or right-click to create one.
                </li>
              )}
            </ul>
          </div>

          {/* TOGGLEABLE TAGS SECTION */}
          <div className="px-3 py-2 border-t border-base-content/5 mt-1">
            <div
              className="flex items-center justify-between px-2 py-1 cursor-pointer select-none rounded hover:bg-base-200/50 transition-colors"
              onClick={() => setIsTagsOpen(!isTagsOpen)}
            >
              <div className="flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-primary/70" />
                <span className="text-[10px] font-semibold tracking-wider text-base-content/50 uppercase">
                  Tags
                </span>
                {tags.length > 0 && (
                  <span className="badge badge-xs badge-ghost text-[9px] font-mono">
                    {tags.length}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square h-4 w-4 text-base-content/50"
                title={isTagsOpen ? 'Collapse tags' : 'Expand tags'}
              >
                {isTagsOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Expandable Tags Container */}
            {isTagsOpen && (
              <div className="mt-1">
                {tags && tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 p-1">
                    {tags.map((t) => {
                      const isSelected = activeFilter.type === 'tag' && activeFilter.value === t.name;
                      return (
                        <button
                          key={t.id || t.name}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setActiveFilter({ type: 'all', value: null });
                            } else {
                              setActiveFilter({ type: 'tag', value: t.name });
                            }
                            onCloseMobile();
                          }}
                          className={`badge badge-sm gap-0.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'badge-primary shadow-xs font-semibold'
                              : 'badge-ghost hover:border-primary text-base-content/75'
                          }`}
                        >
                          <Hash className="w-2.5 h-2.5 opacity-60" />
                          <span>{t.name}</span>
                          {t.count > 0 && (
                            <span className="ml-1 opacity-60 text-[9px] font-mono">{t.count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-base-content/40 px-2 py-1 italic">
                    No tags yet. Use #hashtags in notes.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Persistent Bottom Utility Bar - Always anchored in view */}
        <div className="p-3 border-t border-base-content/10 bg-base-100 shrink-0 safe-pb flex flex-col gap-1.5 z-10 shadow-xs">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={onOpenLogs}
              className="btn btn-xs btn-ghost gap-1.5 text-xs text-base-content/70 hover:text-base-content flex-1 justify-start"
              title="System Audit & Scraper Logs"
            >
              <Activity className="w-3.5 h-3.5 text-info" />
              <span>Logs</span>
            </button>

            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-xs btn-ghost gap-1.5 text-xs text-base-content/70 hover:text-base-content flex-1 justify-start"
              title="Documentation (Opens in new tab)"
            >
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span>Docs</span>
            </a>

            <button
              type="button"
              onClick={onOpenSettings}
              className="btn btn-xs btn-ghost gap-1.5 text-xs text-base-content/70 hover:text-base-content flex-1 justify-start"
              title="Settings Hub"
            >
              <Settings className="w-3.5 h-3.5 text-secondary" />
              <span>Settings</span>
            </button>

            {/* Theme Picker Dropdown */}
            <div className="dropdown dropdown-top dropdown-end">
              <label tabIndex={0} className="btn btn-xs btn-ghost btn-square" title="Select Theme">
                <Palette className="w-3.5 h-3.5" />
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-30 menu p-1 shadow-lg bg-base-200 border border-base-content/10 rounded-box w-32 text-xs mb-1"
              >
                {THEMES.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={theme === t.id ? 'active' : ''}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={logout}
              className="btn btn-xs btn-ghost btn-square text-error/60 hover:text-error"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Right-click Floating Context Menu for Folders */}
      {contextMenu.visible && contextMenu.folder && (
        <div
          className="fixed z-50 bg-base-200/95 backdrop-blur-md border border-base-content/15 shadow-2xl rounded-xl p-1.5 w-52 text-xs flex flex-col gap-0.5 animate-fadeIn"
          style={{
            top: `${Math.min(contextMenu.y, window.innerHeight - 250)}px`,
            left: `${Math.min(contextMenu.x, window.innerWidth - 220)}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-2.5 py-1.5 border-b border-base-content/10 flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: contextMenu.folder.color || '#6366f1' }}
            />
            <span className="font-semibold truncate text-xs">
              {contextMenu.folder.name}
            </span>
          </div>

          {/* New Subfolder */}
          <button
            type="button"
            onClick={() => {
              setParentFolderForNew(contextMenu.folder.id);
              setShowNewFolderInput(true);
              setContextMenu({ visible: false, x: 0, y: 0, folder: null });
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-base-300 text-left transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span>New Subfolder</span>
          </button>

          {/* Rename Folder */}
          <button
            type="button"
            onClick={() => {
              const target = contextMenu.folder;
              console.log('[Sidebar] Renaming clicked for folder:', target);
              if (target.parent_id) {
                setExpandedFolders(prev => ({ ...prev, [target.parent_id]: true }));
              }
              setRenamingFolder(target);
              setRenameInput(target.name);
              setContextMenu({ visible: false, x: 0, y: 0, folder: null });
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-base-300 text-left transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-info" />
            <span>Rename Folder</span>
          </button>

          {/* Color Picker Palette */}
          <div className="px-2.5 py-1.5">
            <span className="text-[10px] text-base-content/60 font-medium block mb-1 flex items-center gap-1">
              <Paintbrush className="w-3 h-3" />
              <span>Change Color</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {FOLDER_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onUpdateFolder(contextMenu.folder.id, { color: c });
                    setContextMenu({ visible: false, x: 0, y: 0, folder: null });
                  }}
                  className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${
                    contextMenu.folder.color === c ? 'ring-2 ring-primary ring-offset-1 ring-offset-base-200' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="divider my-0.5 opacity-20"></div>

          {/* Delete Folder */}
          <button
            type="button"
            onClick={() => {
              const target = contextMenu.folder;
              console.log('[Sidebar] Delete clicked for folder:', target);
              setContextMenu({ visible: false, x: 0, y: 0, folder: null });
              setFolderToDelete(target);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-error/15 text-error text-left transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Folder</span>
          </button>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-xs p-5 border border-base-content/10 shadow-2xl bg-base-100">
            <h3 className="font-bold text-sm text-error flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Folder
            </h3>
            <p className="py-3 text-xs text-base-content/80">
              Are you sure you want to delete <span className="font-semibold text-base-content">"{folderToDelete.name}"</span>? Notes inside will become unorganized.
            </p>
            <div className="modal-action mt-1 gap-2">
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setFolderToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-xs btn-error"
                onClick={async () => {
                  const targetId = folderToDelete.id;
                  setFolderToDelete(null);
                  console.log('[Sidebar] Confirmed delete for folder:', targetId);
                  await onDeleteFolder(targetId);
                }}
              >
                Delete
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => setFolderToDelete(null)} />
        </div>
      )}
    </>
  );
};
