import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
export default function AccountPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState('help');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function submit(event, deleting = false) {
    event.preventDefault(); setBusy(true); setNotice(''); setError('');
    try {
      if (deleting) { await api.delete('/api/account', { data: { password, confirmation } }); signOut(); navigate('/'); }
      else { const { data } = await api.post('/api/support', { kind, message }); setNotice(data.message); setMessage(''); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="information-page"><Link to="/">← Back to feed</Link><h1>Account & help</h1><p><Link to="/privacy">How your information is used</Link> · <Link to="/forgot-password">Reset your password</Link></p>{error && <p role="alert" className="auth-error">{error}</p>}{notice && <p role="status" className="auth-success">{notice}</p>}<section><h2>Get help or report a concern</h2><p>Include the post link or account name for content reports. Do not include passwords or sign-in codes. Requests are saved for the site operator to review.</p><form className="auth-form" onSubmit={submit}><label htmlFor="support-kind">Topic</label><select id="support-kind" value={kind} onChange={e => setKind(e.target.value)}><option value="help">Help</option><option value="content">Report content or an account</option><option value="privacy">Privacy request</option></select><label htmlFor="support-message">Details</label><textarea id="support-message" value={message} minLength={10} maxLength={2000} onChange={e => setMessage(e.target.value)} required rows={5} /><button className="auth-submit" disabled={busy}>Submit request</button></form></section><section><h2>Delete your account</h2><p>This permanently deletes your profile, posts, stories, goals, and interactions from the active database. Uploaded media is queued for removal. This cannot be undone.</p><form className="auth-form" onSubmit={e => submit(e, true)}><div className="auth-field"><label htmlFor="delete-password">Current password</label><input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></div><div className="auth-field"><label htmlFor="delete-confirmation">Type DELETE to confirm</label><input id="delete-confirmation" value={confirmation} pattern="DELETE" onChange={e => setConfirmation(e.target.value)} required /></div><button className="auth-submit" disabled={busy || confirmation !== 'DELETE'}>Delete my account permanently</button></form></section></main>;
}
