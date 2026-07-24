import { Lightbulb } from 'lucide-react';

interface EmptyStateProps {
  type: 'all' | 'active' | 'done' | 'project';
}

export function EmptyState({ type }: EmptyStateProps) {
  const messages = {
    all: {
      title: 'Пока нет заметок',
      description: 'Добавьте первую заметку выше',
    },
    active: {
      title: 'Всё сделано!',
      description: 'Активных заметок нет',
    },
    done: {
      title: 'Ничего не выполнено',
      description: 'Отметьте заметку как выполненную',
    },
    project: {
      title: 'Проект пуст',
      description: 'Добавьте заметку в этот проект',
    },
  };

  const message = messages[type];

  return (
    <div 
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      data-testid={`empty-state-${type}`}
    >
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Lightbulb className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{message.title}</h3>
      <p className="text-sm text-muted-foreground">{message.description}</p>
    </div>
  );
}
