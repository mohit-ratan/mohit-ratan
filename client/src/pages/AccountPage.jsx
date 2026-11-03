import ReminderSettings from '../components/ReminderSettings';
import BlockedAccounts from '../components/BlockedAccounts';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
export default function AccountPage() {
  const { user, signOut, updateUser } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState('help');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [settingsError, setSettingsError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/api/profile/${user.id}`),
      api.get('/api/member/dashboard', { params: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } }),
    ]).then(([profileResult, dashboardResult]) => {
      if (cancelled) return;
      setProfile(profileResult.data.user);
      setPreferences(dashboardResult.data.preferences);
      setSettingsError('');
    }).catch(err => { if (!cancelled) setSettingsError(err.message); });
    return () => { cancelled = true; };
  }, [user.id, retry]);
  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true); setProfileNotice(''); setSettingsError('');
    const patch = { displayName: profile.displayName.trim(), bio: (profile.bio || '').trim(), isPrivate: profile.isPrivate };
    try {
      await api.put('/api/profile/me', patch);
      updateUser(patch);
      setProfileNotice('Profile and privacy settings saved.');
    } catch (err) { setSettingsError(err.message); }
    finally { setSavingProfile(false); }
  }
  async function submit(event, deleting = false) {
    event.preventDefault(); setBusy(true); setNotice(''); setError('');
    try {
      if (deleting) { await api.delete('/api/account', { data: { password, confirmation } }); signOut(); navigate('/'); }
      else { const { data } = await api.post('/api/support', { kind, message }); setNotice(data.message); setMessage(''); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="information-page"><Link to="/">← Back to feed</Link><h1>Account settings</h1><p>Manage your profile, privacy, reminders, and account.</p><p><Link to="/privacy">How your information is used</Link> · <Link to="/forgot-password">Reset your password</Link></p>{error && <p role="alert" className="auth-error">{error}</p>}{notice && <p role="status" className="auth-success">{notice}</p>}{settingsError && <div role="alert" className="auth-error">{settingsError} <button type="button" onClick={() => setRetry(value => value + 1)}>Reload settings</button></div>}
    {!profile && !settingsError && <p role="status">Loading settings…</p>}
    {profile && <section><h2>Profile & privacy</h2><form className="auth-form" onSubmit={saveProfile}>
      <div className="auth-field"><label htmlFor="settings-name">Display name</label><input id="settings-name" required maxLength={100} value={profile.displayName} onChange={e => setProfile({ ...profile, displayName: e.target.value })} /></div>
      <div className="auth-field"><label htmlFor="settings-bio">Bio</label><textarea id="settings-bio" maxLength={220} rows={3} value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} /></div>
      <label className="daily-checkbox"><input type="checkbox" checked={profile.isPrivate} onChange={e => setProfile({ ...profile, isPrivate: e.target.checked })} /> Private account</label>
      <small>When enabled, new followers need your approval to see private activity. Existing followers keep access. Posts shared as public remain public.</small>
      <button className="auth-submit" disabled={savingProfile || !profile.displayName.trim()}>{savingProfile ? 'Saving…' : 'Save profile & privacy'}</button>
      {profileNotice && <p role="status">{profileNotice}</p>}
    </form><p><Link to={`/profile/${user.id}`}>Change your profile photo →</Link></p></section>}
    {preferences && <ReminderSettings initial={preferences} />}
    <section><h2>Blocked accounts</h2><p>Manage people you’ve blocked. Blocked accounts appear below when you have any.</p><BlockedAccounts /></section>
    <section><h2>Security</h2><p>Use email recovery to choose a new password.</p><Link to="/forgot-password">Reset your password →</Link></section>
    <section><h2>Get help or report a concern</h2><p>Include the post link or account name for content reports. Do not include passwords or sign-in codes. Requests are saved for the site operator to review.</p><form className="auth-form" onSubmit={submit}><label htmlFor="support-kind">Topic</label><select id="support-kind" value={kind} onChange={e => setKind(e.target.value)}><option value="help">Help</option><option value="content">Report content or an account</option><option value="privacy">Privacy request</option></select><label htmlFor="support-message">Details</label><textarea id="support-message" value={message} minLength={10} maxLength={2000} onChange={e => setMessage(e.target.value)} required rows={5} /><button className="auth-submit" disabled={busy}>Submit request</button></form></section><section><h2>Delete your account</h2><p>This permanently deletes your profile, posts, stories, goals, and interactions from the active database. Uploaded media is queued for removal. This cannot be undone.</p><form className="auth-form" onSubmit={e => submit(e, true)}><div className="auth-field"><label htmlFor="delete-password">Current password</label><input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></div><div className="auth-field"><label htmlFor="delete-confirmation">Type DELETE to confirm</label><input id="delete-confirmation" value={confirmation} pattern="DELETE" onChange={e => setConfirmation(e.target.value)} required /></div><button className="auth-submit" disabled={busy || confirmation !== 'DELETE'}>Delete my account permanently</button></form></section></main>;
}
