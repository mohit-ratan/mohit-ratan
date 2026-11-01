import CategoryAwardIcon from './CategoryAwardIcon';
import FireAwardIcon from './FireAwardIcon';
import GoldAward from './GoldAward';
import { TrophyIcon } from '../lib/icons';
import { CAT_MAP } from '../lib/format';

export default function MonthlyAward({ award }) {
  const label = award.kind === 'trifecta' ? 'Prized Gold · Trifecta' : award.kind === 'streak' ? `${award.days}-day streak` : `${CAT_MAP[award.category]?.label || 'Goal'} goal award`;
  return <figure className={`monthly-award-card monthly-award-${award.kind}`}>
    <div className="monthly-award-art" role="img" aria-label={label}>
      {award.kind === 'trifecta' ? <GoldAward earned /> : award.kind === 'streak' ? <FireAwardIcon days={award.days} /> : award.targetDays ? <CategoryAwardIcon category={award.category} targetDays={award.targetDays} /> : <TrophyIcon />}
    </div>
    <figcaption><strong>{label}</strong>{award.tag && <span>#{award.tag}</span>}</figcaption>
  </figure>;
}
