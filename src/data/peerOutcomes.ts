/**
 * Seed peer "success stories" for GraphRAG.
 *
 * Each outcome models a concrete intervention recipe (theory + practice +
 * review) that improved a specific topic for a cohort of peers. The graph
 * builder creates `activity` nodes from these and connects them with
 * IMPROVED_VIA edges from the peer entities that referenced them.
 *
 * Narratives use these to say things like:
 *   "12 bạn có hồ sơ tương tự đã cải thiện Logarit 35% sau khi đọc
 *    Tính chất logarit + làm 8 câu N rồi 4 câu V."
 */

import type { ActivityEntity } from '../types/graphRag'

export interface PeerOutcomeSeed {
  id: string
  /** Topic this outcome targets. */
  topicId: string
  /** Activity recipe. */
  activity: Omit<ActivityEntity, 'id' | 'type' | 'label' | 'subtitle' | 'vector'>
  /** Mean improvement in mastery (0..1) for peers who followed. */
  meanImprovement: number
  /** Number of peers that contributed to this outcome aggregate. */
  cohortSize: number
  /** Short narrative for cards. */
  story: string
  /** Optional steps describing the chain (for richer narratives). */
  steps?: string[]
}

export const PEER_OUTCOMES: ReadonlyArray<PeerOutcomeSeed> = [
  {
    id: 'out-vec-foundation',
    topicId: '0-KNTT-C4B7-X',
    activity: {
      kind: 'theory',
      topicId: '0-KNTT-C4B7-X',
      levels: ['N', 'H'],
      recipe:
        'Đọc lại Quy tắc 3 điểm → làm 5 câu N → 3 câu H → ôn sau 3 ngày bằng 4 câu mix.',
      estimatedMinutes: 55,
    },
    meanImprovement: 0.31,
    cohortSize: 18,
    story:
      'Học sinh có hồ sơ Vectơ yếu thường tiến bộ rõ nhất khi quay về định nghĩa và quy tắc 3 điểm.',
    steps: [
      'Bước 1 — Đọc định nghĩa Vectơ + Quy tắc 3 điểm (8 phút)',
      'Bước 2 — Làm 5 câu mức N để củng cố ký hiệu',
      'Bước 3 — Làm 3 câu H về cộng/trừ vectơ',
      'Bước 4 — Ôn lại sau 3 ngày bằng 4 câu mix N-H',
    ],
  },
  {
    id: 'out-luonggiac-formulae',
    topicId: '0-KNTT-C3B6-X',
    activity: {
      kind: 'remedial',
      topicId: '0-KNTT-C3B6-X',
      levels: ['N', 'H'],
      recipe:
        'Flashcard 12 công thức cộng/biến đổi → mini-quiz 5 câu → biến thể gần 3 câu.',
      estimatedMinutes: 40,
    },
    meanImprovement: 0.28,
    cohortSize: 22,
    story:
      'Học sinh hay lẫn công thức cộng & tích thành tổng có tiến bộ nhanh khi luyện flashcard rồi mini-quiz.',
    steps: [
      'Bước 1 — Flashcard nhóm công thức cộng (10 phút)',
      'Bước 2 — Mini-quiz 5 câu nhận biết',
      'Bước 3 — Biến thể gần 3 câu vận dụng',
    ],
  },
  {
    id: 'out-bpt-mastery',
    topicId: '0-KNTT-C2B4-X',
    activity: {
      kind: 'practice',
      topicId: '0-KNTT-C2B4-X',
      levels: ['H', 'V'],
      recipe:
        'Học mẫu xét dấu → 6 câu H bảng biến thiên → 3 câu V bất phương trình tích/thương.',
      estimatedMinutes: 60,
    },
    meanImprovement: 0.34,
    cohortSize: 14,
    story:
      'Học sinh nắm vững bảng xét dấu thường vượt qua bài bất phương trình tích/thương dễ dàng.',
  },
  {
    id: 'out-thongke-warmup',
    topicId: '0-KNTT-C5B12-X',
    activity: {
      kind: 'theory',
      topicId: '0-KNTT-C5B12-X',
      levels: ['N'],
      recipe: 'Đọc khái niệm trung bình + biểu đồ → 4 câu N đọc bảng.',
      estimatedMinutes: 25,
    },
    meanImprovement: 0.22,
    cohortSize: 24,
    story: 'Đa số HS lớp 10 lấy đà Thống kê nhanh nhất bằng warm-up đọc bảng tần số.',
  },
  {
    id: 'out-thongke-variance',
    topicId: '0-KNTT-C5B13-X',
    activity: {
      kind: 'remedial',
      topicId: '0-KNTT-C5B13-X',
      levels: ['H'],
      recipe: 'Xem ví dụ phương sai mẫu → tính tay 1 bài → đối chiếu công thức.',
      estimatedMinutes: 30,
    },
    meanImprovement: 0.26,
    cohortSize: 16,
    story:
      'HS hay nhầm phương sai và độ lệch chuẩn. Tính tay 1 bài rồi so công thức giúp nhớ lâu.',
  },
  {
    id: 'out-thongke-ghep-nhom',
    topicId: '1-KNTT-C3B8-X',
    activity: {
      kind: 'practice',
      topicId: '1-KNTT-C3B8-X',
      levels: ['H', 'V'],
      recipe:
        'Đọc lý thuyết mẫu ghép nhóm → 4 câu H tính trung bình ghép → 2 câu V phương sai.',
      estimatedMinutes: 45,
    },
    meanImprovement: 0.29,
    cohortSize: 11,
    story:
      'Thống kê mẫu ghép nhóm khó vì tâm khoảng — luyện theo bộ 4N-2H-2V hiệu quả nhất.',
  },
  {
    id: 'out-luonggiac-bridge11',
    topicId: '1-KNTT-C1B2-X',
    activity: {
      kind: 'theory',
      topicId: '1-KNTT-C1B2-X',
      levels: ['N', 'H'],
      recipe:
        'Cầu nối lớp 10–11: ôn nhanh công thức cộng → bài tập sinx=a / cosx=a → 3 câu nghiệm tổng quát.',
      estimatedMinutes: 50,
    },
    meanImprovement: 0.33,
    cohortSize: 19,
    story:
      'Hơn 60% HS lớp 11 yếu lượng giác là do nền lớp 10 chưa chắc — cầu nối này khắc phục được.',
    steps: [
      'Bước 1 — Ôn 5 phút công thức cộng từ lớp 10',
      'Bước 2 — Học cách giải sinx = a, cosx = a',
      'Bước 3 — 3 câu nghiệm tổng quát + 2kπ',
    ],
  },
  {
    id: 'out-day-so-bridge',
    topicId: '1-KNTT-C2B7-X',
    activity: {
      kind: 'practice',
      topicId: '1-KNTT-C2B7-X',
      levels: ['H', 'V'],
      recipe:
        'Đọc Cấp số nhân lùi vô hạn → tính tổng 3 bài → ứng dụng lãi kép 1 bài.',
      estimatedMinutes: 40,
    },
    meanImprovement: 0.27,
    cohortSize: 13,
    story: 'Bài lãi kép là động lực rất tốt để hiểu sâu cấp số nhân.',
  },
  {
    id: 'out-capso-nhan-card',
    topicId: '1-KNTT-C2B6-X',
    activity: {
      kind: 'remedial',
      topicId: '1-KNTT-C2B6-X',
      levels: ['N', 'H'],
      recipe: 'Flashcard công bội + 5 câu nhận biết → 3 câu thông hiểu.',
      estimatedMinutes: 30,
    },
    meanImprovement: 0.24,
    cohortSize: 10,
    story: 'Phân biệt công bội/công sai bằng flashcard giúp HS chống nhầm.',
  },
  {
    id: 'out-gioihan-intuition',
    topicId: '1-KNTT-C5B15-X',
    activity: {
      kind: 'theory',
      topicId: '1-KNTT-C5B15-X',
      levels: ['N', 'H'],
      recipe:
        'Xem trực giác hội tụ → tính 4 giới hạn dãy mẫu → so sánh đồ thị.',
      estimatedMinutes: 45,
    },
    meanImprovement: 0.30,
    cohortSize: 17,
    story: 'Học giới hạn bằng trực giác đồ thị giúp HS không sợ khái niệm trừu tượng.',
  },
  {
    id: 'out-daoham-foundation',
    topicId: '1-KNTT-C9B31-X',
    activity: {
      kind: 'theory',
      topicId: '1-KNTT-C9B31-X',
      levels: ['N', 'H'],
      recipe:
        'Đọc định nghĩa đạo hàm bằng giới hạn → 3 ví dụ → 4 câu N công thức cơ bản.',
      estimatedMinutes: 55,
    },
    meanImprovement: 0.32,
    cohortSize: 21,
    story:
      'HS hiểu định nghĩa đạo hàm qua giới hạn thường ít gặp khó ở chương Ứng dụng đạo hàm.',
    steps: [
      'Bước 1 — Đọc định nghĩa và 2 ví dụ minh hoạ',
      'Bước 2 — Tự đạo hàm 3 hàm cơ bản bằng định nghĩa',
      'Bước 3 — 4 câu N kiểm tra công thức',
    ],
  },
  {
    id: 'out-hh-vuonggoc-bridge',
    topicId: '1-KNTT-C7B26-X',
    activity: {
      kind: 'practice',
      topicId: '1-KNTT-C7B26-X',
      levels: ['H', 'V'],
      recipe:
        'Vẽ tay hình chiếu → 4 câu H xác định hình chiếu → 2 câu V khoảng cách.',
      estimatedMinutes: 50,
    },
    meanImprovement: 0.28,
    cohortSize: 12,
    story: 'Quan hệ vuông góc khó vì hình 3D — vẽ tay là bước không thể bỏ.',
  },
  {
    id: 'out-tohop-deep',
    topicId: '0-KNTT-C8B25-X',
    activity: {
      kind: 'practice',
      topicId: '0-KNTT-C8B25-X',
      levels: ['V', 'T'],
      recipe:
        'Vẽ sơ đồ cây → 4 câu V đếm trường hợp → 2 câu T tổ hợp chập k.',
      estimatedMinutes: 60,
    },
    meanImprovement: 0.36,
    cohortSize: 9,
    story: 'Đếm bằng sơ đồ cây trước khi áp công thức là kỹ thuật của HS giỏi.',
  },
  {
    id: 'out-udd-thpt',
    topicId: '2-KNTT-C1B1-X',
    activity: {
      kind: 'practice',
      topicId: '2-KNTT-C1B1-X',
      levels: ['V', 'T'],
      recipe:
        'Đề mẫu THPT QG: 5 câu V đơn điệu/cực trị → 2 câu T bài toán thực tế.',
      estimatedMinutes: 70,
    },
    meanImprovement: 0.30,
    cohortSize: 23,
    story: 'Luyện theo đề mẫu THPT QG giúp HS lớp 12 quen format trước thi.',
  },
  {
    id: 'out-fundamentals-restart',
    topicId: '0-KNTT-C1B1-X',
    activity: {
      kind: 'theory',
      topicId: '0-KNTT-C1B1-X',
      levels: ['N'],
      recipe: 'Đọc lại Mệnh đề + 5 câu N + tự tóm tắt bằng sơ đồ.',
      estimatedMinutes: 35,
    },
    meanImprovement: 0.25,
    cohortSize: 7,
    story:
      'Khi HS mất nền, quay về Mệnh đề & Tập hợp là cách nhanh nhất để xây lại lòng tin.',
  },
]
