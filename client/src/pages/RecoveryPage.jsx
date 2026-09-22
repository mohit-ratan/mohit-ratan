import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import api from '../api';

export default function RecoveryPage({ mode }) {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const reset = mode === 'reset-password';
  const title = reset ? 'Choose a new password' : mode === 'forgot-password' ? 'Reset your password' : 'Resend verification email';
  async function submit(event) {
    event.preventDefault();
    setError(''); setMessage('');
    if (reset && password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/api/auth/${mode}`, reset ? { token: params.get('token'), password } : { email });
      setMessage(data.message); setDone(reset);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><div className="auth-card"><Link className="auth-logo" to="/" aria-label="PackSomeWork home"><BrandLogo size={36} /><span className="brand-mark">PackSomeWork</span></Link><h1 className="auth-title">{title}</h1><p className="auth-subtitle">{reset ? 'Use at least 8 characters. Your other sessions will be signed out.' : 'Enter the email address you used to create your account.'}</p>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}{!done && <form className="auth-form" onSubmit={submit}>{reset ? <><div className="auth-field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} required /></div><div className="auth-field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div></> : <div className="auth-field"><label htmlFor="recovery-email">Email</label><input id="recovery-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>}<button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : reset ? 'Save password' : 'Send link'}</button></form>}<div className="auth-switch"><Link to="/login">Back to sign in</Link>{reset && <> · <Link to="/forgot-password">Request a new link</Link></>}</div></div></main>;
}
