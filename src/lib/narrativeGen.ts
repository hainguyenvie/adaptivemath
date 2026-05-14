/**
 * Template-based narrative generator.
 *
 * Given a focus topic and the GraphRAG knowledge graph, produces a
 * Vietnamese explanation in the form:
 *
 *   Title:   "Logarit"
 *   Lead:    "Em nên ưu tiên ôn Logarit vì 3 dấu hiệu sau:"
 *   Bullets:
 *     - 🔴 3 lỗi gần nhất đều liên quan đến biến đổi…
 *     - 🌱 Chủ đề tiên quyết "Lũy thừa" đang ở mức Chồi non
 *     - 💡 Cô Mai đã đánh dấu chủ đề này là ưu tiên cao
 *     - 🤝 12 bạn cùng lớp với hồ sơ tương tự đã cải thiện 35% sau …
 *
 * Each bullet carries an `evidenceId` so the UI can render a chip pointing
 * back to the source entity — making the retrieval auditable.
 */

import type {
  ActivityEntity,
  Entity,
  FeedbackEntity,
  KnowledgeGraph,
  Narrative,
  NarrativeBullet,
  PeerEntity,
  StudentEntity,
  TopicEntity,
} from '../types/graphRag'
import {
  findErrorsForTopic,
  findFeedbackForTopic,
  findOutcomesForTopic,
  findPrerequisiteChain,
  findSimilarPeers,
  getSelfMastery,
} from './graphRag'
import { TREE_STAGES } from '../types/knowledgeTree'

// ---------------------------------------------------------------------------
// Public — narrative for a topic
// ---------------------------------------------------------------------------

export function buildTopicNarrative(
  graph: KnowledgeGraph,
  topicId: string,
): Narrative {
  const topic = graph.nodes.get(`topic:${topicId}`) as TopicEntity | undefined
  if (!topic) {
    return {
      title: 'Chủ đề không tồn tại',
      lead: 'Không tìm thấy chủ đề này trong cây tri thức.',
      bullets: [],
      citedEntities: [],
    }
  }

  const bullets: NarrativeBullet[] = []
  const cited: Entity[] = []

  const masteryInfo = getSelfMastery(graph, topicId)
  const stageMeta = masteryInfo
    ? TREE_STAGES.find((s) => s.id === masteryInfo.stage)
    : null

  // -- Errors --
  const errors = findErrorsForTopic(graph, topicId, 5)
  const unresolved = errors.filter((e) => !e.resolved)
  if (errors.length > 0) {
    const tags = [...new Set(errors.map((e) => e.errorTag))]
      .slice(0, 2)
      .join(' & ')
    const tagPart = tags ? ` đều liên quan đến **${tags}**` : ''
    bullets.push({
      icon: '🔴',
      tone: 'risk',
      text: `${errors.length} lỗi gần nhất tại chủ đề này${tagPart}. Trong đó **${unresolved.length} lỗi chưa được giải quyết**.`,
      evidenceId: errors[0].id,
    })
    cited.push(...(errors.slice(0, 3) as Entity[]))
  }

  // -- Prerequisite chain --
  const chain = findPrerequisiteChain(graph, topicId, 2)
  const weakPrereq = chain
    .map((c) => ({
      ...c,
      selfMastery: getSelfMastery(graph, c.entity.id.replace('topic:', '')),
    }))
    .filter((c) => c.selfMastery && c.selfMastery.mastery < 0.6)
    .sort(
      (a, b) =>
        (a.selfMastery?.mastery ?? 0) - (b.selfMastery?.mastery ?? 0),
    )
  if (weakPrereq.length > 0) {
    const w = weakPrereq[0]
    const wStage = w.selfMastery
      ? TREE_STAGES.find((s) => s.id === w.selfMastery!.stage)
      : null
    bullets.push({
      icon: '🌱',
      tone: 'priority',
      text: `Chủ đề tiên quyết **${w.entity.label}** đang ở mức ${wStage?.label ?? 'thấp'} (${((w.selfMastery?.mastery ?? 0) * 100).toFixed(0)}%). Nên củng cố trước khi tiếp tục.`,
      evidenceId: w.entity.id,
    })
    cited.push(w.entity)
  } else if (chain.length > 0) {
    const c = chain[0]
    bullets.push({
      icon: '🪜',
      tone: 'info',
      text: `Chủ đề này nối tiếp **${c.entity.label}**${c.errorTags ? ` (thường gây nhầm: ${c.errorTags})` : ''}.`,
      evidenceId: c.entity.id,
    })
    cited.push(c.entity)
  }

  // -- Teacher feedback --
  const teacherFb = findFeedbackForTopic(graph, topicId).filter(
    (f) => f.source === 'teacher',
  )
  if (teacherFb.length > 0) {
    const f = teacherFb[0]
    const teacher = graph.nodes.get(f.authorId)
    bullets.push({
      icon: '💡',
      tone: 'info',
      text: `${teacher?.label ?? 'Giáo viên'} ghi chú: *"${f.body}"*`,
      evidenceId: f.id,
    })
    cited.push(f)
    if (teacher) cited.push(teacher)
  }

  // -- Peer outcomes --
  const outcomes = findOutcomesForTopic(graph, topicId)
  if (outcomes.length > 0) {
    const top = outcomes.reduce((best, cur) =>
      cur.peers.length > best.peers.length ? cur : best,
    )
    const peerCount = top.peers.length
    if (peerCount > 0) {
      bullets.push({
        icon: '🤝',
        tone: 'success',
        text: `**${peerCount} bạn cùng lớp** với hồ sơ tương tự đã cải thiện chủ đề này nhờ: *${top.activity.recipe}*`,
        evidenceId: top.activity.id,
      })
      cited.push(top.activity)
      cited.push(...(top.peers.slice(0, 3) as Entity[]))
    }
  }

  // -- Most similar peer (extra colour) --
  const similar = findSimilarPeers(graph, 3)
  if (similar.length > 0 && bullets.length < 5) {
    const top = similar[0]
    bullets.push({
      icon: '👥',
      tone: 'info',
      text: `**${top.peer.displayName}** (độ tương đồng ${(top.sim * 100).toFixed(0)}%) — *${top.peer.highlight}*.`,
      evidenceId: top.peer.id,
    })
    cited.push(top.peer)
  }

  // -- Lead --
  const lead = buildTopicLead(topic, masteryInfo, stageMeta?.label ?? null, bullets.length)
  const closing = buildTopicClosing(stageMeta?.id)

  return {
    title: topic.label,
    lead,
    bullets,
    closing,
    citedEntities: dedupe(cited),
  }
}

