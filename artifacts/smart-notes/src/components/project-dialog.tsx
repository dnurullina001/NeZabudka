import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateProject, getListProjectsQueryKey } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROJECT_COLORS = [
  '#f43f5e', // rose
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#8b5cf6', // violet
];

export function ProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    createProject.mutate(
      { data: { name: trimmed, color } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setOpen(false);
          setName('');
          setColor(PROJECT_COLORS[0]);
        },
        onError: () => {
          toast({
            title: 'Failed to create project',
            description: 'Please try again',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Новый проект
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать проект</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Название</label>
            <Input
              placeholder="Например: Работа, Личное"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              data-testid="input-project-name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Цвет</label>
            <div className="flex flex-wrap gap-3">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    color === c ? "border-foreground scale-110 shadow-sm" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  data-testid={`color-picker-${c}`}
                />
              ))}
            </div>
          </div>
          <Button 
            className="w-full bg-primary hover:bg-primary/90" 
            onClick={handleCreate}
            disabled={!name.trim() || createProject.isPending}
            data-testid="button-create-project"
          >
            Создать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
