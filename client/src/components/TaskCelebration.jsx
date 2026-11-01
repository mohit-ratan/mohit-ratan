import FireAwardIcon from './FireAwardIcon';
import CategoryAwardIcon from './CategoryAwardIcon';
import { CAT_MAP } from '../lib/format';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useDialog from '../hooks/useDialog';

const colors = ['#C7470C', '#EF7C32', '#FFD166', '#FFF3E9', '#D99A54', '#FFFFFF'];
const titles = ['A little progress. A big deal.', 'You’re building momentum!', 'Look at you go!', 'Absolutely on fire!'];
export default function TaskCelebration({ celebration, onClose }) {
  const { day, targetDays, taskName, tag, streakDays, goalCompleted, taskCompleted, trifectaEarned } = celebration;
  const displayedStreak = celebration.goalStreakDays ?? streakDays;
  const goalAward = celebration.goalAward;
  const streakAward = celebration.streakAward;
  const award = goalAward || streakAward;
  const level = Math.min(4, Math.max(1, celebration.level || 1));
  const ref = useDialog(onClose);
  const [number, setNumber] = useState(Math.max(0, day - 1));
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setNumber(day); return; }
    const timer = setTimeout(() => setNumber(day), 300);
    return () => clearTimeout(timer);
  }, [day]);
  const title = trifectaEarned ? 'The Trifecta Award is yours!' : goalCompleted ? 'Goal complete. Award earned!' : streakAward ? 'Seven days. Streak award earned!' : taskCompleted ? 'Task complete. You did it!' : titles[level - 1];
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
    <section ref={ref} tabIndex={-1} className={`task-party-card${award ? ' task-party-milestone' : ''}`} role="dialog" aria-modal="true" aria-labelledby="task-party-title" aria-describedby="task-party-summary">
      <button type="button" className="task-party-close" aria-label="Close celebration" onClick={onClose}>✕</button>
      <span className="task-party-eyebrow">{trifectaEarned ? 'RARE AWARD UNLOCKED' : goalCompleted ? 'ACHIEVEMENT UNLOCKED' : streakAward ? 'STREAK AWARD EARNED' : taskCompleted ? 'TASK MILESTONE' : 'PHOTO SAVED · PROGRESS EARNED'}</span>
      {trifectaEarned && (
        <div className="task-party-trifecta" aria-hidden="true">
          <span className="task-party-trifecta-medallion"><span className="task-party-trifecta-holo" /><span>🏆</span></span>
          <span>Health · Wealth · Relationships — all three, within 45 days.</span>
        </div>
      )}
      {award ? <div className="milestone-award-display">
        <div className="milestone-award-pop" role="img" aria-label={goalAward ? `${CAT_MAP[goalAward.category]?.label || 'Goal'} completed goal award` : 'Seven consecutive days streak award'}>
          {goalAward ? <CategoryAwardIcon category={goalAward.category} targetDays={goalAward.targetDays} /> : <FireAwardIcon />}
        </div>
        <p>{goalAward ? `${goalAward.targetDays} goal task days · ${CAT_MAP[goalAward.category]?.label}` : `${streakAward.totalStreakDays} consecutive days on this goal`}</p>
      </div> : <div className="task-party-medal" aria-hidden="true"><span>DAY</span><strong key={number}>{number}</strong><small>+1 task day</small></div>}
      <h2 id="task-party-title">{title}</h2>
      <p className="task-party-task">{taskName}</p>
      <p id="task-party-summary">Day {day} of {targetDays} for #{tag}. {displayedStreak} consecutive {displayedStreak === 1 ? 'day' : 'days'} of photo check-ins for this goal.</p>
      <div className="task-party-streak"><span aria-hidden="true">🔥</span><strong>{displayedStreak}-day streak</strong><span>{level === 1 ? 'Keep showing up' : `Level ${level} celebration`}</span></div>
      <progress value={day} max={targetDays} aria-label={`${taskName}: ${day} of ${targetDays} task days`} />
      {trifectaEarned ? (
        <p className="task-party-award">Your Trifecta Award is waiting in your Achievement House, alongside this goal's own trophy.</p>
      ) : goalCompleted && <p className="task-party-award">Your award is waiting in your Achievement House.</p>}
      <button className="task-party-continue" type="button" onClick={onClose}>{goalCompleted ? 'Enjoy the win →' : 'Keep the momentum →'}</button>
      <Link to="/journal" onClick={onClose}>Reflect on this win privately →</Link>
      <small className="task-party-note">{displayedStreak === 1 ? 'Check in again tomorrow to build your streak.' : 'Same-day uploads add progress; each calendar day counts once toward your streak.'}</small>
    </section>
  </div>;
}
