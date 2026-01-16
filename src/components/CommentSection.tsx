import React, { useState, useEffect } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { formatDistanceToNow } from "date-fns";

// Types
interface Comment {
  id: number;
  site_id: string;
  parent_id: number | null;
  content: string;
  author_name: string;
  avatar_id: string;
  created_at: number;
  children?: Comment[];
}

interface CommentSectionProps {
  siteId: string;
  workerUrl?: string; // Optional, defaults to hardcoded
  turnstileSiteKey?: string; // Optional, defaults to hardcoded/env
}

const DEFAULT_WORKER_URL = "https://serverless-comment-backend.arasaka.ltd";
// Use provided key or fallback to a dummy key for dev/demo if not in env
const DEFAULT_TURNSTILE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAACMtIrpVNiBgyN4Y";

const CommentSection: React.FC<CommentSectionProps> = ({
  siteId,
  workerUrl = DEFAULT_WORKER_URL,
  turnstileSiteKey = DEFAULT_TURNSTILE_KEY,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Fetch Comments
  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${workerUrl}/api/comments?site_id=${siteId}`);
      if (res.ok) {
        const data = (await res.json()) as { comments: Comment[] };
        const flat = data.comments || [];
        const nested = buildCommentTree(flat);
        setComments(nested);
      }
    } catch (err) {
      console.error("Failed to load comments", err);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [siteId]);

  // Handle Deep Linking / Anchor Scrolling
  useEffect(() => {
    if (initialLoadDone && comments.length > 0 && window.location.hash) {
      const hash = window.location.hash;
      if (hash.startsWith("#comment-")) {
        const el = document.getElementById(hash.substring(1));
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("highlight-comment");
          }, 500); // Increased timeout slightly for reliable scrolling
        }
      }
    }
  }, [initialLoadDone, comments]);

  return (
    <div className="border-t border-white/10 mt-16 pt-12">
      <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
        Discussion
        <span className="text-sm font-normal text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
          {comments.reduce((acc, c) => acc + 1 + (c.children?.length || 0), 0)}
          {/* Note: This count is simplified, recursive count would be better but this is okay for 2-level nesting */}
        </span>
      </h2>

      {/* New Comment Form (Root) */}
      <CommentForm
        siteId={siteId}
        workerUrl={workerUrl}
        parentId={null}
        onSuccess={fetchComments}
        turnstileSiteKey={turnstileSiteKey}
      />

      {/* Comment List */}
      <div className="mt-12 space-y-8">
        {loading && !initialLoadDone ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 border-dashed">
            <p className="text-gray-400 text-lg">No comments yet.</p>
            <p className="text-gray-500 text-sm mt-1">
              Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              workerUrl={workerUrl}
              siteId={siteId}
              turnstileSiteKey={turnstileSiteKey}
              onReplySuccess={fetchComments}
            />
          ))
        )}
      </div>
      <style>{`
                .highlight-comment {
                    animation: highlight 2s ease-out;
                }
                @keyframes highlight {
                    0% { background-color: rgba(59, 130, 246, 0.2); }
                    100% { background-color: transparent; }
                }
            `}</style>
    </div>
  );
};

// Helper to build tree
function buildCommentTree(flat: Comment[]): Comment[] {
  const map = new Map<number, Comment>();
  const roots: Comment[] = [];
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  flat.forEach((c) => {
    const node = map.get(c.id);
    if (node) {
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }
  });
  return roots;
}

// Single Comment Item
const CommentItem: React.FC<{
  comment: Comment;
  workerUrl: string;
  siteId: string;
  turnstileSiteKey: string;
  onReplySuccess: () => void;
}> = ({ comment, workerUrl, siteId, turnstileSiteKey, onReplySuccess }) => {
  const [replying, setReplying] = useState(false);
  const avatarSrc = `${workerUrl}/api/avatar/${comment.avatar_id}`;

  return (
    <div id={`comment-${comment.id}`} className="group">
      <div className="flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <img
            src={avatarSrc}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default.webp";
            }} // Fallback image?
            // Using a generic placeholder if default.webp doesn't exist might be safer,
            // but sticking to user code logic, maybe just hide or use a styled div.
            // Let's stick to the code logic but add a generic fallback if needed.
            alt={comment.author_name}
            className="w-10 h-10 rounded-full ring-2 ring-white/10 shadow-lg object-cover bg-gray-800"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-200 text-sm">
                  {comment.author_name}
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {formatDistanceToNow(comment.created_at)} ago
                </span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={`#comment-${comment.id}`}
                  className="text-gray-500 hover:text-blue-400 text-xs transition-colors"
                >
                  #{comment.id}
                </a>
              </div>
            </div>

            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
              {comment.content}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => setReplying(!replying)}
                className="text-xs font-semibold text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {replying ? "Cancel" : "Reply"}
              </button>
            </div>
          </div>

          {replying && (
            <div className="mt-4 animate-fadeIn">
              <CommentForm
                siteId={siteId}
                workerUrl={workerUrl}
                parentId={comment.id}
                onSuccess={() => {
                  setReplying(false);
                  onReplySuccess();
                }}
                turnstileSiteKey={turnstileSiteKey}
                autoFocus
              />
            </div>
          )}

          {/* Nested Children */}
          {comment.children && comment.children.length > 0 && (
            <div className="mt-6 space-y-6 ml-4 sm:ml-6 relative border-l border-white/10 pl-4 sm:pl-6">
              {comment.children.map((child) => (
                <CommentItem
                  key={child.id}
                  comment={child}
                  workerUrl={workerUrl}
                  siteId={siteId}
                  turnstileSiteKey={turnstileSiteKey}
                  onReplySuccess={onReplySuccess}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Form Component
interface CommentFormProps {
  siteId: string;
  workerUrl: string;
  parentId: number | null;
  onSuccess: () => void;
  turnstileSiteKey: string;
  autoFocus?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
  siteId,
  workerUrl,
  parentId,
  onSuccess,
  turnstileSiteKey,
  autoFocus,
}) => {
  // Initialize state from localStorage if available
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined")
      return localStorage.getItem("comment_author_name") || "";
    return "";
  });
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined")
      return localStorage.getItem("comment_author_email") || "";
    return "";
  });

  const [content, setContent] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save to localStorage when name/email changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("comment_author_name", name);
      localStorage.setItem("comment_author_email", email);
    }
  }, [name, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please verify you are human.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const context_url = window.location.href;

      const res = await fetch(`${workerUrl}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          parent_id: parentId,
          author_name: name,
          email,
          content,
          turnstile_token: token,
          context_url,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error: string };
        throw new Error(errData.error || "Failed to submit");
      }

      setContent("");
      setToken(null);
      // Don't clear name/email as we want to keep them for next time
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 relative overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-600 bg-black/20 text-gray-200"
            placeholder="Your name"
            autoFocus={autoFocus}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-600 bg-black/20 text-gray-200"
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Comment
        </label>
        <textarea
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all resize-y placeholder:text-gray-600 bg-black/20 text-gray-200"
          placeholder="What are your thoughts?"
        />
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20 flex items-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="transform origin-left scale-[0.85] sm:scale-100">
                    <Turnstile
                        siteKey={turnstileSiteKey}
                        onSuccess={(t) => setToken(t)}
                        onExpire={() => setToken(null)}
                        options={{ theme: 'dark' }}
                    /> </div>

        <button
          type="submit"
          disabled={submitting || !token}
          className={`w-full sm:w-auto px-8 py-2.5 rounded-lg font-bold text-white transition-all transform
                        ${
                          submitting || !token
                            ? "bg-gray-700 cursor-not-allowed text-gray-400"
                            : "bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-500/20"
                        }`}
        >
          {submitting ? (
            <span className="flex items-center gap-2 justify-center">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Posting...
            </span>
          ) : (
            "Post Comment"
          )}
        </button>
      </div>
    </form>
  );
};

export default CommentSection;
