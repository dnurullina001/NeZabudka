import { useState } from 'react';
import { Trash2, Check, Pencil, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import type { Note, Project } from '@workspace/api-client-react';
import { useUpdateNote, getListNotesQueryKey } from '@workspace/api-client-react';
import { useCloneNote } from '@/lib/api-extras';
import { useQueryClient } from '@tanstack/react-query';
import { format, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface NoteItemProps {
  note: Note;
  project?: Project;
  projects: Project[];
  index: number;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
}

function parseDeadlineDate(deadline: string | null | undefined): Date | undefined {
  if (!deadline) return undefined;
  const d = new Date(deadline);
  return isNaN(d.getTime()) ? undefined : d;
}

function parseDeadlineTime(deadline: string | null | undefined): string {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buildDeadlineISO(date: Date | undefined, timeStr: string): string | null {
  if (!date) return null;
  const combined = new Date(date);
  if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    combined.setHours(h, m, 0, 0);
  } else {
    combined.setHours(0, 0, 0, 0);
  }
  return combined.toISOString();
}

function formatDeadlineCompact(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (hasTime) {
    return format(d, 'd MMM, HH:mm', { locale: ru });
  }
  return format(d, 'd MMM', { locale: ru });
}

export function NoteItem({ note, project, projects, index, onToggle, onDelete, isDeleting }: NoteItemProps) {
  const [isStriking, setIsStriking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Dialog state
  const [editContent, setEditContent] = useState('');
  const [editProjectId, setEditProjectId] = useState<string>('none');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low' | null>(null);
  const [editDayOfWeek, setEditDayOfWeek] = useState<number | null>(null);
  const [editDeadlineDate, setEditDeadlineDate] = useState<Date | undefined>(undefined);
  const [editDeadlineTime, setEditDeadlineTime] = useState('');

  const updateNote = useUpdateNote();
  const cloneNote = useCloneNote();
  const queryClient = useQueryClient();

  const handleToggle = () => {
    if (!note.done) {
      setIsStriking(true);
      setTimeout(() => onToggle(note.id), 300);
    } else {
      onToggle(note.id);
    }
  };

  const openDialog = () => {
    setEditContent(note.content);
    setEditProjectId(note.projectId?.toString() ?? 'none');
    setEditPriority(note.priority as 'high' | 'medium' | 'low' | null);
    setEditDayOfWeek(note.dayOfWeek ?? null);
    setEditDeadlineDate(parseDeadlineDate(note.deadline));
    setEditDeadlineTime(parseDeadlineTime(note.deadline));
    setDialogOpen(true);
  };

  const handleSave = () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;

    const deadline = buildDeadlineISO(editDeadlineDate, editDeadlineTime);

    updateNote.mutate(
      {
        id: note.id,
        data: {
          content: trimmed,
          projectId: editProjectId === 'none' ? null : parseInt(editProjectId, 10),
          priority: editPriority,
          dayOfWeek: editDayOfWeek,
          deadline,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          setDialogOpen(false);
        },
      }
    );
  };

  const handleClone = () => {
    cloneNote.mutate(
      { id: note.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          setDialogOpen(false);
        },
      }
    );
  };

  const handleClearDeadline = () => {
    setEditDeadlineDate(undefined);
    setEditDeadlineTime('');
  };

  const deadlineLabel = formatDeadlineCompact(note.deadline);
  const isOverdue = note.deadline && !note.done && isPast(new Date(note.deadline));

  return (
    <>
      <div
        className={`
          group relative flex items-start gap-3 px-3 py-2.5 rounded-lg bg-card border border-card-border
          transition-all duration-300 hover:shadow-sm
          ${isDeleting ? 'animate-fade-out' : 'animate-slide-in-up'}
          ${note.done ? 'opacity-55' : ''}
        `}
        style={{ animationDelay: `${index * 40}ms` }}
        data-testid={`note-item-${note.id}`}
      >
        {/* Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className={`
            flex-shrink-0 w-7 h-7 rounded-md border-2 transition-all duration-300 mt-0.5
            ${note.done
              ? 'bg-primary border-primary text-primary-foreground hover:bg-primary/90'
              : 'border-border hover:border-primary hover:bg-primary/5'}
          `}
          data-testid={`button-toggle-${note.id}`}
        >
          {note.done && <Check className="w-3.5 h-3.5" />}
        </Button>

        {/* Content */}
        <div className="flex-1 relative min-w-0 flex flex-col gap-1 pt-0.5">
          <p
            className={`text-sm leading-snug transition-all duration-300 whitespace-pre-wrap break-words cursor-pointer hover:text-primary ${note.done ? 'text-muted-foreground' : 'text-foreground'}`}
            onClick={openDialog}
            data-testid={`text-content-${note.id}`}
            title="Нажмите для редактирования"
          >
            {note.content}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {project && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="text-[11px] text-muted-foreground">{project.name}</span>
              </div>
            )}
            {note.priority && (
              <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full uppercase tracking-wide ${
                note.priority === 'high' ? 'bg-red-500/10 text-red-500'
                : note.priority === 'medium' ? 'bg-amber-500/10 text-amber-500'
                : 'bg-green-500/10 text-green-500'
              }`}>
                {note.priority === 'high' ? '▲' : note.priority === 'medium' ? '◆' : '▼'}
                {' '}{note.priority === 'high' ? 'Высокий' : note.priority === 'medium' ? 'Средний' : 'Низкий'}
              </span>
            )}
            {note.dayOfWeek !== null && note.dayOfWeek !== undefined && (
              <span className="text-[10px] font-semibold px-2 py-px rounded-full bg-primary/10 text-primary border border-primary/20">
                📅 {DAYS[note.dayOfWeek]}
              </span>
            )}
            {deadlineLabel && (
              <span className={`text-[10px] font-medium px-1.5 py-px rounded-full ${
                isOverdue ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground bg-muted/50'
              }`}>
                ⏰ {deadlineLabel}
              </span>
            )}
          </div>

          {/* Strikethrough */}
          {(note.done || isStriking) && (
            <div className="absolute left-0 top-3 h-[1.5px] bg-muted-foreground/35 animate-strike" style={{ transformOrigin: 'left center' }} />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" onClick={openDialog}
            className="w-7 h-7 hover:bg-primary/10 hover:text-primary mt-0.5"
            data-testid={`button-edit-${note.id}`} title="Редактировать">
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)}
            className="w-7 h-7 hover:bg-destructive/10 hover:text-destructive"
            data-testid={`button-delete-${note.id}`} title="Удалить">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать задачу</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Content */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Задача</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Текст задачи..."
                className="min-h-[80px] resize-none"
                autoFocus
              />
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Проект</label>
              <Select value={editProjectId} onValueChange={setEditProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите проект" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без проекта</SelectItem>
                  {projects.map((p) => (
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

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Приоритет</label>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditPriority(editPriority === p ? null : p)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      editPriority === p
                        ? p === 'high' ? 'bg-red-500/20 border-red-500 text-red-600'
                          : p === 'medium' ? 'bg-amber-500/20 border-amber-500 text-amber-600'
                          : 'bg-green-500/20 border-green-500 text-green-600'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {p === 'high' ? '▲ Высокий' : p === 'medium' ? '◆ Средний' : '▼ Низкий'}
                  </button>
                ))}
              </div>
            </div>

            {/* Day of week */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">День недели</label>
              <div className="flex gap-1 flex-wrap">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEditDayOfWeek(editDayOfWeek === i ? null : i)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      editDayOfWeek === i
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:border-primary hover:text-primary'
                    }`}
                  >
                    {d}
                  </button>
                ))}
                {editDayOfWeek !== null && (
                  <button
                    type="button"
                    onClick={() => setEditDayOfWeek(null)}
                    className="text-[11px] text-muted-foreground/60 hover:text-destructive px-1 transition-colors"
                    title="Убрать день"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Deadline date picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Дедлайн (дата)</label>
                {editDeadlineDate && (
                  <button
                    type="button"
                    onClick={handleClearDeadline}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Убрать дедлайн
                  </button>
                )}
              </div>
              <div className="flex justify-center border rounded-lg overflow-hidden bg-background p-2">
                <DayPicker
                  mode="single"
                  selected={editDeadlineDate}
                  onSelect={setEditDeadlineDate}
                  locale={ru}
                  captionLayout="dropdown"
                />
              </div>
            </div>

            {/* Deadline time */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Время дедлайна (необязательно)</label>
              <input
                type="time"
                value={editDeadlineTime}
                onChange={(e) => setEditDeadlineTime(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="ЧЧ:ММ"
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleClone}
              disabled={cloneNote.isPending}
              className="gap-1.5"
              title="Создать копию задачи"
            >
              <Copy className="w-3.5 h-3.5" />
              Клонировать
            </Button>
            <Button
              onClick={handleSave}
              disabled={!editContent.trim() || updateNote.isPending}
              className="ml-auto"
            >
              {updateNote.isPending ? 'Сохраняю…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
