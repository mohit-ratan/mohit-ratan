import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import StoriesBar from '../components/StoriesBar';
import PostGrid from '../components/PostGrid';
import SideColumn from '../components/SideColumn';
import FollowListPanel from '../components/FollowListPanel';
import Avatar from '../components/Avatar';
import ComposerModal from '../components/ComposerModal';
import PostDetailModal from '../components/PostDetailModal';
import StoryViewerModal from '../components/StoryViewerModal';
import { CameraSmallIcon } from '../lib/icons';

function groupStoriesByAuthor(stories) {
  const groups = {};
  const order = [];
  stories.forEach((s) => {
    if (!groups[s.authorId]) {
      groups[s.authorId] = { authorId: s.authorId, authorName: s.authorName, authorPhotoUrl: s.authorPhotoUrl, stories: [] };
      order.push(s.authorId);
    }
    groups[s.authorId].stories.push(s);
  });
  return order.map((id) => groups[id]);
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const category = ['health', 'wealth', 'relationships'].includes(searchParams.get('category')) ? searchParams.get('category') : 'all';
  const tagFilter = searchParams.get('tag') || null;
  const [searchQuery, setSearchQuery] = useState('');
  function setCategory(value) {
    setSearchParams((params) => { if (value === 'all') params.delete('category'); else params.set('category', value); return params; }, { replace: true });
  }
  function setTagFilter(value) {
    setSearchParams((params) => { if (value) params.set('tag', value); else params.delete('tag'); return params; }, { replace: true });
  }
  const feedRequest = useRef(0);
  const [feedError, setFeedError] = useState(null);
  const [storyError, setStoryError] = useState(false);
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [counts, setCounts] = useState({});
  const [trendingTags, setTrendingTags] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // modal is one of: null | {type:'create'} | {type:'addStory'} | {type:'view', post} | {type:'viewStory', authorId, index}
  const [modal, setModal] = useState(null);

  const loadPosts = useCallback(async () => {
    const request = ++feedRequest.current;
    setLoading(true);
    setFeedError(null);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (tagFilter) params.tag = tagFilter;
      const { data } = await api.get('/api/posts', { params });
      if (request === feedRequest.current) setPosts(data.posts);
    } catch (error) {
      if (request === feedRequest.current) setFeedError(error.message);
    } finally {
      if (request === feedRequest.current) setLoading(false);
    }
  }, [category, tagFilter]);

  const loadStories = useCallback(async () => {
    try {
      const { data } = await api.get('/api/stories');
      setStories(data.stories);
      setStoryError(false);
    } catch { setStoryError(true); }
  }, []);

  const loadMeta = useCallback(async () => {
    const [countsRes, tagsRes, profileRes] = await Promise.all([
      api.get('/api/posts/category-counts'),
      api.get('/api/posts/trending-tags'),
      user ? api.get(`/api/profile/${user.id}`) : Promise.resolve({ data: { streak: 0 } }),
    ]);
    setCounts(countsRes.data.counts);
    setTrendingTags(tagsRes.data.tags);
    setStreak(profileRes.data.streak || 0);
  }, [user]);

  useEffect(() => {
    loadPosts();
    return () => { feedRequest.current += 1; };
  }, [loadPosts]);

  useEffect(() => { loadStories(); }, [loadStories]);
  useEffect(() => { loadMeta().catch(() => {}); }, [loadMeta]);

  const refreshAfterChange = useCallback((result) => {
    if (result?.story) setStories((current) => [...current.filter((s) => s.id !== result.story.id), result.story]);
    loadPosts().catch(() => {});
    loadStories().catch(() => {});
    loadMeta().catch(() => {});
  }, [loadPosts, loadStories, loadMeta]);

  const visiblePosts = useMemo(() => {
    let list = posts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        (p.authorName || '').toLowerCase().includes(q) ||
        (p.tag || '').toLowerCase().includes(q) ||
        (p.vibe || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [posts, searchQuery]);

  const storyGroups = useMemo(() => groupStoriesByAuthor(stories), [stories]);

  function openAuthor(authorId) {
    setModal(null);
    navigate(`/profile/${authorId}`);
  }

  function openTag(tag) {
    setModal(null);
    setTagFilter(tag);
    setCategory('all');
  }

  function openStoryViewer(authorId) {
    const group = storyGroups.find((g) => g.authorId === authorId);
    if (!group || !group.stories.length) return;
    let startIdx = group.stories.findIndex((s) => !s.viewedByMe);
    if (startIdx === -1) startIdx = 0;
    setModal({ type: 'viewStory', authorId, index: startIdx });
  }

  function advanceStoryViewer(dir) {
    const group = storyGroups.find((g) => g.authorId === modal.authorId);
    if (!group) { setModal(null); return; }
    const nextIndex = modal.index + dir;
    if (nextIndex < 0) return; // stay on first
    if (nextIndex >= group.stories.length) {
      const pos = storyGroups.findIndex((g) => g.authorId === modal.authorId);
      const nextGroup = dir > 0 ? storyGroups[pos + 1] : null;
      if (nextGroup) openStoryViewer(nextGroup.authorId);
      else setModal(null);
      return;
    }
    setModal({ ...modal, index: nextIndex });
  }

  const catLabel = category === 'all' ? 'this community' : category;

  return (
    <>
      <Header
        activeCategory={category}
        onCategoryChange={(c) => { setCategory(c); setTagFilter(null); }}
        counts={counts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        streak={streak}
      />
      <div className="wrap">
        <main className="layout">
          <section className="feed-col">
            <div className="feed-intro"><div><span className="house-eyebrow">A LITTLE PROGRESS, EVERY DAY</span><h1>Your daily chapter.</h1><p>Share a moment. Build a habit. Celebrate the work.</p></div><button className="house-enter-btn" type="button" onClick={() => navigate(`/profile/${user.id}/achievements`)}>My goals ↗</button></div>
            {storyError && <div className="inline-error" role="alert">Statuses couldn’t refresh. <button type="button" onClick={loadStories}>Retry</button></div>}
            <StoriesBar
              stories={stories}
              onOpenAuthor={openStoryViewer}
              onAddStory={() => setModal({ type: 'addStory' })}
            />
            <div className="card create-bar">
              <Avatar id={user?.id} name={user?.displayName} photoUrl={user?.photoUrl} size={36} />
              <button className="create-bar-btn" type="button" onClick={() => setModal({ type: 'create' })}>
                <CameraSmallIcon />Create post
              </button>
            </div>
            {tagFilter && (
              <div className="active-filter">
                Filtering by <span className="chip">#{tagFilter}<button aria-label="Clear tag filter" onClick={() => setTagFilter(null)}>✕</button></span>
              </div>
            )}
            <div className="feed-section-title"><h2>{searchQuery ? 'Search results' : category === 'all' ? 'Latest moments' : `${category[0].toUpperCase()}${category.slice(1)} moments`}</h2><span>{!loading && !feedError ? `${visiblePosts.length} posts` : ''}</span></div>
            {loading && <div className="feed-skeleton" role="status" aria-label="Loading posts">{[0,1,2,3,4,5].map((i) => <span key={i} />)}</div>}
            {feedError && <div className="card empty-state" role="alert"><h3>We couldn’t load your feed</h3><p>{feedError}</p><button className="house-enter-btn" type="button" onClick={loadPosts}>Try again</button></div>}
            {!loading && !feedError && (
              <PostGrid
                posts={visiblePosts}
                onOpen={(post) => setModal({ type: 'view', post })}
                onOpenAuthor={openAuthor}
                showAuthor
                emptyIcon="🎒"
                emptyTitle={searchQuery || tagFilter ? "No matching moments" : "Your next chapter starts here"}
                emptyText={searchQuery || tagFilter ? "Try another search or clear your filters." : `Share your first moment in ${catLabel} using Create post above.`}
              />
            )}
          </section>
          <aside className="side-col">
            <SideColumn streak={streak} trendingTags={trendingTags} counts={counts} onTagClick={openTag} />
            {user && <FollowListPanel authorId={user.id} />}
          </aside>
        </main>
      </div>

      {modal?.type === 'create' && (
        <ComposerModal kind="post" onClose={() => setModal(null)} onCreated={refreshAfterChange} />
      )}
      {modal?.type === 'addStory' && (
        <ComposerModal kind="story" onClose={() => setModal(null)} onCreated={refreshAfterChange} />
      )}
      {modal?.type === 'view' && (
        <PostDetailModal
          post={modal.post}
          onClose={() => setModal(null)}
          onChanged={refreshAfterChange}
          onOpenAuthor={openAuthor}
          onOpenTag={openTag}
        />
      )}
      {modal?.type === 'viewStory' && (
        <StoryViewerModal
          groups={storyGroups}
          authorId={modal.authorId}
          index={modal.index}
          onAdvance={advanceStoryViewer}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
