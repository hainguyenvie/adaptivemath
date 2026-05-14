/**
 * Hand-curated prerequisite + cross-skill edges between KNTT topics.
 *
 * Each entry says: `from` is a prerequisite of `to` (i.e. you should be
 * comfortable with `from` before tackling `to`). Edges across grades are
 * allowed — for example "Lượng giác lớp 10" prereqs "Hàm số lượng giác
 * lớp 11". `errorTags` enumerates typical mistake patterns at the target
 * topic that often trace back to the prerequisite — the narrative
 * generator surfaces these.
 */

export interface PrereqEdge {
  from: string
  to: string
  /** 0..1, higher = more critical dependency. */
  weight: number
  errorTags: string[]
}

export const TOPIC_PREREQS: ReadonlyArray<PrereqEdge> = [
  // ---- Lớp 10 ----
  {
    from: '0-KNTT-C1B1-X', // Mệnh đề
    to: '0-KNTT-C1B2-X', // Tập hợp
    weight: 0.85,
    errorTags: ['ký hiệu logic', 'phép suy luận'],
  },
  {
    from: '0-KNTT-C1B2-X',
    to: '0-KNTT-C2B3-X',
    weight: 0.75,
    errorTags: ['biểu diễn miền nghiệm', 'tập nghiệm'],
  },
  {
    from: '0-KNTT-C2B3-X',
    to: '0-KNTT-C2B4-X',
    weight: 0.9,
    errorTags: ['xét dấu', 'lập bảng biến thiên'],
  },
  {
    from: '0-KNTT-C3B5-X', // Hệ thức lượng - giá trị lượng giác
    to: '0-KNTT-C3B6-X',
    weight: 0.9,
    errorTags: ['công thức cộng', 'biến đổi tích thành tổng'],
  },
  {
    from: '0-KNTT-C4B7-X', // Vectơ - định nghĩa
    to: '0-KNTT-C4B8-X',
    weight: 0.95,
    errorTags: ['cộng vectơ', 'quy tắc hình bình hành'],
  },
  {
    from: '0-KNTT-C4B8-X',
    to: '0-KNTT-C4B9-X',
    weight: 0.85,
    errorTags: ['tích vô hướng', 'góc giữa hai vectơ'],
  },
  {
    from: '0-KNTT-C4B9-X',
    to: '0-KNTT-C4B10-X',
    weight: 0.8,
    errorTags: ['toạ độ vectơ trong mặt phẳng'],
  },
  {
    from: '0-KNTT-C4B10-X',
    to: '0-KNTT-C4B11-X',
    weight: 0.75,
    errorTags: ['phương trình đường thẳng', 'khoảng cách'],
  },
  {
    from: '0-KNTT-C5B12-X', // Thống kê - mô tả
    to: '0-KNTT-C5B13-X',
    weight: 0.8,
    errorTags: ['số trung bình', 'phương sai mẫu'],
  },
  {
    from: '0-KNTT-C5B13-X',
    to: '0-KNTT-C5B14-X',
    weight: 0.8,
    errorTags: ['biểu đồ tần số'],
  },

  // ---- Cross-grade: 10 → 11 ----
  {
    from: '0-KNTT-C3B5-X', // Lượng giác lớp 10
    to: '1-KNTT-C1B1-X', // Hàm số lượng giác lớp 11
    weight: 0.95,
    errorTags: ['công thức cộng', 'cung liên kết'],
  },
  {
    from: '0-KNTT-C3B6-X',
    to: '1-KNTT-C1B2-X',
    weight: 0.9,
    errorTags: ['phương trình lượng giác cơ bản'],
  },
  {
    from: '1-KNTT-C1B2-X',
    to: '1-KNTT-C1B3-X',
    weight: 0.85,
    errorTags: ['nghiệm tổng quát'],
  },
  {
    from: '1-KNTT-C1B3-X',
    to: '1-KNTT-C1B4-X',
    weight: 0.85,
    errorTags: ['phương trình bậc hai với sin/cos'],
  },

  // ---- Lớp 11 ----
  {
    from: '1-KNTT-C2B5-X', // Dãy số
    to: '1-KNTT-C2B6-X',
    weight: 0.9,
    errorTags: ['công bội', 'công sai'],
  },
  {
    from: '1-KNTT-C2B6-X',
    to: '1-KNTT-C2B7-X',
    weight: 0.85,
    errorTags: ['tổng n số hạng', 'cấp số nhân lùi vô hạn'],
  },
  {
    from: '1-KNTT-C2B7-X',
    to: '1-KNTT-C5B15-X',
    weight: 0.75,
    errorTags: ['giới hạn dãy', 'khái niệm hội tụ'],
  },
  {
    from: '1-KNTT-C3B8-X', // Thống kê - mẫu số liệu ghép nhóm
    to: '1-KNTT-C3B9-X',
    weight: 0.8,
    errorTags: ['phương sai mẫu ghép', 'độ lệch chuẩn'],
  },
  {
    from: '0-KNTT-C5B13-X',
    to: '1-KNTT-C3B8-X',
    weight: 0.85,
    errorTags: ['phương sai', 'số liệu ghép'],
  },

  // Quan hệ song song (hình học không gian lớp 11)
  {
    from: '1-KNTT-C4B10-X',
    to: '1-KNTT-C4B11-X',
    weight: 0.9,
    errorTags: ['vị trí tương đối hai đường thẳng'],
  },
  {
    from: '1-KNTT-C4B11-X',
    to: '1-KNTT-C4B12-X',
    weight: 0.85,
    errorTags: ['đường thẳng song song mặt phẳng'],
  },
  {
    from: '1-KNTT-C4B12-X',
    to: '1-KNTT-C4B13-X',
    weight: 0.85,
    errorTags: ['hai mặt phẳng song song', 'giao tuyến'],
  },
  {
    from: '1-KNTT-C4B13-X',
    to: '1-KNTT-C4B14-X',
    weight: 0.8,
    errorTags: ['phép chiếu song song'],
  },
  {
    from: '1-KNTT-C4B14-X',
    to: '1-KNTT-C7B26-X',
    weight: 0.85,
    errorTags: ['hình chiếu vuông góc'],
  },
  {
    from: '1-KNTT-C7B26-X',
    to: '1-KNTT-C7B27-X',
    weight: 0.9,
    errorTags: ['góc giữa đường và mặt', 'khoảng cách'],
  },

  // Giới hạn → Đạo hàm
  {
    from: '1-KNTT-C5B15-X',
    to: '1-KNTT-C5B16-X',
    weight: 0.9,
    errorTags: ['giới hạn hàm số', 'dạng vô định'],
  },
  {
    from: '1-KNTT-C5B16-X',
    to: '1-KNTT-C5B17-X',
    weight: 0.85,
    errorTags: ['hàm số liên tục'],
  },
  {
    from: '1-KNTT-C5B17-X',
    to: '1-KNTT-C9B31-X',
    weight: 0.95,
    errorTags: ['định nghĩa đạo hàm bằng giới hạn'],
  },

  // ---- Cross-grade: 11 → 12 ----
  {
    from: '1-KNTT-C9B31-X', // Đạo hàm
    to: '2-KNTT-C1B1-X', // Ứng dụng đạo hàm
    weight: 0.95,
    errorTags: ['đơn điệu', 'cực trị', 'GTLN GTNN'],
  },
  {
    from: '1-KNTT-C3B8-X',
    to: '2-KNTT-C3B9-X',
    weight: 0.85,
    errorTags: ['phân phối xác suất', 'biến ngẫu nhiên'],
  },
  {
    from: '2-KNTT-C3B9-X',
    to: '2-KNTT-C3B10-X',
    weight: 0.85,
    errorTags: ['kỳ vọng', 'phương sai biến ngẫu nhiên'],
  },
  {
    from: '0-KNTT-C4B11-X',
    to: '2-KNTT-C5B17-X', // Phương pháp toạ độ trong không gian
    weight: 0.85,
    errorTags: ['toạ độ điểm', 'vectơ trong không gian'],
  },

  // ---- Mệnh đề & tập hợp → suy luận chứng minh hình học ----
  {
    from: '0-KNTT-C1B1-X',
    to: '1-KNTT-C4B10-X',
    weight: 0.5,
    errorTags: ['lập luận chứng minh'],
  },

  // ---- Đại số tổ hợp → xác suất ----
  {
    from: '0-KNTT-C8B25-X',
    to: '2-KNTT-C3B9-X',
    weight: 0.8,
    errorTags: ['chỉnh hợp', 'tổ hợp', 'biến cố'],
  },
]

