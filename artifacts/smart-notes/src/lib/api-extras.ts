/**
 * Extra API hooks for endpoints not in the generated client.
 * Uses useMutation from @tanstack/react-query with the generated customFetch pattern.
 */
import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { Note, VaultEntry, VaultEntryUpdate } from '@workspace/api-client-react';

// ── Clone Note ──────────────────────────────────────────────────────────────

async function cloneNoteFetch(id: number): Promise<Note> {
  const res = await fetch(`/api/notes/${id}/clone`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clone note');
  return res.json();
}

export function useCloneNote(
  options?: UseMutationOptions<Note, Error, { id: number }>
): UseMutationResult<Note, Error, { id: number }> {
  return useMutation({
    mutationKey: ['cloneNote'],
    mutationFn: ({ id }) => cloneNoteFetch(id),
    ...options,
  });
}

// ── Update Vault Entry ───────────────────────────────────────────────────────

async function updateVaultEntryFetch(id: number, data: VaultEntryUpdate): Promise<VaultEntry> {
  const res = await fetch(`/api/vault/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update vault entry');
  return res.json();
}

export function useUpdateVaultEntry(
  options?: UseMutationOptions<VaultEntry, Error, { id: number; data: VaultEntryUpdate }>
): UseMutationResult<VaultEntry, Error, { id: number; data: VaultEntryUpdate }> {
  return useMutation({
    mutationKey: ['updateVaultEntry'],
    mutationFn: ({ id, data }) => updateVaultEntryFetch(id, data),
    ...options,
  });
}
