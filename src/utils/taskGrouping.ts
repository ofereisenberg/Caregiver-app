import { Task } from '../services/tasks';
import { parseDateOnly } from './dateUtils';

export type TaskSectionKey = 'today' | 'thisWeek' | 'later' | 'done';

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
  const due = parseDateOnly(dueDate);
  return due < today;
}

export function formatDueLabel(dueDate: string | null): string {
  if (!dueDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseDateOnly(dueDate);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Today'; // overdue — still show Today as date context
  if (diffDays === 0) return 'Today';
  if (diffDays <= 6) {
    return due.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon", "Tue", …
  }
  return due.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }); // "12 Aug"
}

// Sort order within a group:
//   1. No due_date before due_date (floats undated tasks to top of Later)
//   2. Earlier due_date before later due_date
//   3. Same date: no start_time before start_time (date-only tasks float to top)
//   4. Both have start_time: ascending by start_time string ("HH:MM:SS" lexicographic)
function sortByDateTime(a: Task, b: Task): number {
  if (!a.due_date && !b.due_date) return 0;
  if (!a.due_date) return -1;
  if (!b.due_date) return 1;
  const dateA = parseDateOnly(a.due_date).getTime();
  const dateB = parseDateOnly(b.due_date).getTime();
  if (dateA !== dateB) return dateA - dateB;
  if (!a.start_time && !b.start_time) return 0;
  if (!a.start_time) return -1;
  if (!b.start_time) return 1;
  return a.start_time.localeCompare(b.start_time);
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
    const due = parseDateOnly(task.due_date);

    if (due <= today) {
      todayItems.push(task);
    } else if (due <= endOfThisWeek) {
      thisWeekItems.push(task);
    } else {
      laterItems.push(task);
    }
  }

  todayItems.sort(sortByDateTime);
  thisWeekItems.sort(sortByDateTime);
  laterItems.sort(sortByDateTime);

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
