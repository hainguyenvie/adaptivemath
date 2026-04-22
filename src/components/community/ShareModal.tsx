import { useState } from 'react'
import { AVATAR_OPTIONS, STUDY_TOOL_OPTIONS, type ShareFormData } from '../../types/community'
import { cn } from '../../lib/cn'

interface ShareModalProps {
  onSubmit: (data: ShareFormData) => Promise<void>
  onClose: () => void
  loading: boolean
}

export function ShareModal({ onSubmit, onClose, loading }: ShareModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState('📚')
  const [motivation, setMotivation] = useState('')
  const [studyTools, setStudyTools] = useState<string[]>([])

  const toggleTool = (tool: string) => {
    setStudyTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    )
  }

  const handleSubmit = async () => {
    await onSubmit({ displayName, avatar, motivation, studyTools })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#002117]/50 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white shadow-2xl shadow-[#002117]/20">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] border-b border-emerald-100 bg-white px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#064e3b]">
              <span className="material-symbols-outlined text-base text-[#b2f746]">share</span>
            </div>
            <h2 className="text-lg font-extrabold text-[#003527]">Chia sẻ lộ trình</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#404944] transition hover:bg-emerald-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6 px-7 py-6">
          {/* Display name */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#003527]">
              Tên hiển thị
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ví dụ: Minh Anh"
              maxLength={30}
              className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-2.5 text-sm font-medium text-[#003527] placeholder:text-[#404944]/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </div>

          {/* Avatar */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#003527]">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full text-2xl transition',
                    avatar === emoji
                      ? 'bg-[#b2f746] ring-2 ring-[#064e3b]'
                      : 'bg-emerald-50 hover:bg-emerald-100',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Motivation */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#003527]">
              Lời nhắn <span className="font-normal text-[#404944]/60">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Ví dụ: Cố gắng đỗ THPT QG!"
              maxLength={200}
              className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-2.5 text-sm font-medium text-[#003527] placeholder:text-[#404944]/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
            <p className="mt-1 text-right text-xs text-[#404944]/50">{motivation.length}/200</p>
          </div>

          {/* Study tools */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#003527]">
              Công cụ học tập{' '}
              <span className="font-normal text-[#404944]/60">(chọn nhiều)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {STUDY_TOOL_OPTIONS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-bold transition',
                    studyTools.includes(tool)
                      ? 'border-[#064e3b] bg-[#064e3b] text-[#b2f746]'
                      : 'border-emerald-200 bg-emerald-50 text-[#003527] hover:border-emerald-400',
                  )}
                >
                  {studyTools.includes(tool) && (
                    <span className="mr-1">✓</span>
                  )}
                  {tool}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 rounded-b-[2rem] border-t border-emerald-100 bg-white px-7 py-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-emerald-200 py-2.5 text-sm font-bold text-[#003527] transition hover:bg-emerald-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#064e3b] py-2.5 text-sm font-black text-[#b2f746] transition hover:bg-[#003527] disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-base">autorenew</span>
                Đang chia sẻ…
              </>
            ) : (
              <>
                Chia sẻ
                <span className="material-symbols-outlined text-base">trending_flat</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
