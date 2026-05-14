/**
 * GraphRAG — entity-relation graph for personalized retrieval.
 *
 * Thesis Approach #2: instead of reading the student's learning history as
 * a flat log, we model it as a heterogeneous graph. Entities are typed
 * nodes (student, topic, question, error, teacher, parent, peer, ...) and
 * relations are typed edges. A retrieval query (e.g. "why should I study
 * Logarithms next?") fans out from a focus node, gathers a small subgraph
 * of relevant context, and feeds it to a template-based narrative
 * generator that emits a human-readable explanation.
 *
 * Vector indexing is approximated client-side: each entity gets a small
 * feature vector (curriculum bucket + mastery bucket + level mix + flags),
 * and similarity is plain cosine — good enough to find "students like me
 * who improved Logarithms by doing X" without shipping a heavy embedding
 * model into the bundle.
 */

import type { Grade, Goal } from './user'
import type { TreeStage } from './knowledgeTree'

// ---------------------------------------------------------------------------
// Entity types
// ---------------------------------------------------------------------------

export type EntityType =
  | 'student'
  | 'peer'
  | 'topic'
  | 'chapter'
  | 'question'
  | 'session'
  | 'error'
  | 'feedback'
  | 'teacher'
  | 'parent'
  | 'activity'
  | 'skill'

export interface EntityBase {
  id: string
  type: EntityType
  label: string
  /** Short subtitle shown under the label in chips / cards. */
  subtitle?: string
  /** Feature vector for cosine similarity (length is type-specific). */
  vector?: number[]
}

export interface StudentEntity extends EntityBase {
  type: 'student'
  grade: Grade
  goal: Goal
  /** Anonymized display name. */
  displayName: string
  avatar: string
  /** Average mastery across all topics in profile. */
  avgMastery: number
  /** Topic id → mastery (0..1). */
  masteryByTopic: Record<string, number>
  /** Topic id → tree stage at last snapshot. */
  stageByTopic: Record<string, TreeStage>
  /** XP and study habits. */
  totalXp: number
  currentStreak: number
}

export interface PeerEntity extends Omit<StudentEntity, 'type'> {
  type: 'peer'
  /** Short story tag — used in narratives. */
  highlight: string
}

export interface TopicEntity extends EntityBase {
  type: 'topic'
  grade: Grade
  chapter: number
  lesson: number
  chapterTitle: string
}

export interface ChapterEntity extends EntityBase {
  type: 'chapter'
  grade: Grade
  chapterNumber: number
}

export interface QuestionEntity extends EntityBase {
  type: 'question'
  topicId: string
  grade: Grade
  level: 'N' | 'H' | 'V' | 'T' | 'unknown'
  /** IRT b — difficulty. */
  difficulty: number
  /** Brief snippet of prompt for display. */
  preview: string
}

export interface SessionEntity extends EntityBase {
  type: 'session'
  topicId: string
  date: string
  accuracy: number
  masteryBefore: number
  masteryAfter: number
}

export interface ErrorEntityNode extends EntityBase {
  type: 'error'
  topicId: string
  questionId: string
  timestamp: string
  resolved: boolean
  /** Short tag describing the error nature (e.g. "biến đổi đại số"). */
  errorTag: string
}

export interface FeedbackEntity extends EntityBase {
  type: 'feedback'
  source: 'teacher' | 'parent' | 'peer' | 'self' | 'system'
  authorId: string
  /** The free-text feedback in Vietnamese. */
  body: string
  /** Optional topic/activity/student this feedback concerns. */
  concernsId?: string
  /** -1..1 sentiment-ish score; positive = encouraging. */
  tone: number
  timestamp: string
}

export interface TeacherEntity extends EntityBase {
  type: 'teacher'
  displayName: string
  avatar: string
  /** Topic ids this teacher specializes in. */
  topicIds: string[]
  /** One-line bio. */
  bio: string
}

