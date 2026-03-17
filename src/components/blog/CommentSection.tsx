import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Reply, AlertCircle } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { formatDistanceToNow } from "date-fns";
import { scrollLock } from "../../utils/scroll-lock";
import { COMMENT_CONFIG } from "../../config";

// Types
interface Comment {
  id: string;
  parent_id: string | null;
  content: string;
  author_name: string;
  created_at: number;
  reply_count?: number;
  parent_comment?: { name: string; content: string } | null;
}

interface CommentSectionProps {
  siteId: string;
  workerUrl?: string;
  turnstileSiteKey?: string;
}

// Portal Component for SSR safety
const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  return mounted ? createPortal(children, document.body) : null;
};

// Avatar with fallback
const Avatar: React.FC<{ commentId: string; name: string }> = ({ commentId, name }) => (
  <img
    src={`/api/avatar?id=${commentId}`}
    alt={name}
    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-white/10 shadow-lg object-cover bg-gray-800"
    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/default.webp'; }}
  />
);

// Thread Modal
const RepliesModal: React.FC<{
  parentComment: Comment;
  allComments: Comment[];
  onClose: () => void;
  siteId: string;
  turnstileSiteKey: string;
  highlightCommentId?: string;
}> = ({ parentComment, allComments, onClose, siteId, turnstileSiteKey, highlightCommentId }) => {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadReplies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?path=${encodeURIComponent(window.location.pathname)}`);
      if (res.ok) {
        const data = await res.json();
        const all: Comment[] = data.comments || [];
        // Collect all descendants of parentComment (BFS)
        const descendantIds = new Set<string>();
        const queue = [parentComment.id];
        while (queue.length) {
          const pid = queue.shift()!;
          for (const c of all) {
            if (c.parent_id === pid) { descendantIds.add(c.id); queue.push(c.id); }
          }
        }
        // Keep insertion order (API returns ASC)
        setReplies(all.filter(c => descendantIds.has(c.id)));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReplies(); }, [parentComment.id]);

  // Scroll to highlighted comment after load
  useEffect(() => {
    if (!highlightCommentId || loading || replies.length === 0) return;
    const el = document.getElementById(`reply-${highlightCommentId}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-comment');
      }, 100);
    }
  }, [loading, replies, highlightCommentId]);

  const scrollToReply = (id: string) => {
    const el = document.getElementById(`reply-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-comment');
      setTimeout(() => el.classList.remove('highlight-comment'), 2000);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <div className="bg-[#1a1a1a] w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl relative flex flex-col overflow-hidden animate-fadeIn border border-white/10">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
            <h3 className="font-bold text-lg text-white">Thread</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Pinned Parent */}
            <div className="p-4 sm:p-6 bg-white/5 border-b border-white/10">
              <CommentItem
                comment={parentComment}
                isInThread={true}
                onReply={() => { setReplyingTo(null); }}
                onScrollTo={scrollToReply}
              />
            </div>

            {/* Replies */}
            <div className="p-4 sm:p-6 space-y-6">
              {replies.map((r) => (
                <div key={r.id} id={`reply-${r.id}`} className="group">
                  <CommentItem
                    comment={r}
                    isInThread={true}
                    onReply={() => setReplyingTo(r)}
                    onScrollTo={scrollToReply}
                  />
                </div>
              ))}
              {loading && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                </div>
              )}
              {!loading && replies.length === 0 && (
                <div className="text-center text-gray-500 py-4 italic">No replies yet.</div>
              )}
            </div>
          </div>

          {/* Reply Box */}
          <div className="p-4 border-t border-white/10 bg-[#1a1a1a] shrink-0">
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2">
                <span>Replying to <span className="text-blue-400 font-semibold">{replyingTo.author_name}</span></span>
                <button onClick={() => setReplyingTo(null)} className="hover:text-white ml-2"><X className="w-3 h-3" /></button>
              </div>
            )}
            <CommentForm
              siteId={siteId}
              parentId={replyingTo ? replyingTo.id : parentComment.id}
              onSuccess={() => { setReplyingTo(null); loadReplies(); }}
              turnstileSiteKey={turnstileSiteKey}
              placeholder={replyingTo ? `Reply to ${replyingTo.author_name}...` : `Reply to ${parentComment.author_name}...`}
            />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

const CommentSection: React.FC<CommentSectionProps> = ({
  siteId,
  workerUrl = COMMENT_CONFIG.workerUrl,
  turnstileSiteKey = COMMENT_CONFIG.turnstileSiteKey,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [activeParent, setActiveParent] = useState<Comment | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | undefined>(undefined);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?path=${encodeURIComponent(window.location.pathname)}`);
      if (res.ok) {
        const data = await res.json();
        const all: Comment[] = data.comments || [];
        setAllComments(all);
        const roots = all.filter(c => !c.parent_id).map(root => ({
          ...root,
          reply_count: all.filter(c => c.parent_id === root.id).length,
        }));
        setComments(roots);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); setInitialLoadDone(true); }
  };

  useEffect(() => { fetchComments(); }, [siteId]);

  useEffect(() => {
    if (activeParent) scrollLock.lock();
    else scrollLock.unlock(300);
    return () => scrollLock.clear();
  }, [activeParent !== null]);

  // Deep link handling
  useEffect(() => {
    const handleDeepLink = async () => {
      if (!window.location.hash?.startsWith("#comment-")) return;
      const commentId = window.location.hash.substring(9);
      if (!commentId) return;

      const el = document.getElementById(`comment-${commentId}`);
      if (el) {
        setTimeout(() => { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("highlight-comment"); }, 500);
        return;
      }

      if (initialLoadDone) {
        try {
          const res = await fetch(`/api/comments?path=${encodeURIComponent(window.location.pathname)}`);
          if (res.ok) {
            const data = await res.json();
            const all: Comment[] = data.comments || [];
            const target = all.find(c => c.id === commentId);
            if (target?.parent_id) {
              const root = all.find(c => c.id === target.parent_id);
              if (root) { setHighlightedCommentId(commentId); setActiveParent(root); }
            } else if (target) {
              setHighlightedCommentId(commentId); setActiveParent(target);
            }
          }
        } catch (e) { console.error(e); }
      }
    };
    handleDeepLink();
  }, [initialLoadDone, comments]);

  return (
    <div className="border-t border-white/10 mt-16 pt-12">
      <h2 className="text-2xl font-bold text-white mb-8">Discussion</h2>

      <CommentForm
        siteId={siteId}
        parentId={null}
        onSuccess={fetchComments}
        turnstileSiteKey={turnstileSiteKey}
        placeholder="Add a comment..."
      />

      <div className="mt-12 space-y-8">
        {loading && !initialLoadDone ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 border-dashed">
            <p className="text-gray-400 text-lg">No comments yet.</p>
            <p className="text-gray-500 text-sm mt-1">Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} id={`comment-${c.id}`} className="group">
              <CommentItem
                comment={c}
                isInThread={false}
                onReply={() => setActiveParent(c)}
                onScrollTo={() => {}}
                replyCount={c.reply_count}
                onViewThread={() => setActiveParent(c)}
              />
            </div>
          ))
        )}
      </div>

      {activeParent && (
        <RepliesModal
          parentComment={activeParent}
          allComments={allComments}
          onClose={() => { setActiveParent(null); setHighlightedCommentId(undefined); }}
          siteId={siteId}
          turnstileSiteKey={turnstileSiteKey}
          highlightCommentId={highlightedCommentId}
        />
      )}

      <style>{`
        .highlight-comment { animation: highlight 2s ease-out; }
        @keyframes highlight {
          0% { background-color: rgba(59,130,246,0.2); }
          100% { background-color: transparent; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
};

// Single Comment Item (display only, no form)
const CommentItem: React.FC<{
  comment: Comment;
  isInThread: boolean;
  onReply: () => void;
  onScrollTo: (id: string) => void;
  replyCount?: number;
  onViewThread?: () => void;
}> = ({ comment, isInThread, onReply, onScrollTo, replyCount, onViewThread }) => {
  const scrollToComment = (id: string) => {
    if (isInThread) { onScrollTo(id); return; }
    const el = document.getElementById(`comment-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-comment');
      setTimeout(() => el.classList.remove('highlight-comment'), 2000);
    }
  };

  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex-shrink-0 pt-1">
        <Avatar commentId={comment.id} name={comment.author_name} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#1a1a1a] p-3 sm:p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-bold text-gray-200 text-sm">{comment.author_name}</span>
              <span className="text-xs font-medium text-gray-500">{formatDistanceToNow(comment.created_at)} ago</span>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#comment-${comment.id}`)}
              title="Copy link"
              className="text-gray-500 hover:text-blue-400 text-xs transition-colors opacity-0 group-hover:opacity-100"
            >
              #{comment.id.slice(0, 8)}
            </button>
          </div>

          {/* Quote block: only for nested replies (parent_comment set by API) */}
          {comment.parent_comment && (
            <div
              onClick={() => comment.parent_id && scrollToComment(comment.parent_id)}
              className="mb-3 p-3 bg-white/5 border-l-2 border-blue-500 rounded-r-lg cursor-pointer hover:bg-white/10 transition-colors"
            >
              <div className="text-xs font-bold text-blue-400 mb-1">Replying to {comment.parent_comment.name}</div>
              <div className="text-xs text-gray-400 line-clamp-2 italic">"{comment.parent_comment.content}"</div>
            </div>
          )}

          <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">{comment.content}</div>

          <div className="mt-3 sm:mt-4 flex items-center gap-4">
            <button
              onClick={onReply}
              className="text-xs font-semibold text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
          </div>
        </div>

        {/* View Thread button (only on root list) */}
        {!isInThread && replyCount && replyCount > 0 ? (
          <div className="mt-3 ml-4 sm:ml-8 pl-4 border-l-2 border-white/10">
            <button
              onClick={onViewThread}
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              type="button"
            >
              View Thread ({replyCount} {replyCount === 1 ? 'reply' : 'replies'})
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// Form Component
const CommentForm: React.FC<{
  siteId: string;
  parentId: string | null;
  onSuccess: () => void;
  turnstileSiteKey: string;
  autoFocus?: boolean;
  placeholder?: string;
}> = ({ siteId, parentId, onSuccess, turnstileSiteKey, autoFocus, placeholder = "What are your thoughts?" }) => {
  const [name, setName] = useState(() => typeof window !== "undefined" ? localStorage.getItem("comment_author_name") || "" : "");
  const [email, setEmail] = useState(() => typeof window !== "undefined" ? localStorage.getItem("comment_author_email") || "" : "");
  const draftKey = `comment_draft_${siteId}_${parentId || 'root'}`;
  const [content, setContent] = useState(() => typeof window !== "undefined" ? localStorage.getItem(draftKey) || "" : "");
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!!autoFocus || !!content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (autoFocus) setIsExpanded(true); }, [autoFocus]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(draftKey, content); }, [content, draftKey]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("comment_author_name", name);
      localStorage.setItem("comment_author_email", email);
    }
  }, [name, email]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError("Please verify you are human."); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, content, path: window.location.pathname, parent_id: parentId, turnstileToken: token }),
      });
      if (!res.ok) { const d = await res.json() as { error: string }; throw new Error(d.error || "Failed to submit"); }
      setContent(""); if (typeof window !== "undefined") localStorage.removeItem(draftKey);
      setToken(null); setIsExpanded(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      onSuccess();
    } catch (err: any) { setError(err.message || "Error occurred"); }
    finally { setSubmitting(false); }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-[#1a1a1a] rounded-2xl border transition-all duration-200 relative overflow-hidden ${isExpanded ? 'border-white/20 shadow-lg p-4' : 'border-white/10 p-2'}`}
    >
      <div className="relative">
        {!isExpanded ? (
          <div
            onClick={() => setIsExpanded(true)}
            tabIndex={0}
            className="h-[40px] px-3 py-2 text-sm flex items-center text-gray-200 cursor-text w-full outline-none"
          >
            {content
              ? <span className="truncate w-full block leading-normal">{content.replace(/\n/g, ' ')}</span>
              : <span className="text-gray-500 truncate w-full block leading-normal">{placeholder}</span>
            }
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            required
            value={content}
            onChange={handleInput}
            rows={3}
            className="w-full bg-transparent text-gray-200 outline-none resize-none placeholder:text-gray-500 min-h-[80px] text-sm"
            placeholder={placeholder}
            autoFocus
            style={{ maxHeight: '200px' }}
          />
        )}
      </div>

      {isExpanded && (
        <div className="animate-fadeIn mt-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pt-2 border-t border-white/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full sm:flex-1 sm:mr-4">
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none bg-black/20 text-gray-200 text-sm"
                placeholder="Name"
              />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none bg-black/20 text-gray-200 text-sm"
                placeholder="Email"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 shrink-0">
              <div className="transform origin-center sm:origin-right scale-90 sm:scale-100">
                <Turnstile siteKey={turnstileSiteKey} onSuccess={(t) => setToken(t)} onExpire={() => setToken(null)} options={{ theme: 'dark' }} />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button type="button" onClick={() => { setIsExpanded(false); setError(null); }} className="px-4 py-2 rounded-full font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm">
                  Cancel
                </button>
                <button
                  type="submit" disabled={submitting || !token}
                  className={`px-6 py-2 rounded-full font-bold text-white transition-all text-sm whitespace-nowrap ${submitting || !token ? "bg-white/10 cursor-not-allowed text-gray-500" : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"}`}
                >
                  {submitting ? "Posting..." : "Comment"}
                </button>
              </div>
            </div>
          </div>
          {error && (
            <div className="text-red-400 text-xs mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{error}
            </div>
          )}
        </div>
      )}
    </form>
  );
};

export default CommentSection;
