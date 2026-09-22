import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { AWARD_COLLECTIONS, AWARD_KIND_COPY, TRIFECTA_AWARD } from '../lib/awardDesigns';

function AwardCard({ award, category }) {
  const kindCopy = AWARD_KIND_COPY[award.kind];
  return (
    <article className={`award-card award-card-${category}`}>
      <div className="award-medallion-wrap">
        <span className="award-medallion-ring" />
        <div className="award-medallion">
          <span className="award-medallion-shine" />
          <span className="award-medallion-icon">{award.icon}</span>
        </div>
      </div>
      <span className="award-status-chip">Design preview · not yet earned</span>
      <h3>{award.name}</h3>
      <span className="award-kind-label">{kindCopy.label}</span>
      <p>{award.rule}</p>
    </article>
  );
}

function TrifectaAwardCard() {
  return (
    <article className="award-card award-card-trifecta">
      <div className="award-medallion-wrap-trifecta">
        <span className="award-medallion-ring-outer" />
        <span className="award-medallion-ring-trifecta" />
        <div className="award-medallion-trifecta">
          <span className="award-medallion-holo" />
          <span className="award-medallion-trifecta-icon">{TRIFECTA_AWARD.icon}</span>
        </div>
      </div>
      <span className="award-status-chip">Design preview · not yet earned</span>
      <h3>{TRIFECTA_AWARD.name}</h3>
      <span className="award-kind-label">Ultimate award</span>
      <p>{TRIFECTA_AWARD.rule}</p>
    </article>
  );
}

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
          <h1>The Awards Gallery</h1>
          <p className="intro-lead">
            A look at every award design in PackSomeWork — what it celebrates and exactly how it's earned. Nothing shown
            here has been awarded to you; it's a catalog of designs, not a trophy case. Your own earned awards live in
            your <Link to={user ? `/profile/${user.id}/achievements` : '/register'} className="intro-text-link-inline">Achievement House</Link>.
          </p>
        </section>

        {AWARD_COLLECTIONS.map((collection) => (
          <section key={collection.category} className={`awards-collection awards-collection-${collection.category}`} aria-labelledby={`awards-${collection.category}-title`}>
            <div className="intro-section-heading">
              <p className="intro-eyebrow">{collection.emoji} {collection.label.toUpperCase()} COLLECTION</p>
              <h2 id={`awards-${collection.category}-title`}>{collection.label} awards</h2>
            </div>
            <div className="awards-grid">
              {collection.awards.map((award) => (
                <AwardCard key={award.id} award={award} category={collection.category} />
              ))}
            </div>
          </section>
        ))}

        <section className="awards-trifecta-section" aria-labelledby="awards-trifecta-title">
          <div className="intro-section-heading">
            <p className="intro-eyebrow">🏆 THE RAREST DESIGN</p>
            <h2 id="awards-trifecta-title">One award for the whole picture</h2>
          </div>
          <TrifectaAwardCard />
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
