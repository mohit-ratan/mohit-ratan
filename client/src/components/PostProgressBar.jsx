import CategoryAwardIcon from './CategoryAwardIcon';

export default function PostProgressBar({ completed, target, category }) {
  const percent = Math.min(100, Math.max(0, completed / target * 100));
  const checkpoints = [25, 50, 75, 100];
  return (
    <span className="post-progress-path" role="progressbar" aria-label="Goal task days" aria-valuemin={0} aria-valuemax={target} aria-valuenow={completed} aria-valuetext={`${completed} of ${target} task days. Goal trophy at ${target} days.`}>
      <span className="post-progress-rail"><span className="post-progress-fill" style={{ width: `${percent}%` }} /></span>
      {checkpoints.map(point => {
        const reached = percent >= point;
        const final = point === 100;
        const label = final ? `${reached ? 'Goal trophy earned' : 'Goal trophy'} · ${target} task days` : `${point}% progress checkpoint${reached ? ' reached' : ''}`;
        return <span key={point} className={`post-progress-marker${reached ? ' reached' : ''}${final ? ' trophy' : ''}`} style={{ left: `${point}%` }} title={label}>
          <CategoryAwardIcon category={category} tier={point / 25} />
          <span className="post-progress-marker-label" aria-hidden="true">{final ? 'Goal' : `${point}%`}</span>
        </span>;
      })}
    </span>
  );
}
