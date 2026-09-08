import { Medication, ScheduleEntry } from '../types';

export function generateTodaysSchedule(medications: Medication[]): ScheduleEntry[] {
  const today = new Date().toDateString();
  const all: ScheduleEntry[] = [];
  medications.forEach(med => {
    med.schedule.forEach(s => {
      all.push({
        ...s,
        taken: !!(s.taken && s.takenAt && new Date(s.takenAt).toDateString() === today),
      });
    });
  });
  all.sort((a, b) => a.time.localeCompare(b.time));
  return all;
}

export function getNextDueSchedule(schedules: ScheduleEntry[]): ScheduleEntry | null {
  const now = new Date();
  const nowTime = now.getHours() * 60 + now.getMinutes();
  for (const s of schedules) {
    if (s.taken || s.status === 'skipped') continue;
    const [h, m] = s.time.split(':').map(Number);
    const scheduleTime = h * 60 + m;
    if (scheduleTime >= nowTime - 15) return s;
  }
  return schedules.find(s => !s.taken && s.status !== 'skipped') || null;
}

export function timeStringToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
