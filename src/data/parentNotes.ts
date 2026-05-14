/**
 * Mock parents + their notes about the current student. These feed the
 * Parent → Student MONITORS edge and feedback nodes in the graph.
 */

export interface ParentSeed {
  id: string
  displayName: string
  avatar: string
  relation: 'mẹ' | 'bố' | 'phụ huynh'
  /** Free-text notes (positive + concern + suggestion mixed). */
  notes: string[]
}

export const PARENTS: ReadonlyArray<ParentSeed> = [
  {
    id: 'par-me-linh',
    displayName: 'Cô Linh (Mẹ)',
    avatar: '👩',
    relation: 'mẹ',
    notes: [
      'Tuần này con học đều, mỗi tối 30 phút không cần nhắc.',
      'Cuối tuần con bị phân tâm bởi điện thoại — nên giữ phiên ngắn 25 phút.',
      'Khi học Hình học không gian con có vẻ rất nản. Cần hỗ trợ.',
      'Đợt thi giữa kỳ tới, gia đình mong con tập trung chính vào Đại số.',
    ],
  },
  {
    id: 'par-bo-tuan',
    displayName: 'Chú Tuấn (Bố)',
    avatar: '👨',
    relation: 'bố',
    notes: [
      'Con bắt đầu tự lên kế hoạch — đáng khen.',
      'Quan sát thấy con học buổi tối hiệu quả hơn buổi sáng.',
      'Mong hệ thống nhắc con ôn lại các phần đã sai sau 3 ngày.',
    ],
  },
  {
    id: 'par-co-hoa',
    displayName: 'Cô Hoa (Bác)',
    avatar: '🧓',
    relation: 'phụ huynh',
    notes: [
      'Bé có động lực mỗi khi đạt huy hiệu mới — duy trì gamification.',
      'Khi mệt bé hay bỏ lý thuyết, nên có pomodoro nhắc nghỉ.',
    ],
  },
]
