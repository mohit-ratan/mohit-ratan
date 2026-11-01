import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mediaUrl } from '../api';
import { ThemeIcon } from '../lib/icons';
import { buildReelSlides, monthlyReelMusic } from '../lib/monthlyReel.mjs';
import useDialog from '../hooks/useDialog';

function ReelPhoto({ photo, label }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="monthly-reel-photo-fallback"><ThemeIcon name="camera" /><p>This moment is no longer available.</p></div>;
  return <div className="monthly-reel-photo">
    <img className="monthly-reel-photo-blur" src={mediaUrl(photo.mediaUrl)} alt="" aria-hidden="true" />
    <img className="monthly-reel-photo-main" src={mediaUrl(photo.mediaUrl)} alt={`A moment from ${label}`} onError={() => setFailed(true)} />
  </div>;
}

export default function MonthlyReel({ recap, onClose }) {
  const ref = useDialog(onClose);
  const slides = useMemo(() => buildReelSlides(recap), [recap]);
  const music = useMemo(() => monthlyReelMusic(recap), [recap]);
  const [index, setIndex] = useState(0);
  const [revision, setRevision] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sound, setSound] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const elapsed = useRef(0);
  const audio = useRef(null);
  const slide = slides[index];

  function go(next) {
    elapsed.current = 0; setProgress(0); setEnded(false); setRevision(value => value + 1);
    setIndex(Math.max(0, Math.min(slides.length - 1, next)));
  }
  function replay() { go(0); if (audio.current) audio.current.currentTime = 0; setPlaying(true); }
  function toggleMusic() {
    setAudioError(false);
    if (!sound && playing) {
      const promise = audio.current?.play();
      promise?.catch(error => { if (error.name !== 'AbortError') { setSound(false); setAudioError(true); } });
    }
    setSound(!sound);
  }
  useEffect(() => {
    if (!playing) return;
    let frame;
    const started = performance.now(), previous = elapsed.current;
    function tick(now) {
      elapsed.current = previous + now - started;
      setProgress(Math.min(100, elapsed.current / slide.duration * 100));
      if (elapsed.current >= slide.duration) {
        if (index === slides.length - 1) { setPlaying(false); setEnded(true); }
        else { elapsed.current = 0; setProgress(0); setIndex(current => current + 1); }
      } else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, playing, slide.duration, slides.length, revision]);
  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    let cancelled = false;
    player.volume = .35;
    if (playing && sound) player.play().catch(() => { if (!cancelled) { setSound(false); setAudioError(true); } });
    else player.pause();
    return () => { cancelled = true; };
  }, [playing, sound]);
  useEffect(() => {
    const player = audio.current;
    return () => { player?.pause(); };
  }, []);
  function togglePlayback() {
    if (!playing && sound) audio.current?.play().catch(() => {});
    setPlaying(current => !current);
  }
  useEffect(() => {
    function visibility() { if (document.hidden) setPlaying(false); }
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  // Warm the next photo without waiting for it to become a slide.
  useEffect(() => {
    const photo = slides[index + 1]?.photo;
    if (photo) { const image = new Image(); image.src = mediaUrl(photo.mediaUrl); }
  }, [index, slides]);

  return createPortal(<div className="monthly-reel-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={ref} className={`monthly-reel${playing ? ' is-playing' : ' is-paused'}`} role="dialog" aria-modal="true" aria-labelledby="monthly-reel-heading" tabIndex={-1} onKeyDown={event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
    }}>
      <audio ref={audio} src={music.src} loop preload="none" />
      <header className="monthly-reel-header">
        <div><span>PACKSOMEWORK</span><h2 id="monthly-reel-heading">{recap.label} reel</h2></div>
        <button type="button" onClick={onClose} aria-label="Close monthly reel"><ThemeIcon name="close" /></button>
      </header>
      <div className="monthly-reel-stage">
        <div className="monthly-reel-segments" aria-label="Reel slides">{slides.map((item, position) => <button type="button" key={item.id} aria-label={`Go to slide ${position + 1} of ${slides.length}`} aria-current={position === index ? 'step' : undefined} onClick={() => go(position)}><span><i style={{ transform: `scaleX(${position < index ? 1 : position === index ? progress / 100 : 0})` }} /></span></button>)}</div>
        <div className={`monthly-reel-slide monthly-reel-slide-${slide.type}`} key={`${slide.id}-${revision}`}>
          {slide.type === 'photo' ? <>
            <ReelPhoto photo={slide.photo} label={recap.label} />
            <div className="monthly-reel-caption"><span>A MOMENT WORTH REMEMBERING</span><p>{slide.caption}</p></div>
          </> : <div className="monthly-reel-title-card">
            <ThemeIcon name="sparkle" />
            <span>{slide.type === 'intro' ? 'YOUR MONTH IN MOMENTS' : recap.label.toUpperCase()}</span>
            <h3>{slide.heading}</h3><p>{slide.caption}</p>
            <div className="monthly-reel-milestones"><strong>{recap.postCount}<small>moments shared</small></strong><strong>{recap.activeDays}<small>days showing up</small></strong>{recap.goalsCompleted > 0 && <strong>{recap.goalsCompleted}<small>goals finished</small></strong>}</div>
            {ended && <button type="button" className="monthly-reel-replay" onClick={replay}>Replay this month ↻</button>}
          </div>}
        </div>
      </div>
      <footer className="monthly-reel-controls">
        <div><button type="button" aria-label="Previous slide" disabled={index === 0} onClick={() => go(index - 1)}>‹</button><button type="button" aria-label={ended ? 'Replay reel' : playing ? 'Pause reel' : 'Play reel'} onClick={ended ? replay : togglePlayback}><ThemeIcon name={playing ? 'pause' : 'play'} /></button><button type="button" aria-label="Next slide" disabled={index === slides.length - 1} onClick={() => go(index + 1)}>›</button></div>
        <button type="button" className="monthly-reel-sound" aria-pressed={sound} onClick={toggleMusic}><ThemeIcon name={sound ? 'sound' : 'muted'} />{sound ? 'Music on' : 'Enable music'}</button>
      </footer>
      <p className="monthly-reel-music-note" role={audioError ? 'status' : undefined}>{audioError ? 'Music could not play. You can keep watching or try enabling it again.' : `${music.label} · ${index + 1}/${slides.length}`}</p>
    </section>
  </div>, document.body);
}
