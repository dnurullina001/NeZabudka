import type { NoteStats } from '@workspace/api-client-react';

interface StatsBarProps {
  stats: NoteStats | undefined;
  isLoading: boolean;
}

export function StatsBar({ stats, isLoading }: StatsBarProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-6 text-sm" data-testid="stats-loading">
        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex items-center gap-6 text-sm font-medium" data-testid="stats-bar">
      <div className="flex items-center gap-2" data-testid="stat-active">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-muted-foreground">Активных:</span>
        <span className="text-foreground font-semibold">{stats.active}</span>
      </div>
      <div className="flex items-center gap-2" data-testid="stat-done">
        <div className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-muted-foreground">Выполнено:</span>
        <span className="text-foreground font-semibold">{stats.done}</span>
      </div>
      <div className="flex items-center gap-2" data-testid="stat-total">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
        <span className="text-muted-foreground">Всего:</span>
        <span className="text-foreground font-semibold">{stats.total}</span>
      </div>
    </div>
  );
}
