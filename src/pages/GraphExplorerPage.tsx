import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../components/layout/AppSidebar'
import { GraphCanvas } from '../components/graph-rag/GraphCanvas'
import { EntityDetailPanel } from '../components/graph-rag/EntityDetailPanel'
import { NarrativeCard } from '../components/graph-rag/NarrativeCard'
import { EntityChip } from '../components/graph-rag/EntityChip'
import { loadProfile } from '../lib/storage'
import { loadLastDiagnostic } from '../lib/diagnosticStorage'
import { loadLearnerState } from '../lib/learnerStorage'
import { QUESTION_BANK } from '../lib/questionBank'
import { TOPICS } from '../data/topics'
import { buildKnowledgeProfile } from '../lib/profiling'
import { buildKnowledgeTree } from '../lib/treeStability'
import {
  buildKnowledgeGraph,
  findSimilarPeers,
  retrieveContext,
  summarizeGraph,
} from '../lib/graphRag'
import {
  buildPeerComparison,
  buildStudentOverview,
  buildTopicNarrative,
} from '../lib/narrativeGen'
import type { Entity, Narrative } from '../types/graphRag'
import { ENTITY_META } from '../types/graphRag'
import { cn } from '../lib/cn'

const EMPTY_FILTER_LABEL = 'Tất cả loại'
const ENTITY_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: EMPTY_FILTER_LABEL },
  { value: 'topic', label: 'Chủ đề' },
  { value: 'peer', label: 'Bạn cùng lớp' },
  { value: 'teacher', label: 'Giáo viên' },
  { value: 'parent', label: 'Phụ huynh' },
  { value: 'feedback', label: 'Phản hồi' },
  { value: 'activity', label: 'Hoạt động' },
  { value: 'error', label: 'Lỗi sai' },
  { value: 'session', label: 'Phiên học' },
  { value: 'skill', label: 'Kỹ năng nền' },
]

