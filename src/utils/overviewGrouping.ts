import { Task } from '../services/tasks';
import { Appointment } from '../services/appointments';

export type OverviewItem =
  | { kind: 'task'; data: Task }
  | { kind: 'appointment'; data: Appointment };

export interface OverviewSection {
  key: 'today' | 'thisWeek' | 'later' | 'done';
  title: string;
  count: number;
  data: OverviewItem[];
}

// Effective sort timestamp for interleaving tasks and appointments.
// Tasks with no time set return the start-of-day ms (floats before timed items).
// Tasks with no due_date return Infinity (floats to top of Later via special case below).
function effectiveSortMs(item: OverviewItem): number {
  if (item.kind === 'appointment') {
    return new Date(item.data.starts_at).getTime();
  }
  const task = item.data;
  if (!task.due_date) return Infinity;
  const base = new Date(task.due_date + 'T00:00:00').getTime();
  if (!task.start_time) return base;
  const [h, m] = task.start_time.split(':').map(Number);
  return base + h * 3_600_000 + m * 60_000;
}

function sortItems(items: OverviewItem[]): OverviewItem[] {
  return [...items].sort((a, b) => {
    const aMs = effectiveSortMs(a);
    const bMs = effectiveSortMs(b);
    // Undated tasks (Infinity) float to the top of their bucket
    if (aMs === Infinity && bMs === Infinity) return 0;
    if (aMs === Infinity) return -1;
    if (bMs === Infinity) return 1;
    return aMs - bMs;
  });
}

export function groupOverviewIntoSections(
  tasks: Task[],
  appointments: Appointment[],
): OverviewSection[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfTodayMs = today.getTime();

  // End of the current Mon–Sun week (Sunday)
  const dayOfWeek = today.getDay(); // 0=Sun … 6=Sat
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endOfThisWeek = new Date(today);
  endOfThisWeek.setDate(today.getDate() + daysUntilSunday);

  const todayItems: OverviewItem[] = [];
  const thisWeekItems: OverviewItem[] = [];
  const laterItems: OverviewItem[] = [];

  for (const task of tasks) {
    if (!task.due_date) {
      laterItems.push({ kind: 'task', data: task });
      continue;
    }
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    if (due <= today) {
      todayItems.push({ kind: 'task', data: task });
    } else if (due <= endOfThisWeek) {
      thisWeekItems.push({ kind: 'task', data: task });
    } else {
      laterItems.push({ kind: 'task', data: task });
    }
  }

  for (const appt of appointments) {
    // Exclude appointments that have fully passed
    const endsAt = appt.ends_at ? new Date(appt.ends_at) : new Date(appt.starts_at);
    if (endsAt.getTime() < startOfTodayMs) continue;

    const startDate = new Date(appt.starts_at);
    startDate.setHours(0, 0, 0, 0);
    if (startDate <= today) {
      todayItems.push({ kind: 'appointment', data: appt });
    } else if (startDate <= endOfThisWeek) {
      thisWeekItems.push({ kind: 'appointment', data: appt });
    } else {
      laterItems.push({ kind: 'appointment', data: appt });
    }
  }

  const sections: OverviewSection[] = [];
  if (todayItems.length > 0) {
    sections.push({ key: 'today', title: 'Today', count: todayItems.length, data: sortItems(todayItems) });
  }
  if (thisWeekItems.length > 0) {
    sections.push({ key: 'thisWeek', title: 'This week', count: thisWeekItems.length, data: sortItems(thisWeekItems) });
  }
  if (laterItems.length > 0) {
    sections.push({ key: 'later', title: 'Later', count: laterItems.length, data: sortItems(laterItems) });
  }
  return sections;
}
