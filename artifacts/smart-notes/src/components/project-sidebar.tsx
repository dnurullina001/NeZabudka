import { useState } from 'react';
import { Trash2, Inbox, ListTree, Lock, Pencil, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectDialog } from './project-dialog';
import type { Project } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteProject, useUpdateProject, getListProjectsQueryKey, getListNotesQueryKey } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export type FilterType = 'all' | 'none' | 'vault' | number;

interface ProjectSidebarProps {
  projects: Project[];
  selectedFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#78716c', // stone
];

export function ProjectSidebar({ projects, selectedFilter, onSelectFilter }: ProjectSidebarProps) {
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Edit project dialog state
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Help dialog state
  const [helpOpen, setHelpOpen] = useState(false);

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProject.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          if (selectedFilter === id) {
            onSelectFilter('all');
          }
        },
        onError: () => {
          toast({
            title: 'Не удалось удалить проект',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const openEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditProject(project);
    setEditName(project.name);
    setEditColor(project.color);
  };

  const handleSaveProject = () => {
    if (!editProject || !editName.trim()) return;

    updateProject.mutate(
      { id: editProject.id, data: { name: editName.trim(), color: editColor } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setEditProject(null);
        },
        onError: () => {
          toast({
            title: 'Не удалось обновить проект',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="w-full h-full flex flex-col gap-6" data-testid="project-sidebar">
      <div className="space-y-1">
        <h3 className="px-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Разделы</h3>
        <button
          onClick={() => onSelectFilter('all')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            selectedFilter === 'all' 
              ? "bg-secondary text-foreground" 
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
          data-testid="filter-all"
        >
          <ListTree className="w-4 h-4" />
          Все заметки
        </button>
        <button
          onClick={() => onSelectFilter('none')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            selectedFilter === 'none' 
              ? "bg-secondary text-foreground" 
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
          data-testid="filter-none"
        >
          <Inbox className="w-4 h-4" />
          Без проекта
        </button>
        <button
          onClick={() => onSelectFilter('vault')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            selectedFilter === 'vault' 
              ? "bg-secondary text-foreground" 
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
          data-testid="filter-vault"
        >
          <Lock className="w-4 h-4" />
          Сейф
        </button>
      </div>

      <div className="space-y-1 flex-1">
        <h3 className="px-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Проекты</h3>
        <div className="space-y-1">
          {projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors",
                selectedFilter === project.id
                  ? "bg-secondary"
                  : "hover:bg-secondary/50"
              )}
              onClick={() => onSelectFilter(project.id)}
              data-testid={`filter-project-${project.id}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                  style={{ backgroundColor: project.color }} 
                />
                <span className={cn(
                  "text-sm font-medium truncate transition-colors",
                  selectedFilter === project.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {project.name}
                </span>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={(e) => openEditProject(project, e)}
                  disabled={updateProject.isPending}
                  title="Редактировать проект"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDelete(project.id, e)}
                  disabled={deleteProject.isPending}
                  title="Удалить проект"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border mt-auto space-y-2">
        <ProjectDialog />
        <button
          onClick={() => setHelpOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
          title="Помощь"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          Помощь
        </button>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать проект</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Название</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Название проекта"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Цвет</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      editColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <label className="text-xs text-muted-foreground">Или введите HEX:</label>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-border"
                />
                <span className="text-xs text-muted-foreground font-mono">{editColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProject(null)}>
              Отмена
            </Button>
            <Button
              onClick={handleSaveProject}
              disabled={!editName.trim() || updateProject.isPending}
            >
              {updateProject.isPending ? 'Сохраняю…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Как пользоваться НеЗабудкой
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>📝 <strong className="text-foreground">Задачи</strong> — добавляйте задачи в поле сверху. Нажмите на текст или карандаш для редактирования.</p>
            <p>📁 <strong className="text-foreground">Проекты</strong> — создавайте проекты и группируйте задачи. Карандаш рядом с проектом позволяет изменить его название и цвет.</p>
            <p>🔒 <strong className="text-foreground">Сейф</strong> — храните важные заметки в защищённом разделе.</p>
            <p>📅 <strong className="text-foreground">Дедлайны</strong> — выберите дату и время при редактировании задачи. Просроченные выделяются красным.</p>
            <p>🔁 <strong className="text-foreground">Клонирование</strong> — в диалоге редактирования задачи нажмите «Клонировать» для создания копии.</p>
            <p>💾 <strong className="text-foreground">Экспорт</strong> — сохраните список задач в Excel, TXT или Word через кнопку «Экспорт».</p>
          </div>
          <DialogFooter>
            <a
              href="mailto:changeteam@tedo.ru?subject=НеЗабудка"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              ✉️ Написать нам
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
