import { Trash2, Inbox, ListTree, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectDialog } from './project-dialog';
import type { Project } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteProject, getListProjectsQueryKey, getListNotesQueryKey } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

export type FilterType = 'all' | 'none' | 'vault' | number;

interface ProjectSidebarProps {
  projects: Project[];
  selectedFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
}

export function ProjectSidebar({ projects, selectedFilter, onSelectFilter }: ProjectSidebarProps) {
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
            title: 'Failed to delete project',
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
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1"
                onClick={(e) => handleDelete(project.id, e)}
                disabled={deleteProject.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border mt-auto">
        <ProjectDialog />
      </div>
    </div>
  );
}
