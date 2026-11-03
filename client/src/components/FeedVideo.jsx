import { useEffect, useRef, useState } from 'react';
import { mediaUrl } from '../api';

export default function FeedVideo({ post, filter, onOpen }) {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        video.play().catch(() => {});
      } else { video.pause(); video.muted = true; setMuted(true); }
    }, { threshold: .65 });
    const pause = () => { if (document.hidden) video.pause(); };
    observer.observe(video);
    document.addEventListener('visibilitychange', pause);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', pause); video.pause(); };
  }, [post.mediaUrl]);
  return <div className="feed-card-media feed-video" style={{ aspectRatio: { square: '1/1', portrait: '4/5', landscape: '16/9' }[post.aspectRatio] || '1/1' }}>
    <video ref={ref} src={mediaUrl(post.mediaUrl)} poster={mediaUrl(post.videoCoverUrl) || undefined} style={filter ? { filter } : undefined} muted={muted} playsInline loop preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <button type="button" className="feed-video-open" aria-label="Open video post" onClick={() => { ref.current.pause(); ref.current.muted = true; setMuted(true); onOpen(); }} />
    <div className="feed-video-controls">
      <button type="button" onClick={() => { const video = ref.current; if (video.paused) video.play().catch(() => {}); else video.pause(); }} aria-label={playing ? 'Pause video' : 'Play video'}>{playing ? 'Pause' : 'Play'}</button>
      <button type="button" aria-label={muted ? 'Turn sound on' : 'Mute video'} aria-pressed={!muted} onClick={() => setMuted(value => !value)}>{muted ? 'Sound off' : 'Sound on'}</button>
    </div>
  </div>;
}