export interface ParentEntity extends EntityBase {
  type: 'parent'
  displayName: string
  avatar: string
  relation: 'mẹ' | 'bố' | 'phụ huynh'
}

/**
 * An "activity recipe" — a concrete intervention (e.g. "đọc lại Tính chất
 * logarit + làm 5 câu N + 1 câu V"). Peer outcome nodes reference these.
 */
export interface ActivityEntity extends EntityBase {
  type: 'activity'
  kind: 'theory' | 'practice' | 'review' | 'remedial' | 'community'
  topicId: string
  /** Levels involved (e.g. ['N', 'H']). */
  levels: Array<'N' | 'H' | 'V' | 'T'>
  /** Description of the recipe. */
  recipe: string
  /** Estimated minutes. */
  estimatedMinutes: number
}

export interface SkillEntity extends EntityBase {
  type: 'skill'
  /** Cross-topic foundational skill ("đọc đề", "biến đổi đại số" …). */
  topicIds: string[]
}

export type Entity =
  | StudentEntity
  | PeerEntity
  | TopicEntity
  | ChapterEntity
  | QuestionEntity
  | SessionEntity
  | ErrorEntityNode
  | FeedbackEntity
  | TeacherEntity
  | ParentEntity
  | ActivityEntity
  | SkillEntity

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export type RelationType =
  | 'BELONGS_TO' // topic → chapter, question → topic
  | 'PREREQUISITE_OF' // topic → topic
  | 'REQUIRES_SKILL' // topic → skill
  | 'ATTEMPTED' // student → question
  | 'STRUGGLES_WITH' // student → topic
  | 'MASTERED' // student → topic
  | 'HAS_ERROR_AT' // student → error / topic
  | 'PARTICIPATED_IN' // student → session
  | 'OCCURRED_IN' // error → session
  | 'CONCERNS' // feedback → student/topic/activity
  | 'AUTHORED_BY' // feedback → teacher/parent/peer/self
  | 'TEACHES' // teacher → topic
  | 'COMMENTED_ON' // teacher → student
  | 'MONITORS' // parent → student
  | 'SIMILAR_TO' // student ↔ peer, question ↔ question
  | 'IMPROVED_VIA' // peer → activity (succeeded after doing activity)
  | 'TARGETS' // activity → topic
  | 'NEXT_AFTER' // activity sequence

export interface Edge {
  /** Stable composite id `${type}:${from}->${to}`. */
  id: string
  type: RelationType
  from: string
  to: string
  /** 0..1 weight — used for ranking retrieval. */
  weight: number
  /** Optional human-readable annotation. */
  note?: string
  /** ISO timestamp when observed. */
  timestamp?: string
}

// ---------------------------------------------------------------------------
// Graph container
// ---------------------------------------------------------------------------

export interface KnowledgeGraph {
  nodes: Map<string, Entity>
  /** Adjacency list keyed by from-node id. */
  outgoing: Map<string, Edge[]>
  /** Adjacency list keyed by to-node id. */
  incoming: Map<string, Edge[]>
  /** Edges keyed by id. */
  edges: Map<string, Edge>
  builtAt: string
  /** The current student's id — convenience pointer. */
  selfId: string
}

// ---------------------------------------------------------------------------
// Retrieval result
// ---------------------------------------------------------------------------

export interface RetrievalHit {
  entity: Entity
  /** Path of edges traversed from focus to this hit. */
  path: Edge[]
  /** Aggregate relevance score. */
  score: number
  /** Number of hops from the focus node. */
  hops: number
}

export interface SubGraph {
  focus: Entity
  hits: RetrievalHit[]
  /** Edges between focus & hits, hits & hits (for visualization). */
  edges: Edge[]
}

// ---------------------------------------------------------------------------
// Narrative
// ---------------------------------------------------------------------------

