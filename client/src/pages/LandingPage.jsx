import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

const areas = [
  { name: 'Health', icon: '↗', description: 'Make space for movement, rest, and feeling better.', example: 'A little movement, every day', tone: 'health' },
  { name: 'Wealth', icon: '◇', description: 'Build skills, better habits, and a future you choose.', example: 'Time invested in a new skill', tone: 'wealth' },
  { name: 'Relationships', icon: '♡', description: 'Show up for your people. And for yourself.', example: 'More moments together', tone: 'relationships' },
];

export default function LandingPage() {
  return <div className="intro-page">
    <a className="intro-skip" href="#intro-main">Skip to content</a>
    <header className="intro-nav">
      <Link to="/" className="intro-brand" aria-label="PackSomeWork home"><BrandLogo size={36} /><span>PackSomeWork</span></Link>
      <nav aria-label="Public navigation"><a className="intro-how-link" href="#how-it-works">How it works</a><Link to="/login">Sign in</Link><Link className="intro-button intro-button-small" to="/register">Get started <span aria-hidden="true">↗</span></Link></nav>
    </header>
    <main id="intro-main">
      <section className="intro-hero">
        <div className="intro-hero-copy"><p className="intro-eyebrow">A LITTLE PROGRESS, EVERY DAY</p>
          <h1>A life you love.<br />Built <em>one day</em><br />at a time.</h1>
          <p className="intro-lead">Turn your goals into small daily actions. Capture your progress in photos, share the journey, and give every achievement a place to belong.</p>
          <div className="intro-actions"><Link className="intro-button" to="/register">Start your first goal <span aria-hidden="true">↗</span></Link><a className="intro-text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
          <p className="intro-hero-note">Health. Wealth. Relationships. Room for all of you.</p>
        </div>
        <div className="intro-preview" aria-label="Example goal with photo updates and task progress">
          <div className="intro-preview-top"><span>YOUR EVERYDAY, ADDING UP</span><span aria-hidden="true">✳</span></div>
          <div className="intro-example-art" role="img" aria-label="Illustration of a sunrise over hills"><div className="intro-sun" /><div className="intro-hill intro-hill-back" /><div className="intro-hill intro-hill-front" /><span>A fresh start.<br />A small step.</span><small>ILLUSTRATIVE GOAL PREVIEW</small></div>
          <div className="intro-preview-body"><div className="intro-preview-label"><span>HEALTH / DAILY MOVEMENT</span><span>EXAMPLE</span></div><h2>Make time for a walk.</h2><div className="intro-progress-copy"><span>7 of 10 task days logged</span><strong>70%</strong></div><progress value="7" max="10" aria-label="Example walking task: 7 of 10 days" /><div className="intro-preview-bottom"><span><span aria-hidden="true">✓</span> One photo. One step forward.</span><span aria-hidden="true">↗</span></div></div>
        </div>
      </section>
      <section className="intro-areas" aria-labelledby="intro-areas-title"><div className="intro-section-heading"><p className="intro-eyebrow">MORE THAN A TO-DO LIST</p><h2 id="intro-areas-title">Make progress in what matters.</h2></div><div className="intro-area-grid">{areas.map(area => <article className={`intro-area intro-area-${area.tone}`} key={area.name}><span className="intro-area-icon" aria-hidden="true">{area.icon}</span><h3>{area.name}</h3><p>{area.description}</p><span className="intro-area-example">{area.example}</span></article>)}</div></section>
      <section id="how-it-works" className="intro-how" aria-labelledby="intro-how-title"><div className="intro-section-heading"><p className="intro-eyebrow">SMALL ACTIONS. VISIBLE PROGRESS.</p><h2 id="intro-how-title">From “one day” to day one.</h2></div><ol className="intro-steps"><li><span>01</span><h3>Give your goal a plan.</h3><p>Choose a category, break your goal into tasks, and set how many days you want to put into each.</p></li><li><span>02</span><h3>Capture the work.</h3><p>Upload a photo linked to a task. Each upload adds to its progress, so you can see your effort building.</p></li><li><span>03</span><h3>Celebrate finishing.</h3><p>Complete all your goal’s tasks to earn an award. Your achievement gets a home on its category’s floor.</p></li></ol></section>
      <section className="intro-house-section" aria-labelledby="intro-house-title"><div className="intro-house" aria-label="An achievement house with three floors"><div className="intro-roof" aria-hidden="true"><BrandLogo size={38} /></div>{[...areas].reverse().map((area, index) => <div key={area.name} className={`intro-floor intro-area-${area.tone}`}><span className="intro-floor-number">0{3-index}</span><span>{area.name}</span><span aria-hidden="true">{area.icon}</span></div>)}<p>Your future achievements live here.</p></div><div className="intro-house-copy"><p className="intro-eyebrow">A HOME FOR YOUR ACHIEVEMENTS</p><h2>Small wins deserve<br />a place of their own.</h2><p>Three floors for three parts of life. As you finish goals, fill your house with awards that tell the story of the work you’ve put in.</p><p>Share everyday moments with your community along the way. Every post is part of the journey; completed goals earn the awards.</p><Link className="intro-text-link" to="/register">Build your achievement house <span aria-hidden="true">↗</span></Link></div></section>
      <section className="intro-final"><p className="intro-eyebrow">YOUR NEXT CHAPTER</p><h2>You don’t need a perfect plan.<br />Just a place to start.</h2><Link className="intro-button" to="/register">Make a little progress <span aria-hidden="true">↗</span></Link><p>Already part of the community? <Link to="/login">Sign in</Link></p></section>
    </main><footer className="intro-footer"><Link className="intro-brand" to="/"><BrandLogo size={25} /><span>PackSomeWork</span></Link><p>A little progress, every day.</p><Link to="/privacy">Privacy & help</Link><Link to="/login">Sign in <span aria-hidden="true">↗</span></Link></footer>
  </div>;
}
