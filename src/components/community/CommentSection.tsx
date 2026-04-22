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
    <div className="mt-5 border-t border-emerald-100 pt-5">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#003527]">
        <span className="material-symbols-outlined text-base text-emerald-600">chat_bubble</span>
        Bình luận ({comments.length})
      </h4>

      {/* Comment list */}
      {loading ? (
        <p className="text-xs font-medium text-[#404944]/60">Đang tải…</p>
      ) : comments.length === 0 ? (
        <p className="mb-3 text-xs font-medium text-[#404944]/60">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      ) : (
        <div className="mb-4 space-y-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className={cn(
                'flex items-start gap-3 rounded-2xl px-4 py-3 text-sm',
                c.device_id === deviceId
                  ? 'bg-emerald-50 ring-1 ring-emerald-200'
                  : 'bg-slate-50',
              )}
            >
              <span className="mt-0.5 text-lg">{c.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#003527]">{c.display_name}</span>
                  <span className="text-[10px] font-medium text-[#404944]/50">
                    {formatTimeAgo(c.created_at)}
                  </span>
                  {c.device_id === deviceId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto rounded-full p-0.5 text-[#404944]/40 transition hover:bg-rose-50 hover:text-rose-500"
                      title="Xoá bình luận"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-medium text-[#404944]">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Tên của bạn"
          maxLength={30}
          className="w-28 shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs font-medium text-[#003527] placeholder:text-[#404944]/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
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
          className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs font-medium text-[#003527] placeholder:text-[#404944]/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !newComment.trim()}
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-2xl px-4 py-2 text-xs font-black transition',
            submitting || !newComment.trim()
              ? 'bg-slate-200 text-slate-400'
              : 'bg-[#064e3b] text-[#b2f746] hover:bg-[#003527]',
          )}
        >
          {submitting ? (
            <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
          ) : (
            <>
              Gửi
              <span className="material-symbols-outlined text-sm">send</span>
            </>
          )}
        </button>
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