/**
 * Cross-topic foundational "skills" (rễ chung của cây tri thức) — the
 * thesis calls these `hệ rễ chung`. We model them as separate Skill nodes
 * so they can appear in narratives ("kỹ năng đọc đề đang chưa ổn …").
 */
export interface SkillSeed {
  id: string
  label: string
  /** Topic ids this skill underlies. */
  topicIds: string[]
}

export const FOUNDATIONAL_SKILLS: ReadonlyArray<SkillSeed> = [
  {
    id: 'skill-doc-de',
    label: 'Đọc & phân tích đề',
    topicIds: [],
  },
  {
    id: 'skill-bien-doi-dai-so',
    label: 'Biến đổi đại số',
    topicIds: [
      '0-KNTT-C2B3-X',
      '0-KNTT-C2B4-X',
      '1-KNTT-C1B3-X',
      '1-KNTT-C1B4-X',
      '1-KNTT-C5B15-X',
      '1-KNTT-C5B16-X',
      '1-KNTT-C9B31-X',
      '2-KNTT-C1B1-X',
    ],
  },
  {
    id: 'skill-suy-luan-hinh-hoc',
    label: 'Suy luận hình học',
    topicIds: [
      '0-KNTT-C4B7-X',
      '0-KNTT-C4B8-X',
      '0-KNTT-C4B9-X',
      '0-KNTT-C4B10-X',
      '0-KNTT-C4B11-X',
      '1-KNTT-C4B10-X',
      '1-KNTT-C4B11-X',
      '1-KNTT-C4B12-X',
      '1-KNTT-C4B13-X',
      '1-KNTT-C4B14-X',
      '1-KNTT-C7B26-X',
      '1-KNTT-C7B27-X',
    ],
  },
  {
    id: 'skill-kiem-tra-ket-qua',
    label: 'Kiểm tra kết quả',
    topicIds: [],
  },
  {
    id: 'skill-luong-giac',
    label: 'Công thức lượng giác',
    topicIds: [
      '0-KNTT-C3B5-X',
      '0-KNTT-C3B6-X',
      '1-KNTT-C1B1-X',
      '1-KNTT-C1B2-X',
      '1-KNTT-C1B3-X',
      '1-KNTT-C1B4-X',
    ],
  },
  {
    id: 'skill-xu-ly-so-lieu',
    label: 'Xử lý số liệu thống kê',
    topicIds: [
      '0-KNTT-C5B12-X',
      '0-KNTT-C5B13-X',
      '0-KNTT-C5B14-X',
      '1-KNTT-C3B8-X',
      '1-KNTT-C3B9-X',
      '2-KNTT-C3B9-X',
      '2-KNTT-C3B10-X',
    ],
  },
]
