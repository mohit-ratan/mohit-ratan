import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import Header from '../components/Header';

function PrivatePhoto({ id }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    api.get(`/api/journal/${id}/photo`, { responseType: 'blob', signal: controller.signal }).then(({data}) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(data); setUrl(objectUrl);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id]);
  return url ? <img className="journal-photo" src={url} alt="Your private reflection" /> : <p>{failed ? 'Photo unavailable. Reopen the journal to retry.' : 'Loading private photo…'}</p>;
}
export default function JournalPage() {
  const [params] = useSearchParams();
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [note, setNote] = useState(''), [file, setFile] = useState(null), [notice, setNotice] = useState('');
  async function load(before) {
    try { const {data: result} = await api.get('/api/journal', {params: before ? {before} : {}});
      setData(previous => ({...result, entries: before ? [...previous.entries, ...result.entries] : result.entries}));
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  async function save(event) {
    event.preventDefault(); const form = event.currentTarget;
    setBusy(true); setError(''); setNotice('');
    try { const body = new FormData(); body.append('note', note);
      if (file) body.append('photo', file);
      if (params.get('post')) body.append('postId', params.get('post'));
      await api.post('/api/journal', body); setNote(''); setFile(null); form.reset();
      setNotice('Reflection saved privately.'); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function remove(id) {
    if (!window.confirm('Delete this private reflection and its photo?')) return;
    setBusy(true); setError('');
    try { await api.delete(`/api/journal/${id}`); await load(); }
    catch(err) { setError(err.message); } finally { setBusy(false); }
  }
  return <><Header /><main className="daily-page"><header className="daily-heading"><div><p className="house-eyebrow">A MOMENT FOR YOURSELF</p><h1>Your private journal.</h1><p>Reflect on the work behind your progress.</p></div><Link to="/today">← Today’s tasks</Link></header>
    {error && <p role="alert" className="auth-error">{error} <button onClick={()=>load()}>Retry</button></p>}
    {!data && !error && <p role="status">Opening your journal…</p>}
    {data && !data.enabled && <section className="daily-panel"><h2>Your journal is being prepared</h2><p>Private journal encryption must be configured before reflections can be saved.</p></section>}
    {data?.enabled && <><section className="daily-panel"><h2>How did today feel?</h2><p>These reflections and attached copies of photos are private to your account. A photo already shared in the feed remains public.</p>
      <form onSubmit={save} className="journal-form"><label>Your reflection<textarea required maxLength={2000} rows={5} value={note} onChange={e=>setNote(e.target.value)} placeholder="One small win, something you learned, or what you’ll try tomorrow…" /></label><small>{note.length}/2000 characters</small>
        <label>Private photo (optional)<input className="journal-file-input" type="file" accept="image/*" disabled={!data.photosEnabled} onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
        {!data.photosEnabled && <small>Private photo storage is not configured yet. Text reflections are available.</small>}
        <button className="journal-save-btn" disabled={busy || !note.trim()}>{busy?'Saving…':'Save reflection'}</button></form>{notice&&<p role="status">{notice}</p>}</section>
      {!data.entries.length && <p>Your first reflection starts here.</p>}
      {data.entries.map(entry=><article className="daily-panel" key={entry.id}><div className="daily-section-title"><time dateTime={new Date(entry.createdAt).toISOString()}>{new Date(entry.createdAt).toLocaleString()}</time><button disabled={busy} onClick={()=>remove(entry.id)}>Delete</button></div><p className="journal-note">{entry.note}</p>{entry.hasPhoto&&<PrivatePhoto id={entry.id}/>}</article>)}
      {data.nextBefore&&<button disabled={busy} onClick={async()=>{setBusy(true);await load(data.nextBefore);setBusy(false);}}>Older reflections</button>}</>}
  </main></>;
}