export function GraphExplorerPage() {
  const navigate = useNavigate()
  const [profile] = useState(() => loadProfile())
  const [diagnostic] = useState(() => loadLastDiagnostic())
  const [learner] = useState(() => loadLearnerState())

  // Block view if no profile / diagnostic — they're required to seed the
  // graph with the student's own state.
  const hasRequired = profile !== null && diagnostic !== null

  const graph = useMemo(() => {
    if (!profile || !diagnostic) return null
    const pool = QUESTION_BANK.questions.filter((q) => q.grade === diagnostic.grade)
    const knowledge = buildKnowledgeProfile(diagnostic, profile, pool, TOPICS)
    const tree = buildKnowledgeTree(knowledge, learner)
    return buildKnowledgeGraph({ profile, knowledge, learner, tree })
  }, [profile, diagnostic, learner])

  const [explicitFocusId, setFocusId] = useState<string | null>(null)
  const [maxHops, setMaxHops] = useState(2)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Default focus = self until the user picks something else.
  const focusId = explicitFocusId ?? graph?.selfId ?? null

  if (!hasRequired) {
    return (
      <div className="bg-bioluminescent min-h-screen overflow-x-hidden">
        <AppSidebar />
        <main className="lg:ml-72">
          <div className="mx-auto max-w-3xl space-y-6 p-8 pt-32 text-center">
            <p className="text-5xl">🧭</p>
            <h1 className="text-3xl font-extrabold text-[#003527]">
              Cần dữ liệu để dựng đồ thị
            </h1>
            <p className="text-base text-[#404944]">
              GraphRAG cần hồ sơ học sinh và bài chẩn đoán đầu vào để xây
              entity graph cá nhân. Hãy hoàn thành các bước này trước nhé.
            </p>
            <button
              type="button"
              onClick={() => navigate(profile ? '/diagnostic' : '/onboarding')}
              className="rounded-full bg-[#b2f746] px-8 py-4 font-black text-[#496f00] shadow-lg"
            >
              {profile ? 'Làm bài chẩn đoán' : 'Bắt đầu onboarding'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!graph) return null

  const summary = summarizeGraph(graph)
  const focusEntity = focusId ? graph.nodes.get(focusId) ?? null : null
  const subgraph = focusEntity
    ? retrieveContext(graph, focusEntity.id, { maxHops, topK: 22 })
    : null

  // Build the narrative for the focus entity. For students show overview,
  // for peers show comparison, for topics show topic narrative; everything
  // else falls back to the parent topic narrative if applicable.
  let narrative: Narrative | null = null
  if (focusEntity) {
    if (focusEntity.type === 'student') {
      narrative = buildStudentOverview(graph)
    } else if (focusEntity.type === 'peer') {
      narrative = buildPeerComparison(graph, focusEntity.id)
    } else if (focusEntity.type === 'topic') {
      narrative = buildTopicNarrative(
        graph,
        focusEntity.id.replace('topic:', ''),
      )
    }
  }

  // Searchable filtered node list — for the left rail.
  const searchTerm = searchQuery.trim().toLowerCase()
  const filteredNodes: Entity[] = []
  for (const node of graph.nodes.values()) {
    if (typeFilter !== 'all' && node.type !== typeFilter) continue
    if (
      searchTerm &&
      !node.label.toLowerCase().includes(searchTerm) &&
      !(node.subtitle ?? '').toLowerCase().includes(searchTerm)
    ) {
      continue
    }
    filteredNodes.push(node)
  }
  filteredNodes.sort((a, b) => {
    const ta = ENTITY_FILTER_OPTIONS.findIndex((o) => o.value === a.type)
    const tb = ENTITY_FILTER_OPTIONS.findIndex((o) => o.value === b.type)
    if (ta !== tb) return ta - tb
    return a.label.localeCompare(b.label, 'vi')
  })

  const similarPeers = findSimilarPeers(graph, 6)

  return (
    <div className="bg-bioluminescent min-h-screen overflow-x-hidden">
      <AppSidebar />

      <main className="lg:ml-72">
        {/* Top nav */}
        <header className="fixed left-1/2 top-3 z-40 flex w-[calc(100vw-1rem)] max-w-6xl -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-white/50 bg-white/95 px-5 py-3 shadow-[0_12px_40px_rgba(0,53,39,0.08)] ring-1 ring-white/60 sm:top-4 sm:w-[calc(100vw-2rem)] sm:px-6 lg:left-[calc(18rem+(100vw-18rem)/2)] lg:w-[calc(100vw-20rem)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#064e3b]">
              <span className="material-symbols-outlined text-[#b2f746]">hub</span>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#003527]">
                GraphRAG Explorer
              </h2>
              <p className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#446900] sm:block">
                {summary.__edges} cạnh · {graph.nodes.size} nút
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-full px-4 py-2 text-xs font-bold text-[#003527] hover:bg-emerald-50"
          >
            ← Trang chủ
          </button>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-28 sm:px-8 sm:pt-32">
          {/* Page heading */}
          <section className="space-y-1.5">
            <h1 className="text-3xl font-extrabold text-[#003527] sm:text-4xl">
              Đồ thị tri thức học tập
            </h1>
            <p className="max-w-3xl text-base font-medium text-[#404944]">
              GraphRAG biểu diễn dữ liệu học tập dưới dạng đồ thị thực thể
              (học sinh, chủ đề, lỗi, phản hồi, giáo viên, bạn …). Click một
              nút để xem ngữ cảnh truy xuất và narrative giải thích.
            </p>
          </section>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary)
              .filter(([k]) => k !== '__edges')
              .map(([k, v]) => {
                const meta = ENTITY_META[k as keyof typeof ENTITY_META]
                if (!meta) return null
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTypeFilter(k)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition',
                      typeFilter === k
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                        : 'border-white bg-white/85 text-[#003527] hover:border-emerald-200',
                    )}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                      style={{ background: meta.color }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {meta.icon}
                      </span>
                    </span>
                    {meta.label}
                    <span className="tabular-nums opacity-70">{v}</span>
                  </button>
                )
              })}
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition',
                typeFilter === 'all'
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                  : 'border-white bg-white/85 text-[#003527] hover:border-emerald-200',
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                filter_alt_off
              </span>
              Bỏ lọc
            </button>
          </div>

          {/* Main grid: left list, canvas center, right detail */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
            {/* Left rail — searchable entity list */}
            <aside className="space-y-3">
              <div className="rounded-[2rem] border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b6954]">
                  Tìm nút
                </p>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 16 }}>
                    search
                  </span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="logarit, Cô Mai…"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  {filteredNodes.length} kết quả
                </p>
              </div>

              <div className="max-h-[480px] space-y-1.5 overflow-y-auto rounded-[2rem] border border-emerald-100 bg-white p-2">
                {filteredNodes.slice(0, 80).map((n) => {
                  const meta = ENTITY_META[n.type]
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setFocusId(n.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 text-left text-xs transition',
                        focusId === n.id
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'hover:bg-slate-50',
                      )}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ background: meta.color }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          {meta.icon}
                        </span>
                      </span>
                      <span className="flex-1 truncate font-bold text-[#003527]">
                        {n.label}
                      </span>
                    </button>
                  )
                })}
                {filteredNodes.length > 80 && (
                  <p className="px-3 py-1.5 text-[11px] italic text-slate-400">
                    … và {filteredNodes.length - 80} nút khác (lọc thêm để xem)
                  </p>
                )}
              </div>

              {/* Similar peers shortcut */}
              <div className="rounded-[2rem] border border-cyan-100 bg-cyan-50/40 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700">
                  Bạn tương đồng top 6
                </p>
                <div className="space-y-1">
                  {similarPeers.map(({ peer, sim }) => (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => setFocusId(peer.id)}
                      className="flex w-full items-center gap-2 rounded-xl border border-transparent bg-white px-2 py-1.5 text-left text-xs transition hover:border-cyan-300"
                    >
                      <span className="text-base">{peer.avatar}</span>
                      <span className="flex-1 truncate font-bold text-[#003527]">
                        {peer.displayName}
                      </span>
                      <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-800">
                        {(sim * 100).toFixed(0)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Center column — canvas + narrative */}
            <div className="space-y-5">
              {/* Hop selector */}
              <div className="flex items-center justify-between gap-3 rounded-full border border-emerald-100 bg-white/95 px-4 py-2 text-xs">
                <span className="font-bold text-[#003527]">
                  Độ sâu truy xuất
                </span>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setMaxHops(h)}
                      className={cn(
                        'rounded-full px-3 py-1 font-bold transition',
                        maxHops === h
                          ? 'bg-[#064e3b] text-[#b2f746]'
                          : 'bg-slate-50 text-[#003527] hover:bg-emerald-50',
                      )}
                    >
                      {h} hop
                    </button>
                  ))}
                </div>
                {subgraph && (
                  <span className="font-medium text-[#446900]">
                    {subgraph.hits.length} nút · {subgraph.edges.length} cạnh
                  </span>
                )}
              </div>

              {subgraph ? (
                <GraphCanvas
                  subgraph={subgraph}
                  selectedId={focusId}
                  onSelectEntity={(e) => setFocusId(e.id)}
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-[2rem] border border-dashed border-slate-300 text-slate-500">
                  Chọn một nút để xem đồ thị.
                </div>
              )}

              {/* Type filter selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#446900]">
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    filter_list
                  </span>
                  Lọc loại nút trong danh sách trái:
                </span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-[#003527]"
                >
                  {ENTITY_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Narrative */}
              {narrative && (
                <NarrativeCard
                  narrative={narrative}
                  onEntityClick={(e) => setFocusId(e.id)}
                />
              )}

              {/* Retrieval trace */}
              {subgraph && subgraph.hits.length > 0 && (
                <div className="rounded-[2rem] border border-emerald-100 bg-white p-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2b6954]">
                    Top kết quả truy xuất (BFS có decay)
                  </p>
                  <ol className="space-y-1.5">
                    {subgraph.hits.slice(0, 8).map((h, i) => (
                      <li
                        key={h.entity.id}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-1.5"
                      >
                        <span className="w-5 text-center text-xs font-black text-slate-500">
                          {i + 1}
                        </span>
                        <EntityChip
                          entity={h.entity}
                          onClick={() => setFocusId(h.entity.id)}
                        />
                        <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                          {h.hops} hop · score {h.score.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Right — entity detail */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              {focusEntity ? (
                <EntityDetailPanel
                  entity={focusEntity}
                  graph={graph}
                  onSelectEntity={(e) => setFocusId(e.id)}
                />
              ) : (
                <div className="rounded-[2rem] border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  Chọn một nút để xem chi tiết.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
