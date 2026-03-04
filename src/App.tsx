/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Download, 
  Trash2, 
  Moon, 
  Sun, 
  Maximize2, 
  Minimize2,
  X,
  Plus,
  FileText,
  Check,
  MoreHorizontal,
  PanelLeft,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PAGES_STORAGE_KEY = 'memoa-pages-v1';
const CURRENT_PAGE_ID_KEY = 'memoa-current-id-v1';
const THEME_KEY = 'memoa-theme';

interface Page {
  id: string;
  title?: string;
  content: string;
  updatedAt: number;
}

export default function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState<string>('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load initial state
  useEffect(() => {
    const savedPages = localStorage.getItem(PAGES_STORAGE_KEY);
    const savedCurrentId = localStorage.getItem(CURRENT_PAGE_ID_KEY);
    
    let initialPages: Page[] = [];
    if (savedPages) {
      try {
        initialPages = JSON.parse(savedPages);
      } catch (e) {
        console.error("Failed to parse saved pages", e);
      }
    }

    if (initialPages.length === 0) {
      const newPage: Page = {
        id: crypto.randomUUID(),
        content: '',
        updatedAt: Date.now()
      };
      initialPages = [newPage];
      setCurrentPageId(newPage.id);
    } else {
      setPages(initialPages);
      if (savedCurrentId && initialPages.find(p => p.id === savedCurrentId)) {
        setCurrentPageId(savedCurrentId);
      } else {
        setCurrentPageId(initialPages[0].id);
      }
    }
    setPages(initialPages);

    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark');
    }
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save state to local storage
  useEffect(() => {
    if (pages.length > 0) {
      localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(pages));
    }
    if (currentPageId) {
      localStorage.setItem(CURRENT_PAGE_ID_KEY, currentPageId);
    }
  }, [pages, currentPageId]);

  const currentPage = useMemo(() => 
    pages.find(p => p.id === currentPageId) || pages[0], 
    [pages, currentPageId]
  );

  const updateContent = (newContent: string) => {
    setPages(prev => prev.map(p => 
      p.id === currentPageId 
        ? { ...p, content: newContent, updatedAt: Date.now() } 
        : p
    ));
  };

  const startRenaming = (e: React.MouseEvent | React.FormEvent, page: Page) => {
    e.stopPropagation();
    setEditingPageId(page.id);
    setTempTitle(page.title || page.content.split('\n')[0].trim() || 'Untitled Page');
    setOpenMenuId(null);
  };

  const saveTitle = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingPageId) return;
    
    setPages(prev => prev.map(p => 
      p.id === editingPageId 
        ? { ...p, title: tempTitle.trim(), updatedAt: Date.now() } 
        : p
    ));
    setEditingPageId(null);
  };

  const deletePage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (pages.length <= 1) {
      updateContent('');
      return;
    }

    const newPages = pages.filter(p => p.id !== id);
    setPages(newPages);
    if (currentPageId === id) {
      setCurrentPageId(newPages[0].id);
    }
  };

  // Handle idle state for UI fading
  useEffect(() => {
    const handleActivity = () => {
      setIsIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (currentPage?.content.length > 0) setIsIdle(true);
      }, 3000);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    handleActivity();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [currentPage?.content]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem(THEME_KEY, newMode ? 'dark' : 'light');
    if (newMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  const addPage = () => {
    const newPage: Page = {
      id: crypto.randomUUID(),
      content: '',
      updatedAt: Date.now()
    };
    setPages(prev => [newPage, ...prev]);
    setCurrentPageId(newPage.id);
    setIsMenuOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const downloadTxt = (e?: React.MouseEvent, pageToDownload?: Page) => {
    e?.stopPropagation();
    const target = pageToDownload || currentPage;
    if (!target) return;
    const element = document.createElement('a');
    const file = new Blob([target.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    const title = target.title || target.content.split('\n')[0].slice(0, 20).trim() || 'writing';
    element.download = `${title}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setOpenMenuId(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const wordCount = currentPage?.content.trim() ? currentPage.content.trim().split(/\s+/).length : 0;
  const charCount = currentPage?.content.length || 0;

  const groupedPages = useMemo(() => {
    const groups: { [key: string]: Page[] } = {
      'Today': [],
      'Yesterday': [],
      'Earlier': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    pages.forEach(page => {
      const date = new Date(page.updatedAt).getTime();
      if (date >= today) groups['Today'].push(page);
      else if (date >= yesterday) groups['Yesterday'].push(page);
      else groups['Earlier'].push(page);
    });

    return groups;
  }, [pages]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
      {/* Top Navigation / Menu Trigger */}
      <motion.div 
        animate={{ opacity: isIdle ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 pointer-events-none"
      >
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors pointer-events-auto"
          title="Menu"
        >
          <PanelLeft size={22} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" />
        </button>

        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={() => downloadTxt()}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
            title="Download as .txt"
          >
            <Download size={20} className="text-zinc-400" />
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={20} className="text-zinc-400" /> : <Maximize2 size={20} className="text-zinc-400" />}
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={20} className="text-zinc-400" /> : <Moon size={20} className="text-zinc-400" />}
          </button>
        </div>
      </motion.div>

      {/* Main Writing Area */}
      <main className="flex-1 flex flex-col items-center pt-24 pb-24 px-6 md:px-12">
        <div className="w-full max-w-2xl flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            value={currentPage?.content || ''}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="Start writing..."
            className={`
              w-full flex-1 bg-transparent border-none outline-none resize-none
              text-lg md:text-xl leading-relaxed font-sans
              placeholder:text-zinc-300 dark:placeholder:text-zinc-700
              no-scrollbar
            `}
            autoFocus
          />
        </div>
      </main>

      {/* Bottom Stats */}
      <motion.div 
        animate={{ opacity: isIdle ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 p-8 flex justify-center items-center pointer-events-none"
      >
        <div className="flex gap-6 text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-400">
          <span>{wordCount} Words</span>
          <span>{charCount} Characters</span>
        </div>
      </motion.div>

      {/* Sidebar Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-zinc-900 shadow-2xl z-[70] p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <PanelLeft size={22} className="text-zinc-400" />
                  </button>
                  <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Memoa</span>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>

              <div className="mb-8">
                <button 
                  onClick={addPage}
                  className="w-full text-left py-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:opacity-70 transition-opacity"
                >
                  New page
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {(Object.entries(groupedPages) as [string, Page[]][]).map(([group, pagesInGroup]) => (
                  pagesInGroup.length > 0 && (
                    <div key={group} className="mb-6">
                      <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-3 px-2">
                        {group}
                      </h3>
                      <div className="flex flex-col gap-1">
                        {pagesInGroup.map(page => (
                          <div
                            key={page.id}
                            onClick={() => { 
                              if (editingPageId !== page.id) {
                                setCurrentPageId(page.id); 
                                setIsMenuOpen(false); 
                              }
                            }}
                            onDoubleClick={(e) => startRenaming(e, page)}
                            className={`
                              group relative w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all cursor-pointer
                              ${currentPageId === page.id 
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium' 
                                : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'}
                            `}
                          >
                            <div className="flex-1 truncate mr-2">
                              {editingPageId === page.id ? (
                                <form onSubmit={saveTitle} className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <input
                                    autoFocus
                                    value={tempTitle}
                                    onChange={e => setTempTitle(e.target.value)}
                                    onBlur={() => saveTitle()}
                                    className="bg-transparent border-none w-full outline-none text-sm font-medium p-0 text-zinc-900 dark:text-zinc-100"
                                  />
                                  <button type="submit" className="text-emerald-500">
                                    <Check size={14} />
                                  </button>
                                </form>
                              ) : (
                                <div className="truncate select-none">
                                  {page.title || page.content.split('\n')[0].trim() || 'Untitled Page'}
                                </div>
                              )}
                            </div>
                            
                            {editingPageId !== page.id && (
                              <div className="flex items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === page.id ? null : page.id);
                                  }}
                                  className={`p-1 rounded-lg transition-all ${openMenuId === page.id ? 'bg-zinc-200 dark:bg-zinc-700 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                >
                                  <MoreHorizontal size={16} className="text-zinc-400" />
                                </button>

                                {/* Context Menu */}
                                <AnimatePresence>
                                  {openMenuId === page.id && (
                                    <motion.div
                                      ref={menuRef}
                                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                      className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-xl rounded-xl z-[80] overflow-hidden p-1"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <button 
                                        onClick={(e) => startRenaming(e, page)}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg flex items-center gap-2"
                                      >
                                        <Pencil size={14} className="opacity-50" />
                                        Rename
                                      </button>
                                      <button 
                                        onClick={(e) => downloadTxt(e, page)}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg flex items-center gap-2"
                                      >
                                        <Download size={14} className="opacity-50" />
                                        Download
                                      </button>
                                      <button 
                                        onClick={(e) => deletePage(e, page.id)}
                                        className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex items-center gap-2"
                                      >
                                        <Trash2 size={14} className="opacity-50" />
                                        Delete
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
