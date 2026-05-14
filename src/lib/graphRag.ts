/**
 * GraphRAG core — build a heterogeneous knowledge graph from the student's
 * profile/learner state + seed data, then retrieve relevant subgraphs.
 *
 * No external graph DB. The whole graph is built in-memory on demand
 * (~5-10 ms for the current seed sizes) and re-used by retrieval queries.
 *
 * Vector similarity is plain cosine over hand-crafted feature vectors —
 * good enough for "students like me" without shipping a sentence-encoder.
 */

import type {
  Edge,
  Entity,
  KnowledgeGraph,
  PeerEntity,
  RetrievalHit,
  StudentEntity,
  SubGraph,
  TopicEntity,
  RelationType,
  ActivityEntity,
  FeedbackEntity,
  TeacherEntity,
  ParentEntity,
  ErrorEntityNode,
  SessionEntity,
  SkillEntity,
} from '../types/graphRag'
import type { UserProfile } from '../types/user'
import type { KnowledgeProfile, TopicMastery } from '../types/profile'
import type { LearnerState } from '../types/learner'
import type { KnowledgeTreeModel, TopicTreeNode } from '../types/knowledgeTree'
import { TOPICS, groupTopicsByChapter, getTopicById } from '../data/topics'
import { TOPIC_PREREQS, FOUNDATIONAL_SKILLS } from '../data/topicPrereqs'
import { TEACHERS } from '../data/teacherDirectory'
import { PARENTS } from '../data/parentNotes'
import { PEER_STUDENTS } from '../data/peerStudents'
import { PEER_OUTCOMES } from '../data/peerOutcomes'
import { classifyStage } from './treeStability'

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export interface BuildGraphInput {
  profile: UserProfile
  knowledge: KnowledgeProfile
  learner: LearnerState
  tree: KnowledgeTreeModel | null
}

