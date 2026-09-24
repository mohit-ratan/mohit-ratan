import { useState } from 'react';

// Mirrors FirstGoalGuide's "first login" placement and look, but this one
// explains the rest of the app instead of collecting input — posting,
// how tags become tasks (the thing people most often get confused by),
// achievements, streaks, and the social features.
const SLIDES = [
  {
    icon: '👋',
    title: 'Welcome to PackSomeWork',
    body: "A place to build real consistency in Health, Wealth, and Relationships — one photo at a time. Here's how it all fits together.",
  },
  {
    icon: '📸',
    title: 'Share what you do',
    body: 'Every post needs a real photo or video — no text-only posts. Pick a category, and add a tag if this is part of something ongoing.',
  },
  {
    icon: '🎯',
    title: 'Tags become tasks',
    body: 'The first time you use a tag, you can turn it into a task with a day target, like "gym, 30 days". Reuse that exact same tag every time you check in to keep tracking that one task — a different tag starts a brand-new one, so it\'s worth double-checking before you post.',
  },
  {
    icon: '🏆',
    title: 'Earn real achievements',
    body: "Finish every task in a goal to earn its trophy in your Achievement House. Complete a goal in Health, Wealth, and Relationships all at once for the rare SuperPack Award. Post daily to build a streak — you get 2 free streak freezes a month if you miss a day.",
  },
  {
    icon: '🤝',
    title: 'Connect with others',
    body: "Follow people, pair up with an accountability partner who's notified if you miss a day, and check Following's Progress to see how close everyone you follow is to finishing their goal.",
  },
];

export default function WelcomeTour({ onDone }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <section className="first-goal-guide welcome-tour" aria-labelledby="welcome-tour-title">
      <div className="welcome-tour-head">
        <p className="house-eyebrow">HOW PACKSOMEWORK WORKS · {step + 1} OF {SLIDES.length}</p>
        <button type="button" className="auth-link welcome-tour-skip" onClick={onDone}>Skip</button>
      </div>
      <span className="welcome-tour-icon" aria-hidden="true">{slide.icon}</span>
      <h2 id="welcome-tour-title">{slide.title}</h2>
      <p>{slide.body}</p>
      <div className="welcome-tour-dots" aria-hidden="true">
        {SLIDES.map((_, i) => <span key={i} className={i === step ? 'active' : ''} />)}
      </div>
      <div className="welcome-tour-actions">
        {step > 0 && <button type="button" className="auth-link" onClick={() => setStep((s) => s - 1)}>← Back</button>}
        <button type="button" className="auth-submit" onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}>
          {isLast ? "Let's go →" : 'Next →'}
        </button>
      </div>
    </section>
  );
}
