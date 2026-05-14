/**
 * Seed teacher directory for GraphRAG.
 *
 * Each teacher has a topic specialty (`topicIds`), a short bio, and a
 * library of canned comments that the graph builder attaches to feedback
 * nodes. Names are real attributions taken from the KNTT source LaTeX so
 * the graph feels grounded; comments are mock.
 */

export interface TeacherSeed {
  id: string
  displayName: string
  avatar: string
  bio: string
  /** Topic ids this teacher specializes in (used for TEACHES edges). */
  topicIds: string[]
  /** Pool of comments — the graph picks 1-3 per teacher. */
  comments: string[]
  /** Topic-specific commentary keyed by topicId. */
  topicNotes?: Record<string, string>
}

export const TEACHERS: ReadonlyArray<TeacherSeed> = [
  {
    id: 'tch-huynh-cong-minh',
    displayName: 'Thầy Huỳnh Công Minh',
    avatar: '👨‍🏫',
    bio: 'Giáo viên Vectơ và Hệ thức lượng — ưu tiên rèn nền tảng hình học.',
    topicIds: ['0-KNTT-C3B5-X', '0-KNTT-C3B6-X', '0-KNTT-C4B7-X', '0-KNTT-C4B8-X'],
    comments: [
      'Học sinh cần củng cố các công thức cộng và biến đổi tích thành tổng trước khi vào phương trình lượng giác.',
      'Vẽ hình ra giấy trước khi giải — đây là bước HS thường bỏ qua.',
      'Khi gặp tam giác, hãy thử áp dụng định lý sin/cos trước khi dùng toạ độ.',
    ],
    topicNotes: {
      '0-KNTT-C3B5-X': 'Cẩn thận dấu của giá trị lượng giác theo từng góc phần tư.',
      '0-KNTT-C4B7-X': 'Quy tắc 3 điểm và quy tắc hình bình hành là gốc của mọi bài vectơ.',
    },
  },
  {
    id: 'tch-nguyen-tuan',
    displayName: 'Cô Nguyễn Tuấn',
    avatar: '👩‍🏫',
    bio: 'Chuyên sâu Mệnh đề & Tập hợp. Luôn đòi hỏi lập luận chặt chẽ.',
    topicIds: ['0-KNTT-C1B1-X', '0-KNTT-C1B2-X', '0-KNTT-C2B3-X'],
    comments: [
      'Phép suy luận logic phải rõ ràng — đừng bỏ bước trung gian.',
      'Khi viết tập hợp, kiểm tra điều kiện của biến trước khi liệt kê phần tử.',
    ],
    topicNotes: {
      '0-KNTT-C1B1-X': 'Mệnh đề kéo theo: phân biệt "P ⇒ Q" và "Q ⇒ P".',
    },
  },
  {
    id: 'tch-le-minh-cuong',
    displayName: 'Thầy Lê Minh Cường',
    avatar: '👨‍🏫',
    bio: 'Phụ trách Đạo hàm & Ứng dụng. Phong cách dạy bài bản, đề thi mẫu THPT.',
    topicIds: ['1-KNTT-C5B15-X', '1-KNTT-C5B16-X', '1-KNTT-C9B31-X', '2-KNTT-C1B1-X'],
    comments: [
      'Đạo hàm là công cụ — đừng học vẹt công thức, hãy hiểu định nghĩa giới hạn.',
      'Bài cực trị: luôn kiểm tra giá trị tại biên và điểm tới hạn.',
      'Khi xét tính đơn điệu, vẽ bảng biến thiên trước khi kết luận.',
    ],
    topicNotes: {
      '1-KNTT-C9B31-X': 'Quy tắc tính đạo hàm hợp là điểm HS hay sai nhất.',
      '2-KNTT-C1B1-X': 'Ứng dụng đạo hàm vào bài toán thực tế cần đặt biến cẩn thận.',
    },
  },
  {
    id: 'tch-hai-phung',
    displayName: 'Thầy Hải Phụng',
    avatar: '🧑‍🏫',
    bio: 'Chuyên hình học không gian lớp 11–12.',
    topicIds: [
      '1-KNTT-C4B10-X',
      '1-KNTT-C4B11-X',
      '1-KNTT-C4B12-X',
      '1-KNTT-C4B13-X',
      '1-KNTT-C4B14-X',
      '1-KNTT-C7B26-X',
      '1-KNTT-C7B27-X',
    ],
    comments: [
      'Vẽ hình 3D cẩn thận — nhiều lỗi đến từ hình vẽ sai.',
      'Quan hệ song song và vuông góc luôn xuất phát từ định nghĩa.',
    ],
    topicNotes: {
      '1-KNTT-C7B26-X': 'Hình chiếu vuông góc: xác định mặt phẳng chiếu trước khi tìm hình chiếu.',
    },
  },
  {
    id: 'tch-duong-cong-tao',
    displayName: 'Thầy Dương Công Tạo',
    avatar: '👨‍🏫',
    bio: 'Chuyên Dãy số & Cấp số. Mê toán rời rạc.',
    topicIds: ['1-KNTT-C2B5-X', '1-KNTT-C2B6-X', '1-KNTT-C2B7-X'],
    comments: [
      'Cấp số nhân lùi vô hạn: chú ý điều kiện |q| < 1.',
      'Phân biệt rõ công sai (cộng) và công bội (nhân) ngay từ đầu.',
    ],
    topicNotes: {
      '1-KNTT-C2B7-X': 'Sgợi ý: tổng cấp số nhân lùi vô hạn dùng cho bài lãi kép.',
    },
  },
  {
    id: 'tch-huynh-tri-thien',
    displayName: 'Cô Huỳnh Trí Thiện',
    avatar: '👩‍🏫',
    bio: 'Chuyên Thống kê & Xác suất.',
    topicIds: [
      '0-KNTT-C5B12-X',
      '0-KNTT-C5B13-X',
      '0-KNTT-C5B14-X',
      '1-KNTT-C3B8-X',
      '1-KNTT-C3B9-X',
    ],
    comments: [
      'Phân biệt phương sai mẫu và phương sai tổng thể.',
      'Khi đọc bảng tần số, xác định tâm khoảng trước khi tính trung bình.',
    ],
    topicNotes: {
      '1-KNTT-C3B9-X': 'Độ lệch chuẩn = √phương sai — đừng quên căn bậc hai.',
    },
  },
  {
    id: 'tch-huy-tran',
    displayName: 'Thầy Huy Trần',
    avatar: '🧑‍🏫',
    bio: 'Chuyên Bất phương trình & Hệ. Đề thi sâu, phương pháp đa dạng.',
    topicIds: ['0-KNTT-C2B3-X', '0-KNTT-C2B4-X'],
    comments: [
      'Lập bảng xét dấu trước khi kết luận miền nghiệm.',
      'Bất phương trình tích/thương: nhớ điều kiện xác định.',
    ],
  },
  {
    id: 'tch-huynh-van-quy',
    displayName: 'Cô Huỳnh Văn Quy',
    avatar: '👩‍🏫',
    bio: 'Phụ trách Mệnh đề lớp 10 — chú trọng tư duy logic.',
    topicIds: ['0-KNTT-C1B1-X'],
    comments: ['Học sinh nên đọc bài 5 phút trước giờ học để kích hoạt từ vựng logic.'],
  },
  {
    id: 'tch-nguyen-huu-cuong',
    displayName: 'Thầy Nguyễn Hữu Cường',
    avatar: '👨‍🏫',
    bio: 'Chuyên Tổ hợp & Xác suất rời rạc.',
    topicIds: ['0-KNTT-C8B25-X', '2-KNTT-C3B9-X', '2-KNTT-C3B10-X'],
    comments: [
      'Phân biệt rõ chỉnh hợp/tổ hợp dựa trên thứ tự.',
      'Khi đếm biến cố, vẽ sơ đồ cây nếu chưa quen.',
    ],
  },
  {
    id: 'tch-le-phuc',
    displayName: 'Thầy Lê Phúc',
    avatar: '🧑‍🏫',
    bio: 'Chuyên Hệ thức lượng & Lượng giác lớp 11.',
    topicIds: [
      '0-KNTT-C3B5-X',
      '0-KNTT-C3B6-X',
      '1-KNTT-C1B1-X',
      '1-KNTT-C1B2-X',
      '1-KNTT-C1B3-X',
      '1-KNTT-C1B4-X',
    ],
    comments: [
      'Học công thức theo nhóm logic — không học rời.',
      'Nghiệm tổng quát: nhớ thêm 2kπ hoặc kπ tuỳ phương trình.',
    ],
    topicNotes: {
      '1-KNTT-C1B3-X': 'Phương trình sinx = a: phân chia trường hợp a ngoài [-1, 1].',
    },
  },
  {
    id: 'tch-mai-thai-phong',
    displayName: 'Thầy Mai Thái Phong',
    avatar: '👨‍🏫',
    bio: 'Chuyên Toạ độ trong không gian lớp 12.',
    topicIds: ['2-KNTT-C5B17-X'],
    comments: ['Tính khoảng cách từ điểm tới mặt phẳng: nhớ công thức và kiểm tra dấu.'],
  },
  {
    id: 'tch-nha-nguyen',
    displayName: 'Cô Nhã Nguyễn',
    avatar: '👩‍🏫',
    bio: 'Tổng phụ trách lớp — chú ý kỷ luật và tâm lý học tập.',
    topicIds: [],
    comments: [
      'Bạn học đang có dấu hiệu mất tập trung — nên giảm thời lượng phiên xuống còn 30 phút.',
      'Hôm nay làm bài rất tập trung. Tiếp tục giữ phong độ này nhé!',
      'Cần dành thêm thời gian cho phần Hình học, có dấu hiệu né tránh.',
    ],
  },
]
