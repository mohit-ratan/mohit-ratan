import useLocalFlag from '../hooks/useLocalFlag';
import { ThemeIcon } from '../lib/icons';

export default function FeatureAnnouncement({ userId, onCreateVideo }) {
  const [dismissed, dismiss] = useLocalFlag(`psw_video_cheers_announcement_v1:${userId}`);
  if (dismissed) return null;
  return <section className="feature-announcement" aria-labelledby="feature-announcement-title">
    <button type="button" className="feature-announcement-close" aria-label="Dismiss feature announcement" onClick={dismiss}><ThemeIcon name="close" /></button>
    <span className="feature-announcement-kicker"><ThemeIcon name="cheer" /> JUST DROPPED</span>
    <h2 id="feature-announcement-title">Big energy. Little moments.</h2>
    <p><strong>Video posts are here!</strong> Share up to <strong>1 minute</strong> of your workout, a small win, or a moment worth celebrating.</p>
    <p className="feature-announcement-cheer-copy">And bring the cheer squad: send an <strong>On fire 🔥</strong>, a <strong>Keep going 💪</strong>, or a little applause. Every bit of progress deserves some love.</p>
    <div className="feature-announcement-bottom"><span className="feature-announcement-emojis" aria-label="New cheers: On fire, Great effort, Keep going, Inspired me, Getting closer, Milestone">🔥 👏 💪 🙌 🎯 🎉</span><button type="button" className="pill-btn primary" onClick={onCreateVideo}>Share your first video <span aria-hidden="true">→</span></button></div>
  </section>;
}