export function buildKnowledgeGraph(input: BuildGraphInput): KnowledgeGraph {
  const nodes = new Map<string, Entity>()
  const edges = new Map<string, Edge>()
  const outgoing = new Map<string, Edge[]>()
  const incoming = new Map<string, Edge[]>()

  function addNode(entity: Entity) {
    nodes.set(entity.id, entity)
  }
  function addEdge(e: Omit<Edge, 'id'>) {
    const id = `${e.type}:${e.from}->${e.to}`
    if (edges.has(id)) return
    const edge: Edge = { ...e, id }
    edges.set(id, edge)
    push(outgoing, e.from, edge)
    push(incoming, e.to, edge)
  }

  // ---- Student (self) ----
  const treeByTopic = new Map<string, TopicTreeNode>()
  if (input.tree) {
    for (const b of input.tree.branches) {
      for (const t of b.topics) treeByTopic.set(t.topicId, t)
    }
  }

  const stageByTopic: StudentEntity['stageByTopic'] = {}
  const masteryByTopic: StudentEntity['masteryByTopic'] = {}
  for (const tm of input.knowledge.topics) {
    masteryByTopic[tm.topicId] = tm.mastery
    stageByTopic[tm.topicId] =
      treeByTopic.get(tm.topicId)?.stage ?? classifyStage(tm.mastery)
  }
  const avgMastery =
    input.knowledge.topics.reduce((s, t) => s + t.mastery, 0) /
    Math.max(1, input.knowledge.topics.length)

  const selfId = 'me'
  const self: StudentEntity = {
    id: selfId,
    type: 'student',
    label: 'Bạn',
    subtitle: `Lớp ${input.profile.grade}`,
    displayName: 'Bạn',
    avatar: '🧑‍🎓',
    grade: input.profile.grade,
    goal: input.profile.goal,
    avgMastery,
    masteryByTopic,
    stageByTopic,
    totalXp: input.learner.gamification.xp,
    currentStreak: input.learner.gamification.currentStreak,
    vector: studentFeatureVector(masteryByTopic, input.profile),
  }
  addNode(self)

  // ---- Chapter nodes (per grade in profile) ----
  const chapters = groupTopicsByChapter(input.profile.grade)
  for (const { chapter, topics } of chapters) {
    const t0 = topics[0]
    const chId = `ch:${input.profile.grade}:${t0.chapter}`
    addNode({
      id: chId,
      type: 'chapter',
      label: chapter,
      subtitle: `Lớp ${input.profile.grade} · Chương ${t0.chapter}`,
      grade: input.profile.grade,
      chapterNumber: t0.chapter,
    })
    for (const topic of topics) {
      const tNode: TopicEntity = {
        id: `topic:${topic.id}`,
        type: 'topic',
        label: topic.title,
        subtitle: chapter,
        grade: topic.grade,
        chapter: topic.chapter,
        lesson: topic.lesson,
        chapterTitle: topic.chapterTitle,
        vector: topicFeatureVector(topic.id, masteryByTopic),
      }
      addNode(tNode)
      addEdge({
        type: 'BELONGS_TO',
        from: tNode.id,
        to: chId,
        weight: 1,
      })
    }
  }

  // Add topic nodes for OTHER grades too (so prerequisites that cross
  // grades have a target). Only minimal info — no chapter wrapping.
  for (const topic of TOPICS) {
    if (topic.grade === input.profile.grade) continue
    const nid = `topic:${topic.id}`
    if (nodes.has(nid)) continue
    addNode({
      id: nid,
      type: 'topic',
      label: topic.title,
      subtitle: `Lớp ${topic.grade} · ${topic.chapterTitle}`,
      grade: topic.grade,
      chapter: topic.chapter,
      lesson: topic.lesson,
      chapterTitle: topic.chapterTitle,
    })
  }

  // ---- Foundational skills ----
  for (const seed of FOUNDATIONAL_SKILLS) {
    const skill: SkillEntity = {
      id: `skill:${seed.id}`,
      type: 'skill',
      label: seed.label,
      subtitle: 'Kỹ năng nền',
      topicIds: seed.topicIds,
    }
    addNode(skill)
    for (const tid of seed.topicIds) {
      addEdge({
        type: 'REQUIRES_SKILL',
        from: `topic:${tid}`,
        to: skill.id,
        weight: 0.6,
      })
    }
  }

  // ---- Prerequisite edges ----
  for (const p of TOPIC_PREREQS) {
    addEdge({
      type: 'PREREQUISITE_OF',
      from: `topic:${p.from}`,
      to: `topic:${p.to}`,
      weight: p.weight,
      note: p.errorTags.join(', '),
    })
  }

  // ---- Student → Topic state edges ----
  for (const tm of input.knowledge.topics) {
    const target = `topic:${tm.topicId}`
    if (tm.mastery >= 0.8) {
      addEdge({
        type: 'MASTERED',
        from: selfId,
        to: target,
        weight: tm.mastery,
      })
    } else if (tm.mastery < 0.55) {
      addEdge({
        type: 'STRUGGLES_WITH',
        from: selfId,
        to: target,
        weight: 1 - tm.mastery,
      })
    } else {
      addEdge({
        type: 'ATTEMPTED',
        from: selfId,
        to: target,
        weight: tm.mastery,
      })
    }
  }

  // ---- Sessions ----
  for (const s of input.learner.sessions.slice(-12)) {
    const sNode: SessionEntity = {
      id: `session:${s.sessionId}`,
      type: 'session',
      label: `Phiên ${s.date}`,
      subtitle: `${s.questionsAttempted} câu · ${(s.correctCount / Math.max(1, s.questionsAttempted) * 100).toFixed(0)}%`,
      topicId: s.topicId,
      date: s.date,
      accuracy: s.correctCount / Math.max(1, s.questionsAttempted),
      masteryBefore: s.masteryBefore,
      masteryAfter: s.masteryAfter,
    }
    addNode(sNode)
    addEdge({
      type: 'PARTICIPATED_IN',
      from: selfId,
      to: sNode.id,
      weight: 1,
      timestamp: s.date,
    })
    if (nodes.has(`topic:${s.topicId}`)) {
      addEdge({
        type: 'CONCERNS',
        from: sNode.id,
        to: `topic:${s.topicId}`,
        weight: 0.8,
      })
    }
  }

  // ---- Errors ----
  const recentErrors = input.learner.errors.slice(-30)
  for (const e of recentErrors) {
    const eNode: ErrorEntityNode = {
      id: `err:${e.questionId}:${e.timestamp}`,
      type: 'error',
      label: 'Lỗi sai',
      subtitle: e.resolved ? 'Đã giải quyết' : 'Chưa giải quyết',
      topicId: e.topicId,
      questionId: e.questionId,
      timestamp: e.timestamp,
      resolved: e.resolved,
      errorTag: inferErrorTag(e.topicId),
    }
    addNode(eNode)
    addEdge({
      type: 'HAS_ERROR_AT',
      from: selfId,
      to: eNode.id,
      weight: e.resolved ? 0.3 : 1,
      timestamp: e.timestamp,
    })
    if (nodes.has(`topic:${e.topicId}`)) {
      addEdge({
        type: 'CONCERNS',
        from: eNode.id,
        to: `topic:${e.topicId}`,
        weight: 0.9,
      })
    }
  }

  // ---- Teachers ----
  for (const t of TEACHERS) {
    const tNode: TeacherEntity = {
      id: `teacher:${t.id}`,
      type: 'teacher',
      label: t.displayName,
      subtitle: t.bio,
      displayName: t.displayName,
      avatar: t.avatar,
      topicIds: [...t.topicIds],
      bio: t.bio,
    }
    addNode(tNode)
    for (const tid of t.topicIds) {
      if (!nodes.has(`topic:${tid}`)) continue
      addEdge({
        type: 'TEACHES',
        from: tNode.id,
        to: `topic:${tid}`,
        weight: 0.7,
      })
    }
    // Teacher comment about the student (one feedback per teacher).
    if (t.comments.length > 0) {
      const body = pick(t.comments, hashSeed(t.id))
      const f = makeFeedback({
        id: `fb:tch:${t.id}`,
        source: 'teacher',
        authorId: tNode.id,
        body,
        concernsId: selfId,
        tone: tonalScore(body),
      })
      addNode(f)
      addEdge({ type: 'AUTHORED_BY', from: f.id, to: tNode.id, weight: 1 })
      addEdge({ type: 'CONCERNS', from: f.id, to: selfId, weight: 0.5 })
      addEdge({ type: 'COMMENTED_ON', from: tNode.id, to: selfId, weight: 0.5 })
    }
    // Topic-specific teacher notes.
    if (t.topicNotes) {
      for (const [topicId, note] of Object.entries(t.topicNotes)) {
        if (!nodes.has(`topic:${topicId}`)) continue
        const f = makeFeedback({
          id: `fb:tch:${t.id}:${topicId}`,
          source: 'teacher',
          authorId: tNode.id,
          body: note,
          concernsId: `topic:${topicId}`,
          tone: 0.2,
        })
        addNode(f)
        addEdge({ type: 'AUTHORED_BY', from: f.id, to: tNode.id, weight: 1 })
        addEdge({
          type: 'CONCERNS',
          from: f.id,
          to: `topic:${topicId}`,
          weight: 0.7,
        })
      }
    }
  }

  // ---- Parents ----
  for (const p of PARENTS) {
    const pNode: ParentEntity = {
      id: `parent:${p.id}`,
      type: 'parent',
      label: p.displayName,
      subtitle: `Phụ huynh (${p.relation})`,
      displayName: p.displayName,
      avatar: p.avatar,
      relation: p.relation,
    }
    addNode(pNode)
    addEdge({ type: 'MONITORS', from: pNode.id, to: selfId, weight: 0.6 })
    for (let i = 0; i < p.notes.length; i++) {
      const body = p.notes[i]
      const f = makeFeedback({
        id: `fb:par:${p.id}:${i}`,
        source: 'parent',
        authorId: pNode.id,
        body,
        concernsId: selfId,
        tone: tonalScore(body),
      })
      addNode(f)
      addEdge({ type: 'AUTHORED_BY', from: f.id, to: pNode.id, weight: 1 })
      addEdge({ type: 'CONCERNS', from: f.id, to: selfId, weight: 0.4 })
    }
  }

  // ---- Peers ----
  for (const p of PEER_STUDENTS) {
    const pVec = studentFeatureVector(p.mastery, { grade: p.grade, goal: p.goal })
    const peer: PeerEntity = {
      id: `peer:${p.id}`,
      type: 'peer',
      label: p.displayName,
      subtitle: `Lớp ${p.grade} · ${p.highlight}`,
      displayName: p.displayName,
      avatar: p.avatar,
      grade: p.grade,
      goal: p.goal,
      avgMastery: avgOf(Object.values(p.mastery)),
      masteryByTopic: { ...p.mastery },
      stageByTopic: Object.fromEntries(
        Object.entries(p.mastery).map(([k, v]) => [k, classifyStage(v)]),
      ),
      totalXp: p.totalXp,
      currentStreak: p.currentStreak,
      highlight: p.highlight,
      vector: pVec,
    }
    addNode(peer)
    // Peer outcomes → activity nodes.
    for (const outId of p.peerOutcomeIds) {
      const outcome = PEER_OUTCOMES.find((o) => o.id === outId)
      if (!outcome) continue
      const actNodeId = `act:${outcome.id}`
      if (!nodes.has(actNodeId)) {
        const act: ActivityEntity = {
          id: actNodeId,
          type: 'activity',
          label: activityLabel(outcome),
          subtitle: `+${(outcome.meanImprovement * 100).toFixed(0)}% mastery · ${outcome.cohortSize} bạn`,
          ...outcome.activity,
        }
        addNode(act)
        if (nodes.has(`topic:${outcome.topicId}`)) {
          addEdge({
            type: 'TARGETS',
            from: act.id,
            to: `topic:${outcome.topicId}`,
            weight: 0.9,
          })
        }
      }
      addEdge({
        type: 'IMPROVED_VIA',
        from: peer.id,
        to: actNodeId,
        weight: 0.8,
      })
    }
  }

  // ---- Peer similarity edges (top-K to self) ----
  const selfVec = self.vector!
  const peerSims = PEER_STUDENTS.map((p) => {
    const peerNode = nodes.get(`peer:${p.id}`) as PeerEntity
    return {
      peer: peerNode,
      sim: cosineSim(selfVec, peerNode.vector!),
    }
  })
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 8)
  for (const { peer, sim } of peerSims) {
    addEdge({
      type: 'SIMILAR_TO',
      from: selfId,
      to: peer.id,
      weight: Math.max(0, sim),
    })
  }

  return {
    nodes,
    outgoing,
    incoming,
    edges,
    builtAt: new Date().toISOString(),
    selfId,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const arr = map.get(key) ?? []
  arr.push(value)
  map.set(key, arr)
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

function avgOf(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function tonalScore(body: string): number {
  const positive = ['tốt', 'đáng khen', 'khen', 'rất', 'xuất sắc', 'duy trì', 'tự tin']
  const negative = ['nản', 'né', 'mất tập trung', 'cần', 'phải', 'chậm', 'yếu', 'lười']
  let score = 0
  const lower = body.toLowerCase()
  for (const w of positive) if (lower.includes(w)) score += 0.25
  for (const w of negative) if (lower.includes(w)) score -= 0.2
  return Math.max(-1, Math.min(1, score))
}

function activityLabel(outcome: { activity: { kind: string }; topicId: string }): string {
  const topic = getTopicById(outcome.topicId)
  const kindMap: Record<string, string> = {
    theory: 'Lý thuyết',
    practice: 'Luyện tập',
    review: 'Ôn tập',
    remedial: 'Tỉa cành',
    community: 'Cộng đồng',
  }
  return `${kindMap[outcome.activity.kind] ?? outcome.activity.kind} · ${topic?.title ?? outcome.topicId}`
}

function inferErrorTag(topicId: string): string {
  // Look up the most plausible error tag based on prerequisite edges
  // ending in this topic.
  for (const p of TOPIC_PREREQS) {
    if (p.to === topicId && p.errorTags.length > 0) return p.errorTags[0]
  }
  return 'lỗi tính toán'
}

function makeFeedback(args: {
  id: string
  source: FeedbackEntity['source']
  authorId: string
  body: string
  concernsId?: string
  tone: number
}): FeedbackEntity {
  return {
    id: args.id,
    type: 'feedback',
    label: args.body.slice(0, 48) + (args.body.length > 48 ? '…' : ''),
    subtitle:
      args.source === 'teacher'
        ? 'Phản hồi giáo viên'
        : args.source === 'parent'
          ? 'Phản hồi phụ huynh'
          : args.source === 'peer'
            ? 'Phản hồi bạn'
            : args.source === 'self'
              ? 'Tự đánh giá'
              : 'Hệ thống',
    source: args.source,
    authorId: args.authorId,
    body: args.body,
    concernsId: args.concernsId,
    tone: args.tone,
    timestamp: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Feature vectors
// ---------------------------------------------------------------------------

/**
 * Student feature vector — 8 chapter-bucket masteries + grade onehot + goal onehot.
 * Length = 8 + 3 + 4 = 15.
 */
function studentFeatureVector(
  masteryByTopic: Record<string, number>,
  ctx: { grade: number; goal: string },
): number[] {
  // Bucket topics by chapter title (8 most common — pad with zeros).
  const buckets: Record<string, { sum: number; count: number }> = {}
  for (const [tid, m] of Object.entries(masteryByTopic)) {
    const meta = getTopicById(tid)
    if (!meta) continue
    const key = meta.chapterTitle
    const b = buckets[key] ?? { sum: 0, count: 0 }
    b.sum += m
    b.count += 1
    buckets[key] = b
  }
  const sortedChapters = Object.keys(buckets).sort()
  const chapterVec = sortedChapters.slice(0, 8).map((k) => {
    const b = buckets[k]
    return b.count > 0 ? b.sum / b.count : 0
  })
  while (chapterVec.length < 8) chapterVec.push(0)

  const gradeOne = [ctx.grade === 10 ? 1 : 0, ctx.grade === 11 ? 1 : 0, ctx.grade === 12 ? 1 : 0]
  const goalOne = [
    ctx.goal === 'giua-ky' ? 1 : 0,
    ctx.goal === 'cuoi-ky' ? 1 : 0,
    ctx.goal === 'thpt-qg' ? 1 : 0,
    ctx.goal === 'nang-cao' ? 1 : 0,
  ]
  return [...chapterVec, ...gradeOne.map((x) => x * 0.5), ...goalOne.map((x) => x * 0.5)]
}

/**
 * Topic feature vector — small hand-crafted [chapter#, grade, lesson, mastery].
 */
function topicFeatureVector(
  topicId: string,
  masteryByTopic: Record<string, number>,
): number[] {
  const meta = getTopicById(topicId)
  if (!meta) return [0, 0, 0, 0]
  return [meta.chapter / 10, (meta.grade - 10) / 2, meta.lesson / 30, masteryByTopic[topicId] ?? 0.5]
}

export function cosineSim(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

// ---------------------------------------------------------------------------
// Retrieval — BFS bounded by hop count, ranked by edge weight × hop decay
// ---------------------------------------------------------------------------

export interface RetrievalOptions {
  /** Max hops from focus. */
  maxHops?: number
  /** Limit hits returned (does not limit edges). */
  topK?: number
  /** Only follow these relations (default: all). */
  allowRelations?: ReadonlySet<RelationType>
  /** Decay factor per hop (default 0.6). */
  decay?: number
}

const DEFAULT_OPTS: Required<RetrievalOptions> = {
  maxHops: 2,
  topK: 24,
  allowRelations: new Set<RelationType>(),
  decay: 0.6,
}

export function retrieveContext(
  graph: KnowledgeGraph,
  focusId: string,
  opts: RetrievalOptions = {},
): SubGraph {
  const o = { ...DEFAULT_OPTS, ...opts }
  const focus = graph.nodes.get(focusId)
  if (!focus) {
    return { focus: { id: focusId, type: 'topic', label: focusId } as Entity, hits: [], edges: [] }
  }

  type Frontier = {
    nodeId: string
    hops: number
    path: Edge[]
    score: number
  }
  const visited = new Map<string, Frontier>()
  const queue: Frontier[] = [{ nodeId: focusId, hops: 0, path: [], score: 1 }]
  visited.set(focusId, queue[0])

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.hops >= o.maxHops) continue
    const outs = graph.outgoing.get(cur.nodeId) ?? []
    const ins = graph.incoming.get(cur.nodeId) ?? []
    for (const edge of [...outs, ...ins]) {
      if (
        o.allowRelations.size > 0 &&
        !o.allowRelations.has(edge.type)
      ) {
        continue
      }
      const nextId = edge.from === cur.nodeId ? edge.to : edge.from
      if (visited.has(nextId)) continue
      const nextScore = cur.score * o.decay * (edge.weight || 0.5)
      const nextPath = [...cur.path, edge]
      const f: Frontier = { nodeId: nextId, hops: cur.hops + 1, path: nextPath, score: nextScore }
      visited.set(nextId, f)
      queue.push(f)
    }
  }

  const hits: RetrievalHit[] = []
  for (const [id, f] of visited) {
    if (id === focusId) continue
    const entity = graph.nodes.get(id)
    if (!entity) continue
    hits.push({ entity, path: f.path, score: f.score, hops: f.hops })
  }
  hits.sort((a, b) => b.score - a.score)
  const top = hits.slice(0, o.topK)

  // Collect every edge between focus and hits (and between hit pairs) so
  // the subgraph is renderable as a connected component.
  const includedIds = new Set([focusId, ...top.map((h) => h.entity.id)])
  const edgeSet: Edge[] = []
  for (const e of graph.edges.values()) {
    if (includedIds.has(e.from) && includedIds.has(e.to)) {
      edgeSet.push(e)
    }
  }

  return { focus, hits: top, edges: edgeSet }
}

// ---------------------------------------------------------------------------
// Specialized queries
// ---------------------------------------------------------------------------

/** Find peers most similar to the current student. */
export function findSimilarPeers(
  graph: KnowledgeGraph,
  k: number = 5,
): Array<{ peer: PeerEntity; sim: number }> {
  const self = graph.nodes.get(graph.selfId) as StudentEntity
  if (!self?.vector) return []
  const peers: Array<{ peer: PeerEntity; sim: number }> = []
  for (const node of graph.nodes.values()) {
    if (node.type !== 'peer') continue
    const p = node as PeerEntity
    if (!p.vector) continue
    peers.push({ peer: p, sim: cosineSim(self.vector, p.vector) })
  }
  peers.sort((a, b) => b.sim - a.sim)
  return peers.slice(0, k)
}

/** Walk the prerequisite chain backwards from a topic. */
export function findPrerequisiteChain(
  graph: KnowledgeGraph,
  topicId: string,
  maxDepth: number = 3,
): Array<{ entity: TopicEntity; depth: number; weight: number; errorTags: string }> {
  const fullId = topicId.startsWith('topic:') ? topicId : `topic:${topicId}`
  const out: Array<{ entity: TopicEntity; depth: number; weight: number; errorTags: string }> = []
  const seen = new Set<string>([fullId])
  let frontier: Array<{ id: string; depth: number; weight: number; tags: string }> = [
    { id: fullId, depth: 0, weight: 1, tags: '' },
  ]
  while (frontier.length > 0 && frontier[0].depth < maxDepth) {
    const next: typeof frontier = []
    for (const f of frontier) {
      const incoming = graph.incoming.get(f.id) ?? []
      for (const e of incoming) {
        if (e.type !== 'PREREQUISITE_OF') continue
        if (seen.has(e.from)) continue
        seen.add(e.from)
        const entity = graph.nodes.get(e.from) as TopicEntity | undefined
        if (!entity || entity.type !== 'topic') continue
        out.push({
          entity,
          depth: f.depth + 1,
          weight: e.weight,
          errorTags: e.note ?? '',
        })
        next.push({ id: e.from, depth: f.depth + 1, weight: e.weight, tags: e.note ?? '' })
      }
    }
    frontier = next
  }
  return out
}

/**
 * Peer outcomes targeting a specific topic — used for
 * "12 bạn cải thiện X bằng cách Y" narratives.
 */
export function findOutcomesForTopic(
  graph: KnowledgeGraph,
  topicId: string,
): Array<{ activity: ActivityEntity; peers: PeerEntity[] }> {
  const fullId = topicId.startsWith('topic:') ? topicId : `topic:${topicId}`
  const result: Array<{ activity: ActivityEntity; peers: PeerEntity[] }> = []
  for (const node of graph.nodes.values()) {
    if (node.type !== 'activity') continue
    const act = node as ActivityEntity
    if (act.topicId !== (fullId.replace('topic:', ''))) continue
    // Peers that improved via this activity.
    const peers: PeerEntity[] = []
    const ins = graph.incoming.get(act.id) ?? []
    for (const e of ins) {
      if (e.type !== 'IMPROVED_VIA') continue
      const peer = graph.nodes.get(e.from)
      if (peer && peer.type === 'peer') peers.push(peer as PeerEntity)
    }
    result.push({ activity: act, peers })
  }
  return result
}

/** Recent errors at a given topic. */
export function findErrorsForTopic(
  graph: KnowledgeGraph,
  topicId: string,
  limit: number = 5,
): ErrorEntityNode[] {
  const result: ErrorEntityNode[] = []
  for (const node of graph.nodes.values()) {
    if (node.type !== 'error') continue
    const err = node as ErrorEntityNode
    if (err.topicId !== topicId) continue
    result.push(err)
  }
  result.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return result.slice(0, limit)
}

/** Teacher feedbacks concerning a topic. */
export function findFeedbackForTopic(
  graph: KnowledgeGraph,
  topicId: string,
): FeedbackEntity[] {
  const fullId = `topic:${topicId}`
  const fb: FeedbackEntity[] = []
  const ins = graph.incoming.get(fullId) ?? []
  for (const e of ins) {
    if (e.type !== 'CONCERNS') continue
    const node = graph.nodes.get(e.from)
    if (node?.type === 'feedback') fb.push(node as FeedbackEntity)
  }
  return fb
}

/** Helper for views — get a fully-typed topic mastery from the student. */
export function getSelfMastery(
  graph: KnowledgeGraph,
  topicId: string,
): { mastery: number; stage: string } | null {
  const self = graph.nodes.get(graph.selfId) as StudentEntity | undefined
  if (!self) return null
  const m = self.masteryByTopic[topicId]
  if (m === undefined) return null
  return { mastery: m, stage: self.stageByTopic[topicId] }
}

/** Reused by views — number of nodes per type. */
export function summarizeGraph(graph: KnowledgeGraph): Record<string, number> {
  const out: Record<string, number> = {}
  for (const n of graph.nodes.values()) {
    out[n.type] = (out[n.type] ?? 0) + 1
  }
  out.__edges = graph.edges.size
  return out
}

// Re-export the topicMastery type for callers that need it inline.
export type { TopicMastery }
