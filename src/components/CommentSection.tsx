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
  reply_count?: number;
  admin_reply?: Comment | null;
  is_admin?: number;
}

import { COMMENT_CONFIG } from "../config";

interface CommentSectionProps {
  siteId: string;
  workerUrl?: string; // Optional, defaults to hardcoded
  turnstileSiteKey?: string; // Optional, defaults to hardcoded/env
}

// Modal Component for Replies
const RepliesModal: React.FC<{
  parentComment: Comment;
  onClose: () => void;
  workerUrl: string;
  siteId: string;
  turnstileSiteKey: string;
}> = ({ parentComment, onClose, workerUrl, siteId, turnstileSiteKey }) => {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastId, setLastId] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const loadReplies = async (reset = false) => {
    setLoading(true);
    try {
      const currentLastId = reset ? undefined : lastId;
      const url = `${workerUrl}/api/comments/${parentComment.id}/replies?limit=10${
        currentLastId ? `&last_id=${currentLastId}` : ""
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setReplies(data.replies);
        } else {
          setReplies((prev) => [...prev, ...data.replies]);
        }
        setLastId(data.lastId);
        setHasMore(data.hasMore);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReplies(true);
  }, [parentComment.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="bg-[#1a1a1a] w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl relative flex flex-col overflow-hidden animate-fadeIn border border-white/10">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
          <h3 className="font-bold text-lg text-white">Thread</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Pinned Parent Comment */}
          <div className="p-4 sm:p-6 bg-white/5 border-b border-white/10">
            <CommentItem
              comment={parentComment}
              workerUrl={workerUrl}
              siteId={siteId}
              turnstileSiteKey={turnstileSiteKey}
              onReplySuccess={() => loadReplies(true)} // Refresh replies if referenced
              onViewReplies={() => {}} // No-op, we are already viewing
              isPreview={true}
            />
          </div>

          {/* Replies List */}
          <div className="p-4 sm:p-6 space-y-6">
            {replies.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                workerUrl={workerUrl}
                siteId={siteId}
                turnstileSiteKey={turnstileSiteKey}
                onReplySuccess={() => loadReplies(true)}
                onViewReplies={() => {}}
                isPreview={true}
              />
            ))}

            {loading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}

            {!loading && hasMore && (
              <button
                onClick={() => loadReplies(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-blue-400 font-semibold rounded-xl transition-colors border border-dashed border-white/10"
              >
                Load more replies
              </button>
            )}
            
             {!loading && replies.length === 0 && (
                <div className="text-center text-gray-500 py-4 italic">No replies yet.</div>
             )}
          </div>
        </div>

        {/* Reply Box (Footer) */}
        <div className="p-4 border-t border-white/10 bg-[#1a1a1a] shrink-0">
          <CommentForm
            siteId={siteId}
            workerUrl={workerUrl}
            parentId={parentComment.id}
            onSuccess={() => loadReplies(true)}
            turnstileSiteKey={turnstileSiteKey}
            placeholder={`Reply to ${parentComment.author_name}...`}
          />
        </div>
      </div>
    </div>
  );
};

const CommentSection: React.FC<CommentSectionProps> = ({
  siteId,
  workerUrl = COMMENT_CONFIG.workerUrl,
  turnstileSiteKey = COMMENT_CONFIG.turnstileSiteKey,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [activeParent, setActiveParent] = useState<Comment | null>(null);

  // Fetch Comments
  const fetchComments = async () => {
    setLoading(true);
    try {
      const context_url = encodeURIComponent(window.location.origin + window.location.pathname);
      const res = await fetch(`${workerUrl}/api/comments?site_id=${siteId}&context_url=${context_url}`);
      if (res.ok) {
        const data = (await res.json()) as {
          comments: Comment[];
          total: number;
        };
        // The API now returns top-level comments and potentially pinned admin replies
        setComments(data.comments || []);
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
      </h2>

      {/* New Comment Form (Root) */}
      <CommentForm
        siteId={siteId}
        workerUrl={workerUrl}
        parentId={null}
        onSuccess={fetchComments}
        turnstileSiteKey={turnstileSiteKey}
        placeholder="Add a comment..."
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
              onViewReplies={(comment) => setActiveParent(comment)}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {activeParent && (
        <RepliesModal
          parentComment={activeParent}
          onClose={() => setActiveParent(null)}
          workerUrl={workerUrl}
          siteId={siteId}
          turnstileSiteKey={turnstileSiteKey}
        />
      )}

      <style>{`
                .highlight-comment {
                    animation: highlight 2s ease-out;
                }
                @keyframes highlight {
                    0% { background-color: rgba(59, 130, 246, 0.2); }
                    100% { background-color: transparent; }
                }
                /* Custom Scrollbar for Modal */
                .custom-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.2);
                  border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(255, 255, 255, 0.3);
                }
            `}</style>
    </div>
  );
};

// Single Comment Item
const CommentItem: React.FC<{
  comment: Comment;
  workerUrl: string;
  siteId: string;
  turnstileSiteKey: string;
  onReplySuccess: () => void;
  onViewReplies: (comment: Comment) => void;
  isPreview?: boolean;
}> = ({
  comment,
  workerUrl,
  siteId,
  turnstileSiteKey,
  onReplySuccess,
  onViewReplies,
  isPreview,
}) => {
  const [replying, setReplying] = useState(false);
  const avatarSrc = `${workerUrl}/api/avatar/${comment.avatar_id}`;

  return (
    <div id={`comment-${comment.id}`} className="group">
      <div className="flex gap-3 sm:gap-4">
        <div className="flex-shrink-0 pt-1">
          <img
            src={avatarSrc}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default.webp";
            }}
            alt={comment.author_name}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-white/10 shadow-lg object-cover bg-gray-800"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-[#1a1a1a] p-3 sm:p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-bold text-gray-200 text-sm">
                  {comment.author_name}
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {formatDistanceToNow(comment.created_at)} ago
                </span>
              </div>
              <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
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

            <div className="mt-3 sm:mt-4 flex items-center gap-4">
              {!isPreview && (
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
              )}
            </div>
          </div>

          {replying && (
            <div className="mt-4 animate-fadeIn px-2 sm:px-0">
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
                placeholder={`Reply to ${comment.author_name}...`}
              />
            </div>
          )}

          {/* Admin Reply Preview */}
          {comment.admin_reply && (
            <div className="mt-4 ml-4 sm:ml-8 relative">
              <div className="absolute left-[-20px] top-0 bottom-0 w-px bg-white/10 hidden sm:block"></div>
              <CommentItem
                comment={comment.admin_reply}
                workerUrl={workerUrl}
                siteId={siteId}
                turnstileSiteKey={turnstileSiteKey}
                onReplySuccess={onReplySuccess}
                onViewReplies={() => {}}
                isPreview={true}
              />
            </div>
          )}

          {/* View Remaining Replies Button */}
          {comment.reply_count &&
          comment.reply_count > (comment.admin_reply ? 1 : 0) &&
          !isPreview ? (
            <div className="mt-3 ml-4 sm:ml-8 pl-4 border-l-2 border-white/10">
              <button
                onClick={() => onViewReplies(comment)}
                className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                type="button"
              >
                View {comment.reply_count - (comment.admin_reply ? 1 : 0)} more
                replies
              </button>
            </div>
          ) : null}
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
  placeholder?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  siteId,
  workerUrl,
  parentId,
  onSuccess,
  turnstileSiteKey,
  autoFocus,
  placeholder = "What are your thoughts?"
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

  // Draft persistence key
  const draftKey = `comment_draft_${siteId}_${parentId || 'root'}`;

  const [content, setContent] = useState(() => {
    if (typeof window !== "undefined") {
        return localStorage.getItem(draftKey) || "";
    }
    return "";
  });
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Save draft to localStorage
  useEffect(() => {
      if (typeof window !== "undefined") {
          localStorage.setItem(draftKey, content);
      }
  }, [content, draftKey]);

  // Save to localStorage when name/email changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("comment_author_name", name);
      localStorage.setItem("comment_author_email", email);
    }
  }, [name, email]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (!isExpanded && e.target.value.length > 0) {
      setIsExpanded(true);
    }
    
    // Resize logic
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; 
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`; // Max height 200px
    }
  };

  const handleFocus = () => {
      setIsExpanded(true);
  };
  
  const handleCancel = () => {
      setIsExpanded(false);
      // We do NOT clear content per user request ("save draft")
      setError(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please verify you are human.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Use "clean" URL (origin + pathname) as per requirement
      const context_url = window.location.origin + window.location.pathname;

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
      if (typeof window !== "undefined") {
          localStorage.removeItem(draftKey);
      }
      setToken(null);
      setIsExpanded(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
      className={`bg-[#1a1a1a] rounded-2xl border transition-all duration-200 relative overflow-hidden
        ${isExpanded ? 'border-white/20 shadow-lg p-4' : 'border-white/10 p-2'}
      `}
    >
        <div className="relative">
        {!isExpanded ? (
          <div 
            onClick={() => {
                setIsExpanded(true);
                // setTimeout to ensure render cycle completes if needed, but autoFocus usually works
            }}
            className="h-[40px] px-3 py-2 text-sm flex items-center text-gray-200 cursor-text w-full transition-all"
          >
             {content ? (
                 <span className="truncate w-full block leading-normal">{content.replace(/\n/g, ' ')}</span>
             ) : (
                 <span className="text-gray-500 truncate w-full block leading-normal">{placeholder}</span>
             )}
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
            
            {/* Actions Bar & Inputs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pt-2 border-t border-white/5">
                
                {/* Left Side: Inputs (Desktop) / Top (Mobile) */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto flex-1 sm:mr-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full animate-fadeIn">
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none bg-black/20 text-gray-200 text-sm"
                            placeholder="Name"
                        />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none bg-black/20 text-gray-200 text-sm"
                            placeholder="Email"
                        />
                    </div>
                </div>

                {/* Right Side: Turnstile & Buttons (Desktop) / Bottom (Mobile) */}
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 shrink-0">
                     <div className="transform origin-center sm:origin-right scale-90 sm:scale-100">
                         <Turnstile
                            siteKey={turnstileSiteKey}
                            onSuccess={(t) => setToken(t)}
                            onExpire={() => setToken(null)}
                            options={{ theme: 'dark' }}
                        /> 
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 rounded-full font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !token}
                            className={`px-6 py-2 rounded-full font-bold text-white transition-all transform text-sm whitespace-nowrap
                                ${submitting || !token
                                    ? "bg-white/10 cursor-not-allowed text-gray-500"
                                    : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                                }`}
                        >
                            {submitting ? "Posting..." : "Comment"}
                        </button>
                    </div>
                </div>
            </div>
            
            {error && (
                <div className="text-red-400 text-xs mt-2 flex items-center gap-1">
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </div>
            )}
        </div>
      )}
    </form>
  );
};

export default CommentSection;
