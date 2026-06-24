import { Task } from '../services/tasks';

export type TaskSectionKey = 'today' | 'thisWeek' | 'later';

export interface TaskSection {
  key: TaskSectionKey;
  title: string;
  count: number;
  data: Task[];
}

// Returns true when due_date is strictly before today (not including today).
export function isTaskOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function formatDueLabel(dueDate: string | null): string {
  if (!dueDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Today'; // overdue — still show Today as date context
  if (diffDays === 0) return 'Today';
  if (diffDays <= 6) {
    return due.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon", "Tue", …
  }
  return due.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }); // "12 Aug"
}

export function groupTasksIntoSections(tasks: Task[]): TaskSection[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfThisWeek = new Date(today);
  endOfThisWeek.setDate(today.getDate() + 6);

  const todayItems: Task[] = [];
  const thisWeekItems: Task[] = [];
  const laterItems: Task[] = [];

  for (const task of tasks) {
    if (!task.due_date) {
      laterItems.push(task);
      continue;
    }
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);

    if (due <= today) {
      todayItems.push(task);
    } else if (due <= endOfThisWeek) {
      thisWeekItems.push(task);
    } else {
      laterItems.push(task);
    }
  }

  const sections: TaskSection[] = [];

  if (todayItems.length > 0) {
    sections.push({ key: 'today', title: 'Today', count: todayItems.length, data: todayItems });
  }
  if (thisWeekItems.length > 0) {
    sections.push({ key: 'thisWeek', title: 'This week', count: thisWeekItems.length, data: thisWeekItems });
  }
  if (laterItems.length > 0) {
    sections.push({ key: 'later', title: 'Later', count: laterItems.length, data: laterItems });
  }

  return sections;
}
