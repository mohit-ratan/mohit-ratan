import { Link } from 'react-router-dom';
import ProgressAward from '../components/ProgressAward';
import GoldAward from '../components/GoldAward';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { AWARD_COLLECTIONS, AWARD_KIND_COPY } from '../lib/awardDesigns';

export default function AwardsGalleryPage() {
  const { user } = useAuth();

  return (
    <div className="intro-page awards-gallery-page">
      <a className="intro-skip" href="#awards-main">Skip to content</a>
      <header className="intro-nav">
        <Link to="/" className="intro-brand" aria-label="PackSomeWork home"><BrandLogo size={36} /><span>PackSomeWork</span></Link>
        <nav aria-label="Public navigation">
          {user ? (
            <Link to="/">Back to feed</Link>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link className="intro-button intro-button-small" to="/register">Get started <span aria-hidden="true">↗</span></Link>
            </>
          )}
        </nav>
      </header>
      <main id="awards-main">
        <section className="awards-hero">
          <p className="intro-eyebrow">EVERY DESIGN, EXPLAINED</p>
          <h1>The Awards Gallery</h1><p>1–7 days: ★ · 8–15: ★★ · 16–30: ★★★. Every additional 15 days adds a star. Colours follow your category; detail grows with the challenge.</p>
          <p className="intro-lead">
            A look at every award design in PackSomeWork — what it celebrates and exactly how it's earned. Nothing shown
            here has been awarded to you; it's a catalog of designs, not a trophy case. Your own earned awards live in
            your <Link to={user ? '/today' : '/register'} className="intro-text-link-inline">Today dashboard</Link>.
          </p>
        </section>

        {AWARD_COLLECTIONS.map((collection) => (
          <section key={collection.category} className={`awards-collection awards-collection-${collection.category}`} aria-labelledby={`awards-${collection.category}-title`}>
            <div className="intro-section-heading">
              <p className="intro-eyebrow">{collection.emoji} {collection.label.toUpperCase()} COLLECTION</p>
              <h2 id={`awards-${collection.category}-title`}>{collection.label} awards</h2>
            </div>
            <div className="awards-grid">
              {[7,15,30,45].map(days=><article className={`award-card award-card-${collection.category}`} key={days}><ProgressAward preview category={collection.category} task={{targetDays:days,completedDays:days,text:`${collection.label} · ${days} days`}} /></article>)}
            </div>
          </section>
        ))}

        <section className="awards-trifecta-section" aria-labelledby="awards-trifecta-title">
          <div className="intro-section-heading">
            <p className="intro-eyebrow">🏆 THE RAREST DESIGN</p>
            <h2 id="awards-trifecta-title">One award for the whole picture</h2>
          </div>
          <GoldAward preview />
        </section>

        <section className="awards-legend" aria-labelledby="awards-legend-title">
          <div className="intro-section-heading">
            <p className="intro-eyebrow">TWO KINDS OF AWARD</p>
            <h2 id="awards-legend-title">How earning works</h2>
          </div>
          <div className="awards-legend-grid">
            {Object.entries(AWARD_KIND_COPY).map(([kind, copy]) => (
              <div key={kind} className="awards-legend-item">
                <h3>{copy.label}</h3>
                <p>{copy.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="intro-final awards-final">
          <p className="intro-eyebrow">READY TO EARN ONE?</p>
          <h2>Every award starts<br />with one small step.</h2>
          {user ? (
            <Link className="intro-button" to="/">Go make some progress <span aria-hidden="true">↗</span></Link>
          ) : (
            <Link className="intro-button" to="/register">Start your first goal <span aria-hidden="true">↗</span></Link>
          )}
        </section>
      </main>
      <footer className="intro-footer">
        <Link className="intro-brand" to="/"><BrandLogo size={25} /><span>PackSomeWork</span></Link>
        <p>A little progress, every day.</p>
        <Link to="/privacy">Privacy & help</Link>
        {user ? <Link to="/">Back to feed <span aria-hidden="true">↗</span></Link> : <Link to="/login">Sign in <span aria-hidden="true">↗</span></Link>}
      </footer>
    </div>
  );
}