function buildTopicLead(
  topic: TopicEntity,
  masteryInfo: { mastery: number; stage: string } | null,
  stageLabel: string | null,
  bulletCount: number,
): string {
  if (!masteryInfo) {
    return `Hệ thống đề xuất ôn **${topic.label}** dựa trên cấu trúc cây tri thức.`
  }
  const pct = Math.round(masteryInfo.mastery * 100)
  const reasonCount = bulletCount > 0 ? ` qua ${bulletCount} dấu hiệu sau` : ''
  if (masteryInfo.mastery < 0.4) {
    return `Em đang ở mức **${stageLabel ?? '?'}** (${pct}%) với **${topic.label}** — đây là chủ đề nên ưu tiên ôn ngay${reasonCount}.`
  }
  if (masteryInfo.mastery < 0.7) {
    return `**${topic.label}** đang ở mức **${stageLabel}** (${pct}%) — hồ sơ cho thấy nhánh này còn chưa ổn định${reasonCount}.`
  }
  return `**${topic.label}** đã khá vững (${pct}%) — vẫn nên tiếp tục duy trì để chuyển sang giai đoạn ra hoa${reasonCount}.`
}

function buildTopicClosing(stage: string | undefined): string {
  switch (stage) {
    case 'mam-non':
      return 'Bắt đầu bằng phần lý thuyết để gieo lại hạt giống nhé.'
    case 'choi-non':
      return 'Một phiên luyện tập ngắn hôm nay sẽ giúp nhánh này vững hơn.'
    case 'vuon-than':
      return 'Đẩy thêm vài câu mức Vận dụng để cây vươn cao.'
    case 'ra-hoa':
      return 'Giữ nhịp ôn tập định kỳ để giữ nhánh ra hoa.'
    default:
      return 'Tiếp tục hành trình học tập của em nhé!'
  }
}

function dedupe(arr: Entity[]): Entity[] {
  const seen = new Set<string>()
  const out: Entity[] = []
  for (const e of arr) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    out.push(e)
  }
  return out
}

// ---------------------------------------------------------------------------
// Narrative for the student themselves — overview card
// ---------------------------------------------------------------------------

