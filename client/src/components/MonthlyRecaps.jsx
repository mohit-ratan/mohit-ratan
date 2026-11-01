import MonthlyReel from './MonthlyReel';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import api, { mediaUrl } from '../api';
import { CategoryIcon, ThemeIcon } from '../lib/icons';
import { CAT_MAP } from '../lib/format';

export default function MonthlyRecaps({ authorId, isMe }) {
  const [params] = useSearchParams();
  const location = useLocation();
  const monthParam = params.get('recap');
  const requestedMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam || '') ? monthParam : null;
  const requestReel = params.get('reel') === '1';
  const opened = useRef(null);
  const section = useRef(null);
  const [reel, setReel] = useState(null);
  const [recaps, setRecaps] = useState([]);
  const [selected, setSelected] = useState('');
  const [nextBefore, setNextBefore] = useState(null);
  const [failedBefore, setFailedBefore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const load = useCallback(async (before = null, initial = false) => {
    const request = ++requestId.current;
    setLoading(true); setError(null); setFailedBefore(before);
    try {
      const { data } = await api.get(`/api/profile/${authorId}/monthly-recaps`, { params: before ? { before } : {} });
      if (request !== requestId.current) return;
      setRecaps(current => before && !initial ? [...new Map([...current, ...data.recaps].map(recap => [recap.month, recap])).values()] : data.recaps);
      setSelected(current => initial && data.recaps.some(item => item.month === requestedMonth) ? requestedMonth : before && !initial && current ? current : data.recaps[0]?.month || '');
      setNextBefore(data.nextBefore);
    } catch (err) { if (request === requestId.current) setError(err.message); }
    finally { if (request === requestId.current) setLoading(false); }
  }, [authorId, requestedMonth]);
  useEffect(() => {
    let before = null;
    if (requestedMonth) {
      const date = new Date(`${requestedMonth}-01T12:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + 1);
      before = date.toISOString().slice(0, 7);
    }
    load(before, true);
    return () => { requestId.current += 1; };
  }, [load, requestedMonth]);
  useEffect(() => {
    const target = recaps.find(item => item.month === requestedMonth);
    if (!target || opened.current === location.key) return;
    opened.current = location.key;
    section.current?.scrollIntoView({ block: 'start' });
    if (requestReel && target.images.length) setReel(target);
  }, [recaps, requestedMonth, requestReel, location.key]);
  const recap = recaps.find(item => item.month === selected) || recaps[0];

  return <section ref={section} className="card monthly-recaps" aria-labelledby="monthly-highlights-title">
    <header className="monthly-recaps-heading">
      <div><span className="house-eyebrow">A MONTH OF SHOWING UP</span><h2 id="monthly-highlights-title">Monthly highlights</h2></div>
      {recaps.length > 1 && <label className="monthly-recap-selector">Month<select value={recap.month} onChange={event => setSelected(event.target.value)}>{recaps.map(item => <option key={item.month} value={item.month}>{item.label}</option>)}</select></label>}
    </header>
    {loading && !recap && <p role="status">Gathering monthly highlights…</p>}
    {error && <p className="inline-error" role="alert">{error} <button type="button" onClick={() => load(failedBefore)}>Try again</button></p>}
    {recap ? <article className="monthly-recap" key={recap.month}>
      <div className="monthly-recap-title"><ThemeIcon name="sparkle" /><h3>{recap.label}</h3></div>
      {recap.images.length > 0 && <button type="button" className="monthly-recap-play" onClick={() => setReel(recap)}><ThemeIcon name="play" />Play monthly reel<span>Photos, highlights & music</span></button>}
      <div className="monthly-recap-categories">{recap.categories.map(item => <span key={item.category}><CategoryIcon category={item.category} />{CAT_MAP[item.category]?.label}</span>)}</div>
      {recap.images.length > 0 && <div className="monthly-recap-collage">{recap.images.map(photo => <Link key={photo.id} to={`/?post=${encodeURIComponent(photo.id)}`} aria-label={`Open photo from ${recap.label}`}><img src={mediaUrl(photo.mediaUrl)} alt={`A moment shared in ${recap.label}`} loading="lazy" style={{ objectPosition: `${photo.cropX}% ${photo.cropY}%` }} /></Link>)}</div>}
      <dl className="monthly-recap-stats">
        <div><dd>{recap.postCount}</dd><dt>Moments shared</dt></div>
        <div><dd>{recap.activeDays}</dd><dt>Days showing up</dt></div>
        <div><dd>{recap.goalsCompleted || recap.checkIns || recap.categories.length}</dd><dt>{recap.goalsCompleted ? 'Goals finished' : recap.checkIns ? 'Goal check-ins' : 'Areas explored'}</dt></div>
      </dl>
      <ul className="monthly-recap-highlights">{recap.highlights.map(highlight => <li key={highlight}><ThemeIcon name="check" /><span>{highlight}</span></li>)}</ul>
      <p className="monthly-recap-footer">Small steps, worth celebrating.</p>
    </article> : !loading && !error && <p className="monthly-recap-empty">{isMe ? 'Your monthly highlights will appear here after a month of sharing. Keep posting your progress.' : 'Monthly highlights appear after a completed month with shared posts.'}</p>}
    {nextBefore && <button type="button" className="house-enter-btn" disabled={loading} onClick={() => load(nextBefore)}>{loading ? 'Loading…' : 'Browse earlier months'}</button>}
    {reel && <MonthlyReel recap={reel} onClose={() => setReel(null)} />}
    <small className="monthly-recap-note">A new recap appears after each calendar month ends. Highlights reflect posts visible to you.</small>
  </section>;
}
