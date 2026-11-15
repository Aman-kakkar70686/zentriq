const toDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const utc = (iso) => new Date(iso.endsWith('Z') ? iso : iso + 'Z');

export const fmtDate = (iso) => (iso ? toDate(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '');

export function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - utc(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function meetingTime(iso) {
  const d = utc(iso);
  const day = d.toDateString() === new Date().toDateString() ? 'Today' : d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  return `${day} · ${d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}`;
}

export const dueLabel = (days) =>
  days < 0 ? `${-days}d overdue` : days === 0 ? 'Due today' : days <= 3 ? `Due in ${days} day${days === 1 ? '' : 's'}` : 'Upcoming';

export const urgent = (days) => days <= 3;
