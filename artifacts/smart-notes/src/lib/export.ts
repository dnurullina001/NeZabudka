/**
 * Export utilities for notes.
 * Supports Excel (.xlsx via SheetJS), TXT, and Word (.docx).
 */
import type { Note, Project } from '@workspace/api-client-react';

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const DAY_LABEL = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function projectName(note: Note, projects: Project[]): string {
  if (!note.projectId) return '—';
  return projects.find((p) => p.id === note.projectId)?.name ?? '—';
}

function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return '—';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const month = d.toLocaleString('ru', { month: 'short' });
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${day} ${month}, ${time}`;
}

function buildRows(notes: Note[], projects: Project[]) {
  return notes.map((n) => ({
    Задача: n.content,
    Статус: n.done ? 'Выполнено' : 'Активно',
    Приоритет: n.priority ? PRIORITY_LABEL[n.priority] ?? n.priority : '—',
    Проект: projectName(n, projects),
    'День недели': n.dayOfWeek !== null && n.dayOfWeek !== undefined ? DAY_LABEL[n.dayOfWeek] ?? '—' : '—',
    Дедлайн: formatDeadline(n.deadline),
  }));
}

// ── TXT export ─────────────────────────────────────────────────────────────

export function exportTxt(notes: Note[], projects: Project[]): void {
  const lines: string[] = ['НеЗабудка — Список задач', ''];

  // Group by project
  const byProject: Record<string, Note[]> = {};
  const noProject: Note[] = [];

  for (const note of notes) {
    if (note.projectId) {
      const key = projectName(note, projects);
      (byProject[key] ??= []).push(note);
    } else {
      noProject.push(note);
    }
  }

  if (noProject.length > 0) {
    lines.push('Без проекта', '─'.repeat(30));
    for (const n of noProject) {
      const status = n.done ? '✓' : '○';
      const priority = n.priority ? ` [${PRIORITY_LABEL[n.priority]}]` : '';
      const deadline = n.deadline ? ` ⏰ ${formatDeadline(n.deadline)}` : '';
      lines.push(`${status} ${n.content}${priority}${deadline}`);
    }
    lines.push('');
  }

  for (const [projectKey, pNotes] of Object.entries(byProject)) {
    lines.push(projectKey, '─'.repeat(30));
    for (const n of pNotes) {
      const status = n.done ? '✓' : '○';
      const priority = n.priority ? ` [${PRIORITY_LABEL[n.priority]}]` : '';
      const deadline = n.deadline ? ` ⏰ ${formatDeadline(n.deadline)}` : '';
      lines.push(`${status} ${n.content}${priority}${deadline}`);
    }
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, 'nezabudka-tasks.txt');
}

// ── Excel (.xlsx) export ────────────────────────────────────────────────────

export async function exportXlsx(notes: Note[], projects: Project[]): Promise<void> {
  const { utils, writeFile } = await import('xlsx');
  const rows = buildRows(notes, projects);
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Задачи');
  writeFile(wb, 'nezabudka-tasks.xlsx');
}

// ── Word (.docx) export ─────────────────────────────────────────────────────

export async function exportDocx(notes: Note[], projects: Project[]): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

  const rows = buildRows(notes, projects);
  const children: Paragraph[] = [
    new Paragraph({
      text: 'НеЗабудка — Список задач',
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({ text: '' }),
  ];

  for (const row of rows) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${row['Статус'] === 'Выполнено' ? '✓' : '○'} `, bold: false }),
          new TextRun({ text: row['Задача'], bold: row['Статус'] === 'Активно' }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `   Приоритет: ${row['Приоритет']}  |  Проект: ${row['Проект']}  |  День: ${row['День недели']}  |  Дедлайн: ${row['Дедлайн']}`, color: '666666', size: 18 }),
        ],
      }),
      new Paragraph({ text: '' }),
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, 'nezabudka-tasks.docx');
}

// ── Helper ──────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
