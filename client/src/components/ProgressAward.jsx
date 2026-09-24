import { awardStars } from '../lib/awardRank.mjs';
const symbols = { health: '✦', wealth: '◆', relationships: '♥' };

export default function ProgressAward({ category, task, preview = false }) {
  const target = Math.max(1, task.targetDays);
  const completed = Math.min(target, Math.max(0, task.completedDays));
  const fraction = completed / target;
  const stars = awardStars(target);
  const tier = stars >= 5 ? 'legend' : stars >= 3 ? 'gold' : stars === 2 ? 'silver' : 'bronze';
  const rank = `${stars}-star`;
  const earned = completed === target;
  return <figure className={`progress-award award-category-${category} award-tier-${tier}${earned ? ' award-revealed' : ''}`} style={{ '--reveal': fraction, '--veil': 1 - fraction, '--award-light': .12 + fraction * .88 }}>
    <div className="progress-award-stage" role="img" aria-label={`${rank} ${target}-day ${category} task award, ${completed} of ${target} days complete${earned ? ', fully revealed' : ''}`}>
      <div className="progress-award-aura" />
      <div className="progress-award-art" aria-hidden="true">
        {(tier === 'gold' || tier === 'legend') && <span className="progress-award-crown">♛</span>}
        <div className="progress-award-ribbons" />
        <div className="progress-award-medal"><span className="progress-award-symbol">{symbols[category] || '✦'}</span><strong>{target}</strong><span className="progress-award-days">DAYS</span></div>
        {tier !== 'bronze' && <div className="progress-award-laurels">❧<span>❧</span></div>}
        <span className="progress-award-stars">{stars <= 6 ? '★'.repeat(stars) : `★ × ${stars}`}</span>
      </div>
      <span className="progress-award-state">{preview ? 'Design preview' : earned ? 'Fully revealed' : completed ? 'Coming to life' : 'Waiting to awaken'}</span>
    </div>
    <figcaption><span className="house-eyebrow">{rank} · {target}-day task</span><h4>{task.text}</h4>{task.tag && <small>#{task.tag}</small>}<p>{preview ? 'Example: ' : ''}{completed} / {target} days · {Math.round(fraction * 100)}% revealed</p><progress value={completed} max={target} aria-label={`${task.text} award reveal`} /><small>{preview ? 'Preview only — track your own reveal in Today.' : earned ? 'Task complete. Finish every task to earn the goal trophy.' : 'Each task-photo check-in reveals more of your award.'}</small></figcaption>
  </figure>;
}
