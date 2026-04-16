import { useCallback, useEffect, useState } from 'react'
import { getComments, postComment, deleteComment } from '../../lib/communityApi'
import { getDeviceId } from '../../lib/supabase'
import type { Comment } from '../../types/community'
import { cn } from '../../lib/cn'

interface CommentSectionProps {
  pathId: string
}

export function CommentSection({ pathId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('kntt.commentName') ?? '',
  )
  const [submitting, setSubmitting] = useState(false)
  const deviceId = getDeviceId()

  const fetchComments = useCallback(async () => {
    setLoading(true)
    const data = await getComments(pathId)
    setComments(data)
    setLoading(false)
  }, [pathId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async () => {
    if (!newComment.trim()) return
    setSubmitting(true)

    // Remember name for next time.
    if (displayName.trim()) {
      localStorage.setItem('kntt.commentName', displayName.trim())
    }

    const result = await postComment(
      pathId,
      newComment,
      displayName.trim() || 'Học sinh',
      '💬',
    )

    if (result.success && result.comment) {
      setComments((prev) => [...prev, result.comment!])
      setNewComment('')
    }
    setSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    const ok = await deleteComment(commentId)
    if (ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-800">
        💬 Bình luận ({comments.length})
      </h4>

      {/* Comment list */}
      {loading ? (
        <p className="text-xs text-slate-400">Đang tải…</p>
      ) : comments.length === 0 ? (
        <p className="mb-3 text-xs text-slate-400">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      ) : (
        <div className="mb-3 space-y-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className={cn(
                'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
                c.device_id === deviceId
                  ? 'bg-brand-50'
                  : 'bg-slate-50',
              )}
            >
              <span className="mt-0.5 text-base">{c.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    {c.display_name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatTimeAgo(c.created_at)}
                  </span>
                  {c.device_id === deviceId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto text-[10px] text-slate-400 hover:text-rose-500"
                      title="Xoá bình luận"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-700">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment form */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tên của bạn"
            maxLength={30}
            className="w-28 shrink-0 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
          />
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !submitting) handleSubmit()
            }}
            placeholder="Viết bình luận…"
            maxLength={500}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className={cn(
              'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition',
              submitting || !newComment.trim()
                ? 'bg-slate-300'
                : 'bg-brand-600 hover:bg-brand-700',
            )}
          >
            {submitting ? '…' : 'Gửi'}
          </button>
        </div>
        <p className="text-right text-[10px] text-slate-400">
          {newComment.length}/500
        </p>
      </div>
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'vừa xong'
  if (minutes < 60) return `${minutes}p trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h trước`
  const days = Math.floor(hours / 24)
  return `${days}d trước`
}
