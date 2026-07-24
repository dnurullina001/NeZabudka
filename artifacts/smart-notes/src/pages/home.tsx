import { useState, useRef, useEffect } from 'react';
import mascotIdle  from '@/assets/nezabudka-mascot.png';
import mascotKiss  from '@/assets/mascot-kiss.png';
import mascotDraw  from '@/assets/mascot-draw.png';
import mascotLaugh from '@/assets/mascot-laugh.png';
import mascotWink  from '@/assets/mascot-wink.png';
import mascotWave  from '@/assets/mascot-wave.png';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Layout, Search, X } from 'lucide-react';
import {
  useListNotes,
  useCreateNote,
  useDeleteNote,
  useToggleNote,
  useGetNoteStats,
  useListProjects,
  getListNotesQueryKey,
  getGetNoteStatsQueryKey,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { NoteItem } from '@/components/note-item';
import { StatsBar } from '@/components/stats-bar';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import { ProjectSidebar, FilterType } from '@/components/project-sidebar';
import { VaultPanel } from '@/components/vault-panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Pose lists
const ALL_POSES = [mascotIdle, mascotWink, mascotKiss, mascotDraw, mascotLaugh, mascotWave];
const IDLE_POSES  = [mascotIdle, mascotWink, mascotWave];
const ACTION_POSES = [mascotKiss, mascotDraw, mascotLaugh, mascotWink];

const POSE_LABELS: Record<string, string> = {
  [mascotKiss]:  '😘',
  [mascotDraw]:  '✏️',
  [mascotLaugh]: '😄',
  [mascotWink]:  '😉',
  [mascotWave]:  '👋',
};

const NezabudkaMascot = () => {
  const [poseIdx, setPoseIdx] = useState(0);
  const [poses, setPoses]     = useState(IDLE_POSES);
  const [label, setLabel]     = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycle = (list: string[], interval: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPoses(list);
    setPoseIdx(0);
    timerRef.current = setInterval(() => {
      setPoseIdx(i => {
        const next = (i + 1) % list.length;
        const lbl = POSE_LABELS[list[next]] ?? '';
        if (lbl) { setLabel(lbl); setTimeout(() => setLabel(''), 900); }
        return next;
      });
    }, interval);
  };

  // On mount: just sit still on idle pose, no cycling
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleMouseEnter = () => startCycle(ACTION_POSES, 1200);
  const handleMouseLeave = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setPoses(IDLE_POSES);
    setPoseIdx(0);
    setLabel('');
  };

  const currentPose = poses[poseIdx] ?? mascotIdle;

  return (
    <div
      className="nezabudka-mascot mb-4 flex justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {label && <span className="mascot-label">{label}</span>}
      <div className="mascot-img-wrap">
        {ALL_POSES.map(src => (
          <img key={src} src={src} alt="НеЗабудка" draggable={false}
            style={{ opacity: src === currentPose ? 1 : 0 }} />
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('none');
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low' | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes = [], isLoading: notesLoading } = useListNotes();
  const { data: projects = [], isLoading: projectsLoading } = useListProjects();
  const { data: stats, isLoading: statsLoading } = useGetNoteStats();
  
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const toggleNote = useToggleNote();

  // Open search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchQuery('');
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen]);

  const filteredNotes = notes.filter((note) => {
    if (filter === 'all') {
      // pass
    } else if (filter === 'none') {
      if (note.projectId !== null) return false;
    } else if (filter === 'vault') {
      return false;
    } else {
      if (note.projectId !== filter) return false;
    }
    if (searchQuery.trim()) {
      return note.content.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const activeNotes = filteredNotes
    .filter((note) => !note.done)
    .sort((a, b) => {
      const pValue = { high: 3, medium: 2, low: 1 };
      const aVal = a.priority ? pValue[a.priority as keyof typeof pValue] : 0;
      const bVal = b.priority ? pValue[b.priority as keyof typeof pValue] : 0;
      return bVal - aVal;
    });
  
  const doneNotes = filteredNotes.filter((note) => note.done);

  const handleCreateNote = () => {
    const content = newNoteContent.trim();
    if (!content) return;
    const projectId = selectedProjectId === 'none' ? null : parseInt(selectedProjectId, 10);
    createNote.mutate(
      { data: { content, projectId, priority: selectedPriority } },
      {
        onSuccess: () => {
          setNewNoteContent('');
          setSelectedPriority(null);
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetNoteStatsQueryKey() });
          inputRef.current?.focus();
        },
        onError: () => {
          toast({ title: 'Ошибка', description: 'Не удалось создать заметку', variant: 'destructive' });
        },
      }
    );
  };

  const handleToggleNote = (id: number) => {
    toggleNote.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNoteStatsQueryKey() });
      },
    });
  };

  const handleDeleteNote = (id: number) => {
    setDeletingId(id);
    setTimeout(() => {
      deleteNote.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetNoteStatsQueryKey() });
          setDeletingId(null);
        },
        onError: () => {
          toast({ title: 'Ошибка', description: 'Не удалось удалить заметку', variant: 'destructive' });
          setDeletingId(null);
        },
      });
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateNote(); }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewNoteContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const getProjectName = () => {
    if (filter === 'all') return 'Все заметки';
    if (filter === 'none') return 'Без проекта';
    if (filter === 'vault') return 'Сейф';
    const p = projects.find(p => p.id === filter);
    return p ? p.name : 'Проект';
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <h1 className="text-xl font-display font-bold text-foreground">НеЗабудка</h1>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Layout className="w-5 h-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'flex' : 'hidden'} 
        md:flex flex-col w-full md:w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border p-6 
        overflow-y-auto z-10
      `}>
        <div className="hidden md:block mb-8">
          <NezabudkaMascot />
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">НеЗабудка</h1>
          <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">умные заметки</p>
        </div>
        <ProjectSidebar 
          projects={projects} 
          selectedFilter={filter} 
          onSelectFilter={(f) => { setFilter(f); setSidebarOpen(false); }} 
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 md:py-10 overflow-y-auto">
        {filter === 'vault' ? (
          <VaultPanel />
        ) : (
          <>
            <header className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {getProjectName()}
                </h2>
                {/* Search toggle */}
                <div className="flex items-center gap-2">
                  {searchOpen ? (
                    <div className="flex items-center gap-1 bg-card border border-card-border rounded-lg px-2 py-1 shadow-sm">
                      <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Поиск по заметкам…"
                        className="w-44 sm:w-56 bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground"
                        autoFocus
                      />
                      <button
                        onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Поиск (Ctrl+F)"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <StatsBar stats={stats} isLoading={statsLoading} />
            </header>

            {/* Add note input */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex gap-2 relative bg-card rounded-xl border border-card-border p-1 shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all">
                  <textarea
                    ref={inputRef}
                    placeholder="Что нужно сделать?"
                    value={newNoteContent}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="flex-1 border-0 shadow-none resize-none overflow-hidden focus:outline-none focus:ring-0 px-3 py-2.5 bg-transparent text-sm leading-snug placeholder:text-muted-foreground"
                    style={{ minHeight: '2.25rem', maxHeight: '10rem' }}
                    disabled={createNote.isPending}
                    data-testid="input-new-note"
                  />
                  <div className="flex items-center border-l border-card-border pl-2 mr-1 space-x-1">
                    {(['high', 'medium', 'low'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPriority(selectedPriority === p ? null : p)}
                        className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center transition-colors
                          ${selectedPriority === p
                            ? p === 'high' ? 'bg-red-500/20 ring-2 ring-red-500/50'
                              : p === 'medium' ? 'bg-amber-500/20 ring-2 ring-amber-500/50'
                              : 'bg-green-500/20 ring-2 ring-green-500/50'
                            : 'hover:bg-muted opacity-50 hover:opacity-100'}`}
                        title={p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}
                      >
                        {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'}
                      </button>
                    ))}
                  </div>
                  <div className="w-28 sm:w-36 flex-shrink-0">
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={projectsLoading}>
                      <SelectTrigger className="h-9 border-0 bg-secondary/50 focus:ring-0 text-sm font-medium">
                        <SelectValue placeholder="Проект" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без проекта</SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                              {p.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleCreateNote}
                  disabled={!newNoteContent.trim() || createNote.isPending}
                  className="h-11 px-5 sm:px-7 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-sm hover:shadow-md transition-all sm:flex-shrink-0"
                  data-testid="button-add-note"
                >
                  <Plus className="w-4 h-4 mr-1.5 -ml-0.5" />
                  Добавить
                </Button>
              </div>
            </div>

            {/* Search results label */}
            {searchQuery.trim() && (
              <p className="text-xs text-muted-foreground mb-3">
                Найдено: {filteredNotes.length} заметок по запросу «{searchQuery}»
              </p>
            )}

            {/* Notes lists */}
            {notesLoading || projectsLoading ? (
              <div className="space-y-2" data-testid="notes-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-card border border-card-border rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {activeNotes.length > 0 && (
                  <section>
                    <div className="space-y-2">
                      {activeNotes.map((note, index) => (
                        <NoteItem
                          key={note.id}
                          note={note}
                          project={projects.find(p => p.id === note.projectId)}
                          index={index}
                          onToggle={handleToggleNote}
                          onDelete={handleDeleteNote}
                          isDeleting={deletingId === note.id}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {doneNotes.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 pl-1" data-testid="heading-done">
                      Выполнено
                    </h3>
                    <div className="space-y-2">
                      {doneNotes.map((note, index) => (
                        <NoteItem
                          key={note.id}
                          note={note}
                          project={projects.find(p => p.id === note.projectId)}
                          index={index}
                          onToggle={handleToggleNote}
                          onDelete={handleDeleteNote}
                          isDeleting={deletingId === note.id}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {filteredNotes.length === 0 && <EmptyState type={filter === 'all' ? 'all' : 'project'} />}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
