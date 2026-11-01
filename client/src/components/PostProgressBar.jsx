import CategoryAwardIcon from './CategoryAwardIcon';
import FireAwardIcon from './FireAwardIcon';

export default function PostProgressBar({ completed, target, category, streak }) {
  const percent = Math.min(100, Math.max(0, completed / target * 100));
  const attempts = streak?.attempts || [];
  const lastActive = attempts.at(-1)?.status === 'active';
  const activeIndex = lastActive ? attempts.length - 1 : attempts.length;
  const count = Math.max(Math.floor(target / 7), attempts.length + (completed < target && !lastActive && attempts.length ? 1 : 0));
  return <span className="post-progress-scroll">
    <span className="post-progress-path streak-progress-path" style={{ minWidth: `${Math.max(160, (count + 1) * 46)}px` }} role="progressbar" aria-label="Goal task days and seven-day streak awards" aria-valuemin={0} aria-valuemax={target} aria-valuenow={completed} aria-valuetext={`${completed} of ${target} task days. Current goal streak: ${streak?.streakDays || 0} days.`}>
      <span className="post-progress-rail"><span className="post-progress-fill" style={{ width: `${percent}%` }} /></span>
      {Array.from({ length: count }, (_, index) => {
        const attempt = attempts[index];
        const status = attempt?.status || (index === activeIndex && completed < target ? 'active' : 'upcoming');
        const label = status === 'earned' ? '7-day streak earned' : status === 'missed' ? 'Missed day · streak reset to zero' : status === 'active' ? `${attempt?.days || 0}/7 consecutive days` : 'Next 7-day streak award';
        return <span key={index} className={`post-progress-marker fire-marker fire-${status}`} style={{ left: `${(index + 1) / (count + 1) * 100}%` }} title={label}>
          <FireAwardIcon />
          <span className="post-progress-marker-label" aria-hidden="true">{status === 'earned' ? '7 days ✓' : status === 'missed' ? 'Missed' : status === 'active' ? `${attempt?.days || 0}/7` : '7 days'}</span>
        </span>;
      })}
      <span className={`post-progress-marker trophy${completed >= target ? ' reached' : ''}`} style={{ left: '100%' }} title={`${completed >= target ? 'Goal award earned' : 'Goal award'} · ${target} task days`}>
        <CategoryAwardIcon category={category} targetDays={target} />
        <span className="post-progress-marker-label" aria-hidden="true">Goal</span>
      </span>
    </span>
  </span>;
}
