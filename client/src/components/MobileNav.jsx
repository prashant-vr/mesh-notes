import React from 'react';
import { Layers, BookMarked, Search, Menu, Settings } from 'lucide-react';

export const MobileNav = ({
  activeFilter,
  setActiveFilter,
  onOpenSearch,
  onOpenSettings,
  onToggleSidebar
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-base-100/95 backdrop-blur-md border-t border-base-content/10 px-2 py-1 flex items-center justify-around safe-pb shadow-lg">
      <button
        type="button"
        onClick={() => setActiveFilter({ type: 'all', value: null })}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium transition-colors ${
          activeFilter.type === 'all' ? 'text-primary' : 'text-base-content/60'
        }`}
      >
        <Layers className="w-5 h-5" />
        <span>Stream</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveFilter({ type: 'type', value: 'bookmark' })}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium transition-colors ${
          activeFilter.type === 'type' && activeFilter.value === 'bookmark' ? 'text-primary' : 'text-base-content/60'
        }`}
      >
        <BookMarked className="w-5 h-5" />
        <span>Links</span>
      </button>

      <button
        type="button"
        onClick={onOpenSearch}
        className="flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium text-base-content/60 hover:text-primary"
      >
        <Search className="w-5 h-5" />
        <span>Search</span>
      </button>

      <button
        type="button"
        onClick={onToggleSidebar}
        className="flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium text-base-content/60 hover:text-primary"
      >
        <Menu className="w-5 h-5" />
        <span>Folders</span>
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        className="flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium text-base-content/60 hover:text-primary"
      >
        <Settings className="w-5 h-5" />
        <span>Settings</span>
      </button>
    </nav>
  );
};
