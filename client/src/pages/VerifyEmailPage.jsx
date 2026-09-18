import BrandLogo from '../components/BrandLogo';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'error'
  const [message, setMessage] = useState('');
  // The verify endpoint is one-time-use (it clears the token once consumed),
  // so a second call with the same token — e.g. React StrictMode's
  // dev-only double effect invocation — would fail even though the first
  // call already succeeded. Guard so we only ever call it once per token.
  const calledForToken = useRef(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    if (calledForToken.current === token) return;
    calledForToken.current = token;
    api
      .get('/api/auth/verify', { params: { token } })
      .then(({ data }) => {
        setStatus('ok');
        setMessage(data.message || 'Email verified!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message);
      });
  }, [token]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <BrandLogo size={42} />
          <span className="brand-mark">PackSomeWork</span>
        </div>
        <h1 className="auth-title">Email verification</h1>
        {status === 'checking' && <p className="auth-subtitle">Verifying your email…</p>}
        {status === 'ok' && <div className="auth-success">{message}</div>}
        {status === 'error' && <div className="auth-error">{message}</div>}
        <div className="auth-switch" style={{ marginTop: 20 }}>
          <Link to="/login">Go to sign in</Link>
        </div>
      </div>
    </div>
  );
}