export function buildStudentOverview(graph: KnowledgeGraph): Narrative {
  const self = graph.nodes.get(graph.selfId) as StudentEntity | undefined
  const bullets: NarrativeBullet[] = []
  const cited: Entity[] = []
  if (!self) {
    return {
      title: 'Tổng quan',
      lead: 'Chưa có dữ liệu học sinh.',
      bullets: [],
      citedEntities: [],
    }
  }

  // Strongest + weakest topics.
  const entries = Object.entries(self.masteryByTopic).sort(
    (a, b) => b[1] - a[1],
  )
  if (entries.length > 0) {
    const strongest = entries[0]
    const t = graph.nodes.get(`topic:${strongest[0]}`)
    if (t) {
      bullets.push({
        icon: '🌸',
        tone: 'success',
        text: `Mạnh nhất: **${t.label}** (${(strongest[1] * 100).toFixed(0)}%).`,
        evidenceId: t.id,
      })
      cited.push(t)
    }
    const weakest = entries[entries.length - 1]
    const tw = graph.nodes.get(`topic:${weakest[0]}`)
    if (tw) {
      bullets.push({
        icon: '🌱',
        tone: 'priority',
        text: `Yếu nhất: **${tw.label}** (${(weakest[1] * 100).toFixed(0)}%) — cần ưu tiên.`,
        evidenceId: tw.id,
      })
      cited.push(tw)
    }
  }

  // Similar peers.
  const sim = findSimilarPeers(graph, 3)
  if (sim.length > 0) {
    const labels = sim.map((s) => s.peer.displayName).join(', ')
    bullets.push({
      icon: '🤝',
      tone: 'info',
      text: `**${sim.length} bạn cùng lớp** có hồ sơ tương tự: ${labels}.`,
      evidenceId: sim[0].peer.id,
    })
    cited.push(...sim.map((s) => s.peer as Entity))
  }

  // Streak.
  if (self.currentStreak > 0) {
    bullets.push({
      icon: '🔥',
      tone: 'success',
      text: `Đang giữ chuỗi **${self.currentStreak} ngày** liên tiếp.`,
    })
  }

  // Parent / teacher feedback count.
  let teacherFb = 0
  let parentFb = 0
  for (const node of graph.nodes.values()) {
    if (node.type !== 'feedback') continue
    const f = node as FeedbackEntity
    if (f.source === 'teacher') teacherFb += 1
    if (f.source === 'parent') parentFb += 1
  }
  if (teacherFb + parentFb > 0) {
    bullets.push({
      icon: '💬',
      tone: 'info',
      text: `Có **${teacherFb}** nhận xét từ giáo viên và **${parentFb}** ghi chú phụ huynh đang theo dõi em.`,
    })
  }

  return {
    title: `Hồ sơ của ${self.label}`,
    lead: `Lớp ${self.grade} · ${(self.avgMastery * 100).toFixed(0)}% mastery trung bình · ${self.totalXp} XP`,
    bullets,
    closing: 'Cây tri thức đang lớn lên cùng em mỗi ngày.',
    citedEntities: dedupe(cited),
  }
}

// ---------------------------------------------------------------------------
// Narrative for a peer comparison
// ---------------------------------------------------------------------------

export function buildPeerComparison(
  graph: KnowledgeGraph,
  peerId: string,
): Narrative {
  const peer = graph.nodes.get(peerId) as PeerEntity | undefined
  const self = graph.nodes.get(graph.selfId) as StudentEntity | undefined
  if (!peer || !self) {
    return {
      title: 'Không tìm thấy bạn',
      lead: '',
      bullets: [],
      citedEntities: [],
    }
  }
  const bullets: NarrativeBullet[] = []
  const cited: Entity[] = [peer]

  // Topic gaps where peer is stronger.
  const stronger: Array<{ id: string; gap: number; label: string }> = []
  for (const [tid, m] of Object.entries(peer.masteryByTopic)) {
    const mine = self.masteryByTopic[tid] ?? 0
    if (m - mine > 0.15) {
      const t = graph.nodes.get(`topic:${tid}`)
      if (t) stronger.push({ id: tid, gap: m - mine, label: t.label })
    }
  }
  stronger.sort((a, b) => b.gap - a.gap)
  if (stronger.length > 0) {
    const list = stronger
      .slice(0, 3)
      .map((s) => `${s.label} (+${(s.gap * 100).toFixed(0)}%)`)
      .join(', ')
    bullets.push({
      icon: '📈',
      tone: 'info',
      text: `Bạn mạnh hơn em ở: **${list}**.`,
    })
  }

  // Activities the peer used.
  const outs = graph.outgoing.get(peerId) ?? []
  const activityIds = outs
    .filter((e) => e.type === 'IMPROVED_VIA')
    .map((e) => e.to)
  for (const aid of activityIds.slice(0, 3)) {
    const act = graph.nodes.get(aid) as ActivityEntity | undefined
    if (!act) continue
    bullets.push({
      icon: '🛠️',
      tone: 'success',
      text: `Đã cải thiện qua: *${act.recipe}*`,
      evidenceId: act.id,
    })
    cited.push(act)
  }

  bullets.push({
    icon: '💡',
    tone: 'info',
    text: `Highlight: *${peer.highlight}*`,
  })

  return {
    title: `So với ${peer.displayName}`,
    lead: `Hồ sơ tương đồng — Lớp ${peer.grade}, ${peer.totalXp} XP, streak ${peer.currentStreak} ngày.`,
    bullets,
    closing: 'Em có thể tham khảo lộ trình của bạn này.',
    citedEntities: dedupe(cited),
  }
}

/**
 * Render the narrative as plain markdown text — useful for the
 * pathGenerator `reason` field replacement.
 */
export function narrativeToText(narrative: Narrative): string {
  const parts: string[] = [narrative.lead]
  for (const b of narrative.bullets) {
    parts.push(`${b.icon} ${stripMd(b.text)}`)
  }
  if (narrative.closing) parts.push(narrative.closing)
  return parts.join(' · ')
}

function stripMd(s: string): string {
  return s.replace(/\*\*/g, '').replace(/\*/g, '')
}
