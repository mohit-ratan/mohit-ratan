import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import PostGrid from '../components/PostGrid';
import PostDetailModal from '../components/PostDetailModal';
import TrophyCase from '../components/TrophyCase';
import { CameraIcon } from '../lib/icons';

export default function ProfilePage() {
  const { id: authorId } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const showToast = useToast();
  const photoInputRef = useRef(null);

  const isMe = user?.id === authorId;

  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(0);
  const [posts, setPosts] = useState([]);
  const [trophies, setTrophies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewPost, setViewPost] = useState(null);

  const [nameDraft, setNameDraft] = useState('');
  const [bioDraft, setBioDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes, achievementsRes] = await Promise.all([
        api.get(`/api/profile/${authorId}`),
        api.get('/api/posts', { params: { authorId } }),
        api.get('/api/posts/achievements', { params: { authorId } }),
      ]);
      setProfile(profileRes.data.user);
      setStreak(profileRes.data.streak);
      setNameDraft(profileRes.data.user.displayName || '');
      setBioDraft(profileRes.data.user.bio || '');
      setPosts(postsRes.data.posts);
      setTrophies(achievementsRes.data.achievements.filter((a) => a.goal?.completed));
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [authorId, showToast]);

  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setSaving(true);
    try {
      await api.put('/api/profile/me', { displayName: nameDraft.trim() || 'Anonymous', bio: bioDraft.trim().slice(0, 220) });
      updateUser({ displayName: nameDraft.trim() || 'Anonymous', bio: bioDraft.trim().slice(0, 220) });
      setEditing(false);
      showToast('Profile saved');
      load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image')) {
      showToast('Please choose an image file.', true);
      e.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('That photo is over the 8 MB limit.', true);
      e.target.value = '';
      return;
    }
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const { data } = await api.post('/api/profile/me/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ photoUrl: data.photoUrl });
      showToast('Profile photo updated');
      load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function removePhoto() {
    try {
      await api.delete('/api/profile/me/photo');
      updateUser({ photoUrl: null });
      showToast('Profile photo removed');
      load();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  if (loading || !profile) {
    return (
      <>
        <Header streak={0} counts={{}} />
        <div className="wrap"><main className="layout"><section className="feed-col"><div className="card empty-state"><p>Loading…</p></div></section></main></div>
      </>
    );
  }

  return (
    <>
      <Header streak={isMe ? streak : 0} counts={{}} onCompose={() => navigate('/')} />
      <div className="wrap">
        <main className="layout">
          <section className="feed-col">
            <button type="button" className="back-link profile-back" onClick={() => navigate('/')}>← Back to feed</button>
            <div className="card profile-hero">
              <div className="profile-hero-banner"><span>HEALTH · WEALTH · RELATIONSHIPS</span><span className="profile-banner-orbit" aria-hidden="true" /></div>
              <div className="profile-hero-body">
                <div className="profile-identity-row">
                  <div className="profile-avatar-wrap profile-hero-avatar">
                    <Avatar id={profile.id} name={profile.displayName} photoUrl={profile.photoUrl} size={88} />
                    {isMe && <>
                      <button type="button" className={`avatar-edit-btn${uploadingPhoto ? ' uploading' : ''}`} aria-label="Change profile photo" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()}><CameraIcon /></button>
                      <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
                    </>}
                  </div>
                  {isMe && <button type="button" className="profile-edit-toggle" aria-expanded={editing} aria-controls="profile-editor" onClick={() => { setNameDraft(profile.displayName || ''); setBioDraft(profile.bio || ''); setEditing(!editing); }} disabled={saving}>{editing ? 'Cancel editing' : 'Edit profile'}</button>}
                </div>
                <div className="profile-identity-copy">
                  <span className="profile-kicker">{isMe ? 'YOUR PERSONAL JOURNEY' : 'A JOURNEY IN PROGRESS'}</span>
                  <h1 className="profile-name">{profile.displayName}</h1>
                  <p className="profile-bio">{profile.bio || (isMe ? 'Small steps. Meaningful progress. A life you’re building.' : 'Building a life, one milestone at a time.')}</p>
                </div>
                {isMe && editing && <form id="profile-editor" className="profile-editor" onSubmit={(e) => { e.preventDefault(); saveProfile(); }}>
                  <label>Display name<input type="text" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} disabled={saving} /></label>
                  <label>Bio <span>(optional)</span><textarea rows={3} maxLength={220} value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} placeholder="What are you working toward?" disabled={saving} /></label>
                  <div className="profile-editor-actions"><button type="submit" className="pill-btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>{profile.photoUrl && <button type="button" className="remove-photo-link" onClick={removePhoto}>Remove photo</button>}</div>
                </form>}
                <div className="profile-bottom-row">
                  <dl className="profile-metrics">
                    <div><dd>{posts.length}</dd><dt>Posts</dt></div>
                    <div><dd>{trophies.length}</dd><dt>Awards earned</dt></div>
                    <div><dd>{streak}<span> days</span></dd><dt>Current streak</dt></div>
                  </dl>
                  <button type="button" className="profile-house-link" onClick={() => navigate(`/profile/${authorId}/achievements`)}>
                    <span className="profile-house-icon" aria-hidden="true">🏆</span><span><strong>Achievement House</strong><small>Goals, progress & earned awards</small></span><span aria-hidden="true">↗</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="profile-posts-heading"><h2>{isMe ? 'Your moments' : 'Moments'}</h2><span>{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span></div>
            <TrophyCase trophies={trophies} authorId={authorId} />
            <PostGrid
              posts={posts}
              onOpen={setViewPost}
              emptyIcon="📭"
              emptyTitle="No posts yet"
              emptyText={isMe ? 'Share your first photo, video, or update from the home feed.' : "This person hasn't posted yet."}
            />
          </section>
          <aside className="side-col" />
        </main>
      </div>
      {viewPost && (
        <PostDetailModal
          post={viewPost}
          onClose={() => setViewPost(null)}
          onChanged={load}
          onOpenAuthor={(id) => { setViewPost(null); navigate(`/profile/${id}`); }}
          onOpenTag={(tag) => { setViewPost(null); navigate(`/?tag=${encodeURIComponent(tag)}`); }}
        />
      )}
    </>
  );
}
