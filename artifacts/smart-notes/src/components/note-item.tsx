import { useState, useRef, useEffect } from 'react';
import { Trash2, Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Note, Project } from '@workspace/api-client-react';
import { useUpdateNote, getListNotesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface NoteItemProps {
  note: Note;
  project?: Project;
  index: number;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
}

export function NoteItem({ note, project, index, onToggle, onDelete, isDeleting }: NoteItemProps) {
  const [isStriking, setIsStriking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [showDays, setShowDays] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateNote = useUpdateNote();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleToggle = () => {
    if (!note.done) {
      setIsStriking(true);
      setTimeout(() => onToggle(note.id), 300);
    } else {
      onToggle(note.id);
    }
  };

  const startEdit = () => {
    setEditContent(note.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const saveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === note.content) { cancelEdit(); return; }
    updateNote.mutate(
      { id: note.id, data: { content: trimmed } },
      {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }); setIsEditing(false); },
        onError: () => setIsEditing(false),
      }
    );
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
    if (e.key === 'Escape') cancelEdit();
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const setDay = (day: number) => {
    const next = note.dayOfWeek === day ? null : day;
    updateNote.mutate(
      { id: note.id, data: { dayOfWeek: next } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }) }
    );
  };

  return (
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
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={handleTextareaInput}
              onKeyDown={handleEditKeyDown}
              rows={1}
              className="w-full resize-none rounded-lg border border-primary/40 bg-background px-3 py-2 text-sm leading-snug text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 overflow-hidden"
              style={{ minHeight: '2rem' }}
              placeholder="Текст заметки..."
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveEdit} disabled={!editContent.trim() || updateNote.isPending}
                className="h-6 px-3 text-xs bg-primary hover:bg-primary/90">
                {updateNote.isPending ? 'Сохраняю…' : 'Сохранить'}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-6 px-2 text-xs text-muted-foreground">
                <X className="w-3 h-3 mr-1" />Отмена
              </Button>
            </div>
          </div>
        ) : (
          <p
            className={`text-sm leading-snug transition-all duration-300 whitespace-pre-wrap break-words ${note.done ? 'text-muted-foreground' : 'text-foreground'}`}
            data-testid={`text-content-${note.id}`}
          >
            {note.content}
          </p>
        )}

        {/* Meta row: tags + day chips */}
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

          {/* Day badge — shown if assigned */}
          {note.dayOfWeek !== null && note.dayOfWeek !== undefined && (
            <button
              onClick={() => setShowDays(v => !v)}
              className="text-[10px] font-semibold px-2 py-px rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              title="Изменить день"
            >
              📅 {DAYS[note.dayOfWeek]}
            </button>
          )}

          {/* Toggle day picker */}
          {note.dayOfWeek === null || note.dayOfWeek === undefined ? (
            <button
              onClick={() => setShowDays(v => !v)}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100 px-1"
              title="Назначить день"
            >
              📅
            </button>
          ) : null}
        </div>

        {/* Inline day picker — shows when toggled */}
        {showDays && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {DAYS.map((d, i) => (
              <button
                key={i}
                onClick={() => { setDay(i); setShowDays(false); }}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                  note.dayOfWeek === i
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary hover:text-primary'
                }`}
              >
                {d}
              </button>
            ))}
            {note.dayOfWeek !== null && note.dayOfWeek !== undefined && (
              <button
                onClick={() => { setDay(note.dayOfWeek as number); setShowDays(false); }}
                className="text-[11px] text-muted-foreground/60 hover:text-destructive px-1 transition-colors"
                title="Убрать день"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Strikethrough */}
        {(note.done || isStriking) && (
          <div className="absolute left-0 top-3 h-[1.5px] bg-muted-foreground/35 animate-strike" style={{ transformOrigin: 'left center' }} />
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" onClick={startEdit}
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
      )}
    </div>
  );
}
