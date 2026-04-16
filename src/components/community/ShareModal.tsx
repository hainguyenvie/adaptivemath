import { useState } from 'react'
import { Button } from '../ui/Button'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            🌐 Chia sẻ lộ trình
          </h2>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-1.5 hover:bg-slate-200">
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Display name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tên hiển thị
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ví dụ: Minh Anh"
              maxLength={30}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          {/* Avatar */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Avatar
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-xl transition',
                    avatar === emoji
                      ? 'bg-brand-100 ring-2 ring-brand-500'
                      : 'bg-slate-100 hover:bg-slate-200',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Motivation */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Lời nhắn (tuỳ chọn)
            </label>
            <input
              type="text"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Ví dụ: Cố gắng đỗ THPT QG!"
              maxLength={200}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">
              {motivation.length}/200
            </p>
          </div>

          {/* Study tools */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Công cụ học tập (chọn nhiều)
            </label>
            <div className="flex flex-wrap gap-2">
              {STUDY_TOOL_OPTIONS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition',
                    studyTools.includes(tool)
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300',
                  )}
                >
                  {studyTools.includes(tool) ? '✓ ' : ''}
                  {tool}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t bg-white px-6 py-4">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
            Huỷ
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Đang chia sẻ…' : 'Chia sẻ →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
