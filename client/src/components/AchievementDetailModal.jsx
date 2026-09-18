import { useState } from 'react';
import { CAT_MAP } from '../lib/format';
import PostGrid from './PostGrid';
import PostDetailModal from './PostDetailModal';

// Shows the full gallery of posts behind one achievement (tag). Matches
// PostDetailModal's chrome (.modal-backdrop/.modal-box) but isn't built on
// it directly — this is a gallery of N posts, not one post's detail.
export default function AchievementDetailModal({ achievement, onClose, onOpenAuthor, onOpenTag }) {
  const [zoomedPost, setZoomedPost] = useState(null);
  const cat = CAT_MAP[achievement.category] || CAT_MAP.health;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box modal-box-gallery">
        <div className="modal-detail-pane">
          <div className="modal-detail-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="post-author">#{achievement.tag}</span>
              <div className="post-meta">
                <span className={`cat-label ${cat.id}`}>{cat.emoji} {cat.label}</span>
                <span>· {achievement.count} post{achievement.count === 1 ? '' : 's'}</span>
              </div>
            </div>
            <button className="modal-close-btn" type="button" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-detail-scroll">
            <PostGrid posts={achievement.posts} onOpen={setZoomedPost} emptyIcon="🖼️" emptyTitle="" emptyText="" />
          </div>
        </div>
      </div>
      {zoomedPost && (
        <PostDetailModal
          post={zoomedPost}
          onClose={() => setZoomedPost(null)}
          onChanged={() => {}}
          onOpenAuthor={(id) => { setZoomedPost(null); onClose(); onOpenAuthor(id); }}
          onOpenTag={(tag) => { setZoomedPost(null); onClose(); onOpenTag(tag); }}
        />
      )}
    </div>
  );
}
