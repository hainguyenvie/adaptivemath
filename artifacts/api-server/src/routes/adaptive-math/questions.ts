// Mock question bank with misconception tags per distractor
export const questionBank = [
  // Phân số questions
  {
    id: "q-phan-so-001",
    text: "Tính: \\(\\frac{1}{3} + \\frac{1}{4}\\)",
    latex: "\\frac{1}{3} + \\frac{1}{4} = ?",
    topicId: "phan-so",
    difficulty: 1.5,
    difficultyLabel: "NORMAL" as const,
    options: [
      { id: "q-phan-so-001-a", text: "\\(\\frac{7}{12}\\)", latex: "\\frac{7}{12}", isCorrect: true, misconceptionTag: null },
      { id: "q-phan-so-001-b", text: "\\(\\frac{2}{7}\\)", latex: "\\frac{2}{7}", isCorrect: false, misconceptionTag: "quen-quy-dong-mau-so" },
      { id: "q-phan-so-001-c", text: "\\(\\frac{1}{12}\\)", latex: "\\frac{1}{12}", isCorrect: false, misconceptionTag: "nham-cong-thanh-nhan" },
      { id: "q-phan-so-001-d", text: "\\(\\frac{2}{12}\\)", latex: "\\frac{2}{12}", isCorrect: false, misconceptionTag: "quen-don-gian-ket-qua" },
    ],
    explanation: "Để cộng hai phân số khác mẫu, ta cần quy đồng mẫu số: \\(\\frac{1}{3} + \\frac{1}{4} = \\frac{4}{12} + \\frac{3}{12} = \\frac{7}{12}\\)",
  },
  {
    id: "q-phan-so-002",
    text: "Tính: \\(\\frac{3}{4} \\times \\frac{2}{5}\\)",
    latex: "\\frac{3}{4} \\times \\frac{2}{5} = ?",
    topicId: "phan-so",
    difficulty: 1.8,
    difficultyLabel: "NORMAL" as const,
    options: [
      { id: "q-phan-so-002-a", text: "\\(\\frac{6}{20} = \\frac{3}{10}\\)", latex: "\\frac{3}{10}", isCorrect: true, misconceptionTag: null },
      { id: "q-phan-so-002-b", text: "\\(\\frac{5}{9}\\)", latex: "\\frac{5}{9}", isCorrect: false, misconceptionTag: "nham-nhan-cong-phan-so" },
      { id: "q-phan-so-002-c", text: "\\(\\frac{15}{8}\\)", latex: "\\frac{15}{8}", isCorrect: false, misconceptionTag: "nham-vi-tri-tu-mau" },
      { id: "q-phan-so-002-d", text: "\\(\\frac{6}{9}\\)", latex: "\\frac{6}{9}", isCorrect: false, misconceptionTag: "quen-don-gian" },
    ],
    explanation: "Nhân hai phân số: tử nhân tử, mẫu nhân mẫu: \\(\\frac{3}{4} \\times \\frac{2}{5} = \\frac{3 \\times 2}{4 \\times 5} = \\frac{6}{20} = \\frac{3}{10}\\)",
  },
  {
    id: "q-phan-so-003",
    text: "Rút gọn phân số \\(\\frac{24}{36}\\)",
    latex: "\\frac{24}{36}",
    topicId: "phan-so",
    difficulty: 2.0,
    difficultyLabel: "HARD" as const,
    options: [
      { id: "q-phan-so-003-a", text: "\\(\\frac{2}{3}\\)", latex: "\\frac{2}{3}", isCorrect: true, misconceptionTag: null },
      { id: "q-phan-so-003-b", text: "\\(\\frac{4}{6}\\)", latex: "\\frac{4}{6}", isCorrect: false, misconceptionTag: "rut-gon-chua-het-ucln" },
      { id: "q-phan-so-003-c", text: "\\(\\frac{12}{18}\\)", latex: "\\frac{12}{18}", isCorrect: false, misconceptionTag: "rut-gon-chua-het-ucln" },
      { id: "q-phan-so-003-d", text: "\\(\\frac{8}{12}\\)", latex: "\\frac{8}{12}", isCorrect: false, misconceptionTag: "rut-gon-chua-het-ucln" },
    ],
    explanation: "ƯCLN(24,36) = 12. Chia cả tử và mẫu cho 12: \\(\\frac{24 \\div 12}{36 \\div 12} = \\frac{2}{3}\\)",
  },

  // Biểu thức đại số
  {
    id: "q-biet-001",
    text: "Tính giá trị biểu thức \\(2x + 3\\) khi \\(x = 4\\)",
    latex: "2x + 3 \\text{ với } x = 4",
    topicId: "bieu-thuc-dai-so",
    difficulty: 2.0,
    difficultyLabel: "NORMAL" as const,
    options: [
      { id: "q-biet-001-a", text: "11", latex: "11", isCorrect: true, misconceptionTag: null },
      { id: "q-biet-001-b", text: "14", latex: "14", isCorrect: false, misconceptionTag: "nham-2x-la-2-nhan-x-cong-3" },
      { id: "q-biet-001-c", text: "9", latex: "9", isCorrect: false, misconceptionTag: "quen-nhan-he-so-voi-bien" },
      { id: "q-biet-001-d", text: "7", latex: "7", isCorrect: false, misconceptionTag: "thay-the-sai-gia-tri" },
    ],
    explanation: "Thay x = 4 vào biểu thức: \\(2(4) + 3 = 8 + 3 = 11\\)",
  },
  {
    id: "q-biet-002",
    text: "Khai triển: \\(2(x + 3)\\)",
    latex: "2(x + 3) = ?",
    topicId: "bieu-thuc-dai-so",
    difficulty: 2.5,
    difficultyLabel: "NORMAL" as const,
    options: [
      { id: "q-biet-002-a", text: "\\(2x + 6\\)", latex: "2x + 6", isCorrect: true, misconceptionTag: null },
      { id: "q-biet-002-b", text: "\\(2x + 3\\)", latex: "2x + 3", isCorrect: false, misconceptionTag: "nham-tinh-chat-phan-phoi" },
      { id: "q-biet-002-c", text: "\\(x + 6\\)", latex: "x + 6", isCorrect: false, misconceptionTag: "quen-nhan-he-so" },
      { id: "q-biet-002-d", text: "\\(2x + 5\\)", latex: "2x + 5", isCorrect: false, misconceptionTag: "tinh-sai-tich" },
    ],
    explanation: "Áp dụng tính chất phân phối: \\(2(x + 3) = 2 \\cdot x + 2 \\cdot 3 = 2x + 6\\)",
  },
  {
    id: "q-biet-003",
    text: "Tìm x biết: \\(2(x + 3) = 10\\)",
    latex: "2(x + 3) = 10",
    topicId: "bieu-thuc-dai-so",
    difficulty: 3.0,
    difficultyLabel: "HARD" as const,
    options: [
      { id: "q-biet-003-a", text: "\\(x = 2\\)", latex: "x = 2", isCorrect: true, misconceptionTag: null },
      { id: "q-biet-003-b", text: "\\(x = 7\\)", latex: "x = 7", isCorrect: false, misconceptionTag: "quen-chia-2-ve-cho-2" },
      { id: "q-biet-003-c", text: "\\(x = 4\\)", latex: "x = 4", isCorrect: false, misconceptionTag: "nham-tinh-chat-phan-phoi" },
      { id: "q-biet-003-d", text: "\\(x = 5\\)", latex: "x = 5", isCorrect: false, misconceptionTag: "tinh-sai-buoc-chia" },
    ],
    explanation: "Bước 1: \\(2(x+3) = 10 \\Rightarrow x+3 = 5\\) (chia hai vế cho 2). Bước 2: \\(x = 5 - 3 = 2\\)",
  },

  // Phương trình bậc nhất
  {
    id: "q-pt-001",
    text: "Giải phương trình: \\(3x - 6 = 9\\)",
    latex: "3x - 6 = 9",
    topicId: "phuong-trinh-bac-1",
    difficulty: 2.8,
    difficultyLabel: "NORMAL" as const,
    options: [
      { id: "q-pt-001-a", text: "\\(x = 5\\)", latex: "x = 5", isCorrect: true, misconceptionTag: null },
      { id: "q-pt-001-b", text: "\\(x = 1\\)", latex: "x = 1", isCorrect: false, misconceptionTag: "quen-cong-6-truoc-khi-chia" },
      { id: "q-pt-001-c", text: "\\(x = 3\\)", latex: "x = 3", isCorrect: false, misconceptionTag: "tinh-sai-buoc-chia" },
      { id: "q-pt-001-d", text: "\\(x = 9\\)", latex: "x = 9", isCorrect: false, misconceptionTag: "quen-buoc-chuyen-ve" },
    ],
    explanation: "\\(3x - 6 = 9 \\Rightarrow 3x = 15 \\Rightarrow x = 5\\)",
  },
  {
    id: "q-pt-002",
    text: "Giải phương trình: \\(\\frac{x}{2} + 3 = 7\\)",
    latex: "\\frac{x}{2} + 3 = 7",
    topicId: "phuong-trinh-bac-1",
    difficulty: 3.0,
    difficultyLabel: "HARD" as const,
    options: [
      { id: "q-pt-002-a", text: "\\(x = 8\\)", latex: "x = 8", isCorrect: true, misconceptionTag: null },
      { id: "q-pt-002-b", text: "\\(x = 4\\)", latex: "x = 4", isCorrect: false, misconceptionTag: "quen-nhan-2-sau-khi-tru" },
      { id: "q-pt-002-c", text: "\\(x = 2\\)", latex: "x = 2", isCorrect: false, misconceptionTag: "tinh-sai-buoc-nhan" },
      { id: "q-pt-002-d", text: "\\(x = 20\\)", latex: "x = 20", isCorrect: false, misconceptionTag: "nham-thu-tu-buoc-giai" },
    ],
    explanation: "\\(\\frac{x}{2} + 3 = 7 \\Rightarrow \\frac{x}{2} = 4 \\Rightarrow x = 8\\)",
  },

  // Tam giác
  {
    id: "q-tg-001",
    text: "Tam giác ABC có AB = 5cm, BC = 7cm, CA = 9cm. Góc nào lớn nhất?",
    latex: null,
    topicId: "tam-giac",
    difficulty: 2.2,
    difficultyLabel: "NORMAL" as const,
    options: [
      { id: "q-tg-001-a", text: "Góc B (đối diện với CA = 9cm)", latex: null, isCorrect: true, misconceptionTag: null },
      { id: "q-tg-001-b", text: "Góc A (đối diện với BC = 7cm)", latex: null, isCorrect: false, misconceptionTag: "nham-quan-he-goc-va-canh" },
      { id: "q-tg-001-c", text: "Góc C (đối diện với AB = 5cm)", latex: null, isCorrect: false, misconceptionTag: "nham-goc-nho-voi-goc-lon" },
      { id: "q-tg-001-d", text: "Các góc bằng nhau", latex: null, isCorrect: false, misconceptionTag: "nham-tam-giac-deu" },
    ],
    explanation: "Trong tam giác, cạnh dài hơn đối diện với góc lớn hơn. CA = 9cm là cạnh dài nhất, đối diện với góc B nên góc B lớn nhất.",
  },

  // Số nguyên
  {
    id: "q-sn-001",
    text: "Tính: \\((-5) + (-3)\\)",
    latex: "(-5) + (-3) = ?",
    topicId: "so-nguyen",
    difficulty: 1.2,
    difficultyLabel: "EASY" as const,
    options: [
      { id: "q-sn-001-a", text: "-8", latex: "-8", isCorrect: true, misconceptionTag: null },
      { id: "q-sn-001-b", text: "8", latex: "8", isCorrect: false, misconceptionTag: "quen-dau-am" },
      { id: "q-sn-001-c", text: "-2", latex: "-2", isCorrect: false, misconceptionTag: "nham-cong-tru-so-am" },
      { id: "q-sn-001-d", text: "2", latex: "2", isCorrect: false, misconceptionTag: "nham-ca-phep-tinh-va-dau" },
    ],
    explanation: "Cộng hai số nguyên âm: \\((-5) + (-3) = -(5+3) = -8\\)",
  },
  {
    id: "q-sn-002",
    text: "Tính: \\(7 - (-4)\\)",
    latex: "7 - (-4) = ?",
    topicId: "so-nguyen",
    difficulty: 1.5,
    difficultyLabel: "NORMAL" as const,
    options: [
      { id: "q-sn-002-a", text: "11", latex: "11", isCorrect: true, misconceptionTag: null },
      { id: "q-sn-002-b", text: "3", latex: "3", isCorrect: false, misconceptionTag: "nham-dau-khi-tru-so-am" },
      { id: "q-sn-002-c", text: "-11", latex: "-11", isCorrect: false, misconceptionTag: "nham-dau-ket-qua" },
      { id: "q-sn-002-d", text: "-3", latex: "-3", isCorrect: false, misconceptionTag: "nham-nhieu-dau" },
    ],
    explanation: "Trừ số nguyên âm = cộng số đối: \\(7 - (-4) = 7 + 4 = 11\\)",
  },
];

export default questionBank;
