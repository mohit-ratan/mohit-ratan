import { useEffect, useState } from 'react';
import useDialog from '../hooks/useDialog';

const colors = ['#ff7733', '#ffd166', '#ed626a', '#fff4d8', '#73b7a1', '#a48ce0'];
const titles = ['A little progress. A big deal.', 'You’re building momentum!', 'Look at you go!', 'Absolutely on fire!'];
export default function TaskCelebration({ celebration, onClose }) {
  const { day, targetDays, taskName, tag, streakDays, goalCompleted, taskCompleted, superpackEarned } = celebration;
  const level = Math.min(4, Math.max(1, celebration.level || 1));
  const ref = useDialog(onClose);
  const [number, setNumber] = useState(Math.max(0, day - 1));
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setNumber(day); return; }
    const timer = setTimeout(() => setNumber(day), 300);
    return () => clearTimeout(timer);
  }, [day]);
  const title = superpackEarned ? 'The SuperPack Award is yours!' : goalCompleted ? 'Goal complete. Award earned!' : taskCompleted ? 'Task complete. You did it!' : titles[level - 1];
  const count = [0, 24, 40, 60, 80][level];
  return <div className={`task-party-backdrop task-party-level-${level}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="task-party-effects" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i * 137.5) * Math.PI / 180;
        const distance = 180 + (i % 9) * 38;
        return <i key={i} className={`task-party-ribbon ${i % 4 === 0 ? 'task-party-dot' : ''}`} style={{ '--x': `${Math.cos(angle) * distance}px`, '--y': `${Math.sin(angle) * distance}px`, '--spin': `${180 + i * 37}deg`, '--delay': `${Math.floor(i / 20) * .28}s`, '--color': colors[i % colors.length] }} />;
      })}
      {level >= 2 && <div className="task-party-ring" />}
      {level >= 3 && <div className="task-party-ring task-party-ring-second" />}
      {level >= 4 && <div className="task-party-rays" />}
    </div>
    <section ref={ref} tabIndex={-1} className="task-party-card" role="dialog" aria-modal="true" aria-labelledby="task-party-title" aria-describedby="task-party-summary">
      <button type="button" className="task-party-close" aria-label="Close celebration" onClick={onClose}>✕</button>
      <span className="task-party-eyebrow">{superpackEarned ? 'RARE AWARD UNLOCKED' : goalCompleted ? 'ACHIEVEMENT UNLOCKED' : taskCompleted ? 'TASK MILESTONE' : 'PHOTO SAVED · PROGRESS EARNED'}</span>
      {superpackEarned && (
        <div className="task-party-superpack" aria-hidden="true">
          <span className="task-party-superpack-medallion"><span className="task-party-superpack-holo" /><span>🏆</span></span>
          <span>Health · Wealth · Relationships — all three, at once.</span>
        </div>
      )}
      <div className="task-party-medal" aria-hidden="true"><span>DAY</span><strong key={number}>{number}</strong><small>+1 task day</small></div>
      <h2 id="task-party-title">{title}</h2>
      <p className="task-party-task">{taskName}</p>
      <p id="task-party-summary">Day {day} of {targetDays} for #{tag}. {streakDays} consecutive {streakDays === 1 ? 'day' : 'days'} of photo check-ins for this task.</p>
      <div className="task-party-streak"><span aria-hidden="true">🔥</span><strong>{streakDays}-day streak</strong><span>{level === 1 ? 'Keep showing up' : `Level ${level} celebration`}</span></div>
      <progress value={day} max={targetDays} aria-label={`${taskName}: ${day} of ${targetDays} task days`} />
      {superpackEarned ? (
        <p className="task-party-award">Your SuperPack Award is waiting in your Achievement House, alongside this goal's own trophy.</p>
      ) : goalCompleted && <p className="task-party-award">Your award is waiting in your Achievement House.</p>}
      <button className="task-party-continue" type="button" onClick={onClose}>{goalCompleted ? 'Enjoy the win →' : 'Keep the momentum →'}</button>
      <small className="task-party-note">{streakDays === 1 ? 'Check in again tomorrow to build your streak.' : 'Same-day uploads add progress; each calendar day counts once toward your streak.'}</small>
    </section>
  </div>;
}