export interface NarrativeBullet {
  icon: string
  /** Entity / edge id that justifies this bullet. */
  evidenceId?: string
  text: string
  /** Optional emphasis (e.g. 'priority', 'risk', 'success'). */
  tone?: 'priority' | 'risk' | 'success' | 'info'
}

export interface Narrative {
  /** Title — usually the focus topic / entity name. */
  title: string
  /** Lead sentence — overall recommendation. */
  lead: string
  bullets: NarrativeBullet[]
  /** Final encouragement line. */
  closing?: string
  /** Entities referenced in the narrative (for chip rendering). */
  citedEntities: Entity[]
}

// ---------------------------------------------------------------------------
// Visual metadata — used by GraphCanvas
// ---------------------------------------------------------------------------

export const ENTITY_META: Record<
  EntityType,
  { icon: string; color: string; ring: string; label: string }
> = {
  student: { icon: 'face', color: '#003527', ring: 'ring-emerald-500', label: 'Học sinh' },
  peer: { icon: 'group', color: '#0e7490', ring: 'ring-cyan-500', label: 'Bạn cùng lớp' },
  topic: { icon: 'menu_book', color: '#7c2d12', ring: 'ring-amber-500', label: 'Chủ đề' },
  chapter: { icon: 'collections_bookmark', color: '#92400e', ring: 'ring-orange-500', label: 'Chương' },
  question: { icon: 'help', color: '#5b21b6', ring: 'ring-violet-500', label: 'Câu hỏi' },
  session: { icon: 'timeline', color: '#155e75', ring: 'ring-sky-500', label: 'Phiên học' },
  error: { icon: 'error', color: '#9f1239', ring: 'ring-rose-500', label: 'Lỗi sai' },
  feedback: { icon: 'forum', color: '#0f766e', ring: 'ring-teal-500', label: 'Phản hồi' },
  teacher: { icon: 'school', color: '#1d4ed8', ring: 'ring-blue-500', label: 'Giáo viên' },
  parent: { icon: 'family_restroom', color: '#a16207', ring: 'ring-yellow-500', label: 'Phụ huynh' },
  activity: { icon: 'play_circle', color: '#16a34a', ring: 'ring-green-500', label: 'Hoạt động' },
  skill: { icon: 'psychology', color: '#7e22ce', ring: 'ring-purple-500', label: 'Kỹ năng' },
}

export const RELATION_META: Record<
  RelationType,
  { label: string; icon: string }
> = {
  BELONGS_TO: { label: 'Thuộc', icon: 'subdirectory_arrow_right' },
  PREREQUISITE_OF: { label: 'Tiên quyết của', icon: 'route' },
  REQUIRES_SKILL: { label: 'Cần kỹ năng', icon: 'psychology' },
  ATTEMPTED: { label: 'Đã thử', icon: 'play_arrow' },
  STRUGGLES_WITH: { label: 'Đang yếu', icon: 'warning' },
  MASTERED: { label: 'Đã thành thạo', icon: 'workspace_premium' },
  HAS_ERROR_AT: { label: 'Mắc lỗi', icon: 'error' },
  PARTICIPATED_IN: { label: 'Tham gia', icon: 'event' },
  OCCURRED_IN: { label: 'Xảy ra trong', icon: 'event_note' },
  CONCERNS: { label: 'Liên quan', icon: 'link' },
  AUTHORED_BY: { label: 'Tác giả', icon: 'edit' },
  TEACHES: { label: 'Dạy', icon: 'school' },
  COMMENTED_ON: { label: 'Nhận xét', icon: 'comment' },
  MONITORS: { label: 'Theo dõi', icon: 'visibility' },
  SIMILAR_TO: { label: 'Tương đồng', icon: 'compare' },
  IMPROVED_VIA: { label: 'Cải thiện nhờ', icon: 'trending_up' },
  TARGETS: { label: 'Hướng tới', icon: 'target' },
  NEXT_AFTER: { label: 'Tiếp theo sau', icon: 'arrow_forward' },
}
