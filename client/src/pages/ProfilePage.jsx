import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import PostGrid from '../components/PostGrid';
import PostDetailModal from '../components/PostDetailModal';
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
  const [loading, setLoading] = useState(true);
  const [viewPost, setViewPost] = useState(null);

  const [nameDraft, setNameDraft] = useState('');
  const [bioDraft, setBioDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/api/profile/${authorId}`),
        api.get('/api/posts', { params: { authorId } }),
      ]);
      setProfile(profileRes.data.user);
      setStreak(profileRes.data.streak);
      setNameDraft(profileRes.data.user.displayName || '');
      setBioDraft(profileRes.data.user.bio || '');
      setPosts(postsRes.data.posts);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [authorId]);

  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setSaving(true);
    try {
      await api.put('/api/profile/me', { displayName: nameDraft.trim() || 'Anonymous', bio: bioDraft.trim().slice(0, 220) });
      updateUser({ displayName: nameDraft.trim() || 'Anonymous', bio: bioDraft.trim().slice(0, 220) });
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
            <div className="back-link" onClick={() => navigate('/')}>← Back to feed</div>
            <div className="card profile-head">
              <div className="profile-avatar-wrap">
                <Avatar id={profile.id} name={profile.displayName} photoUrl={profile.photoUrl} size={64} />
                {isMe && (
                  <>
                    <label className={`avatar-edit-btn${uploadingPhoto ? ' uploading' : ''}`} title="Change profile photo">
                      <CameraIcon />
                      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                    </label>
                  </>
                )}
              </div>
              <div>
                <div className="profile-name">
                  {profile.displayName}
                  {isMe && <span style={{ fontSize: 13, color: 'var(--text-faint)', fontFamily: 'var(--font-body)', fontWeight: 600 }}> (you)</span>}
                </div>
                {isMe ? (
                  <div className="profile-edit-form">
                    <input type="text" placeholder="Your display name" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                    <textarea placeholder="A short bio… (optional)" rows={2} value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <button className="pill-btn primary" style={{ padding: '7px 14px', fontSize: 12.5 }} disabled={saving} onClick={saveProfile}>
                        {saving ? 'Saving…' : 'Save profile'}
                      </button>
                      {profile.photoUrl && (
                        <button type="button" className="remove-photo-link" onClick={removePhoto}>Remove photo</button>
                      )}
                    </div>
                  </div>
                ) : profile.bio ? (
                  <div className="profile-bio">{profile.bio}</div>
                ) : null}
                <button
                  type="button"
                  className="pill-btn"
                  style={{ marginTop: 10 }}
                  onClick={() => navigate(`/profile/${authorId}/achievements`)}
                >
                  🏆 Achievements Room
                </button>
              </div>
            </div>
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
