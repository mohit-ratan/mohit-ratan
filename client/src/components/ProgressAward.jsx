const symbols = { health: '✦', wealth: '◆', relationships: '♥' };

export default function ProgressAward({ category, task }) {
  const target = Math.max(1, task.targetDays);
  const completed = Math.min(target, Math.max(0, task.completedDays));
  const fraction = completed / target;
  const tier = target >= 90 ? 'legend' : target >= 30 ? 'gold' : target >= 14 ? 'silver' : 'bronze';
  const tierNames = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', legend: 'Legendary' };
  const earned = completed === target;
  return <figure className={`progress-award award-tier-${tier}${earned ? ' award-revealed' : ''}`} style={{ '--reveal': fraction, '--veil': 1 - fraction, '--award-light': .12 + fraction * .88 }}>
    <div className="progress-award-stage" role="img" aria-label={`${tierNames[tier]} ${target}-day ${category} task award, ${completed} of ${target} days complete${earned ? ', fully revealed' : ''}`}>
      <div className="progress-award-aura" />
      <div className="progress-award-art" aria-hidden="true">
        {(tier === 'gold' || tier === 'legend') && <span className="progress-award-crown">♛</span>}
        <div className="progress-award-ribbons" />
        <div className="progress-award-medal"><span className="progress-award-symbol">{symbols[category] || '✦'}</span><strong>{target}</strong><span className="progress-award-days">DAYS</span></div>
        {tier !== 'bronze' && <div className="progress-award-laurels">❧<span>❧</span></div>}
        {tier === 'legend' && <span className="progress-award-stars">✧ ✦ ✧</span>}
      </div>
      <span className="progress-award-state">{earned ? 'Fully revealed' : completed ? 'Coming to life' : 'Waiting to awaken'}</span>
    </div>
    <figcaption><span className="house-eyebrow">{tierNames[tier]} · {target}-day task</span><h4>{task.text}</h4><small>#{task.tag}</small><p>{completed} / {target} days · {Math.round(fraction * 100)}% revealed</p><progress value={completed} max={target} aria-label={`${task.text} award reveal`} /><small>{earned ? 'Task complete. Finish every task to earn the goal trophy.' : 'Each task-photo check-in reveals more of your award.'}</small></figcaption>
  </figure>;
}
