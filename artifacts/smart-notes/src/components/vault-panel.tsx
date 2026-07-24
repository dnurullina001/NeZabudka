import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, Trash2, Plus } from 'lucide-react';
import {
  useListVaultEntries,
  useCreateVaultEntry,
  useDeleteVaultEntry,
  getListVaultEntriesQueryKey
} from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function VaultPanel() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entries = [], isLoading } = useListVaultEntries();
  const createEntry = useCreateVaultEntry();
  const deleteEntry = useDeleteVaultEntry();

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) return;

    createEntry.mutate(
      { data: { title: title.trim(), content: content.trim() } },
      {
        onSuccess: () => {
          setTitle('');
          setContent('');
          queryClient.invalidateQueries({ queryKey: getListVaultEntriesQueryKey() });
        },
        onError: () => {
          toast({
            title: 'Failed to create vault entry',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteEntry.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVaultEntriesQueryKey() });
          setDeletingId(null);
        },
        onError: () => {
          toast({
            title: 'Failed to delete vault entry',
            variant: 'destructive',
          });
          setDeletingId(null);
        },
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="mb-8">
        <div className="flex items-center gap-3 text-primary mb-2">
          <Lock className="w-8 h-8" />
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Сейф — важные заметки
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">Ваши защищенные записи</p>
      </header>

      <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-4">
        <Input
          placeholder="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={createEntry.isPending}
          className="border-card-border bg-background"
        />
        <Textarea
          placeholder="Содержимое..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={createEntry.isPending}
          className="min-h-[100px] border-card-border bg-background resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !content.trim() || createEntry.isPending}
            className="font-bold rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить в сейф
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="h-32 bg-card border border-card-border rounded-xl animate-pulse" />
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card/50 border border-dashed border-border rounded-xl">
            <Lock className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Сейф пуст. Добавьте важную запись выше.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`p-5 rounded-xl bg-card border border-card-border shadow-sm transition-all relative group ${
                deletingId === entry.id ? 'opacity-50 scale-[0.98]' : ''
              }`}
            >
              <h4 className="font-bold text-lg mb-2 text-foreground pr-8">{entry.title}</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{entry.content}</p>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
