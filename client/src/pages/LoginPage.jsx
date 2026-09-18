import BrandLogo from '../components/BrandLogo';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpStep, setOtpStep] = useState('request'); // 'request' | 'verify'
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError('');
    setMessage('');
    setOtpStep('request');
    setCode('');
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      signIn(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestCode(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/auth/otp/request', { email });
      setMessage(data.message || 'Code sent.');
      setOtpStep('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/auth/otp/verify', { email, code });
      signIn(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <BrandLogo size={42} />
          <span className="brand-mark">PackSomeWork</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to keep your streak going.</p>

        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`auth-mode-tab${mode === 'password' ? ' active' : ''}`}
            onClick={() => switchMode('password')}
          >
            Password
          </button>
          <button
            type="button"
            className={`auth-mode-tab${mode === 'otp' ? ' active' : ''}`}
            onClick={() => switchMode('otp')}
          >
            Email code
          </button>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 14 }}>{error}</div>}
        {message && mode === 'otp' && <div className="auth-success" style={{ marginBottom: 14 }}>{message}</div>}

        {mode === 'password' ? (
          <form className="auth-form" onSubmit={handlePasswordSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </div>
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : otpStep === 'request' ? (
          <form className="auth-form" onSubmit={handleRequestCode}>
            <div className="auth-field">
              <label htmlFor="otpEmail">Email</label>
              <input
                id="otpEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Sending code…' : 'Email me a code'}
            </button>
            <p className="auth-note">We'll email a 6-digit code that signs you in — no password needed.</p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerifyCode}>
            <div className="auth-field">
              <label htmlFor="code">6-digit code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button type="button" className="auth-link" onClick={() => setOtpStep('request')}>
              Send a new code
            </button>
          </form>
        )}

        <div className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
