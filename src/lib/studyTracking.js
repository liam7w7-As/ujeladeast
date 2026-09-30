export const STUDY_TIME_ZONE = 'America/La_Paz';

export function studyDay(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00Z`).getTime() / 86400000;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = type => Number(parts.find(part => part.type === type).value);
  return Date.UTC(get('year'), get('month') - 1, get('day')) / 86400000;
}

export function daysSince(value, now = new Date()) {
  const day = studyDay(value);
  return day === null ? null : studyDay(now) - day;
}

export function effectiveStreak(streak, now = new Date()) {
  const days = daysSince(streak?.last_study_date, now);
  return days !== null && days >= 0 && days <= 1 ? Number(streak?.current_streak) || 0 : 0;
}

export function progressPercentage(completed, total) {
  if (total <= 0 || completed <= 0) return 0;
  return completed >= total ? 100 : Math.max(1, Math.min(99, Math.round(completed / total * 100)));
}

export function trackingRows(profiles, lessons, now = new Date()) {
  const ordered = [...lessons].sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number);
  const lessonIds = new Set(ordered.map(lesson => lesson.id));
  return profiles.map(profile => {
    const completed = new Map((profile.progress || [])
      .filter(item => lessonIds.has(item.lesson_id))
      .map(item => [item.lesson_id, item.completed_at]));
    const latest = [...completed].filter(([, date]) => date)
      .sort((a, b) => new Date(b[1]) - new Date(a[1]))[0];
    const lastCompleted = ordered.find(lesson => lesson.id === latest?.[0]);
    const lastDate = latest?.[1] || null;
    const days = daysSince(lastDate, now);
    const status = completed.size === 0 ? 'not-started'
      : ordered.length > 0 && completed.size === ordered.length ? 'completed'
      : days !== null && days >= 0 && days < 7 ? 'active' : 'inactive';
    return { ...profile, completed, lastCompleted, lastDate, days, status,
      nextLesson: ordered.find(lesson => !completed.has(lesson.id)),
      percentage: progressPercentage(completed.size, ordered.length),
      streak: effectiveStreak(profile, now),
    };
  });
}

// Continue until an empty page, including when the server caps pages below our limit.
export async function collectPages(fetchPage, pageSize = 200) {
  const rows = [];
  for (;;) {
    const { data, error } = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
  }
}
