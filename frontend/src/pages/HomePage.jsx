import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import StoriesBar from '../components/StoriesBar';
import PostGrid from '../components/PostGrid';
import SideColumn from '../components/SideColumn';
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

  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pick up ?category=/?tag= set by links from other pages (e.g. a profile's
  // "back to feed" or a tag chip on someone else's post).
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    const urlTag = searchParams.get('tag');
    if (urlCategory && urlCategory !== category) setCategory(urlCategory);
    if (urlTag && urlTag !== tagFilter) setTagFilter(urlTag);
    if (urlCategory || urlTag) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [counts, setCounts] = useState({});
  const [trendingTags, setTrendingTags] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // modal is one of: null | {type:'create'} | {type:'addStory'} | {type:'view', post} | {type:'viewStory', authorId, index}
  const [modal, setModal] = useState(null);

  const loadPosts = useCallback(async () => {
    const params = {};
    if (category !== 'all') params.category = category;
    if (tagFilter) params.tag = tagFilter;
    const { data } = await api.get('/api/posts', { params });
    setPosts(data.posts);
  }, [category, tagFilter]);

  const loadStories = useCallback(async () => {
    const { data } = await api.get('/api/stories');
    setStories(data.stories);
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
    setLoading(true);
    loadPosts().finally(() => setLoading(false));
  }, [loadPosts]);

  useEffect(() => { loadStories(); }, [loadStories]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const refreshAfterChange = useCallback(() => {
    loadPosts();
    loadStories();
    loadMeta();
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
        onCompose={() => setModal({ type: 'create' })}
        streak={streak}
      />
      <div className="wrap">
        <main className="layout">
          <section className="feed-col">
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
            {!loading && (
              <PostGrid
                posts={visiblePosts}
                onOpen={(post) => setModal({ type: 'view', post })}
                emptyIcon="🎒"
                emptyTitle="Nothing here yet"
                emptyText={`Be the first to share a photo, video, or update about ${catLabel}.`}
              />
            )}
          </section>
          <aside className="side-col">
            <SideColumn streak={streak} trendingTags={trendingTags} counts={counts} onTagClick={openTag} />
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
