import { Router, type IRouter } from "express";
import {
  GetTutorHintBody,
  GetTutorHintResponse,
  SendTutorMessageBody,
  SendTutorMessageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const socratiqueHints: Record<number, { type: string; template: string }> = {
  1: {
    type: "CLARIFICATION",
    template: "Hãy nghĩ lại về khái niệm cơ bản. {concept_hint}. Em có nhớ quy tắc này không?",
  },
  2: {
    type: "ASSUMPTIONS",
    template: "Bước đầu tiên là {step_hint}. Em đang giả định gì về bài này? Liệu giả định đó có đúng không?",
  },
  3: {
    type: "EVIDENCE",
    template: "Hãy thử kiểm tra: {check_hint}. Thay số vào và xem kết quả có hợp lý không?",
  },
  4: {
    type: "IMPLICATIONS",
    template: "Đây là lời giải từng bước: {solution_hint}",
  },
};

const mockHintsByQuestion: Record<string, Record<number, { concept_hint: string; step_hint: string; check_hint: string; solution_hint: string }>> = {
  "q-biet-003": {
    1: { concept_hint: "Tính chất phân phối: a(b+c) = ab + ac", step_hint: "khai triển vế trái", check_hint: "thay x=2 vào 2(x+3)", solution_hint: "2(x+3)=10 → x+3=5 → x=2" },
    2: { concept_hint: "Chia cả hai vế cho cùng một số", step_hint: "chia cả hai vế của phương trình cho 2", check_hint: "2(2+3) = 2×5 = 10 ✓", solution_hint: "Bước 1: Chia hai vế cho 2: x+3=5. Bước 2: Trừ 3 hai vế: x=2" },
    3: { concept_hint: "x+3=5, vậy x = ?", step_hint: "trừ 3 từ cả hai vế của phương trình x+3=5", check_hint: "5-3=2", solution_hint: "2(x+3)=10 → x+3=5 → x=5-3=2" },
    4: { concept_hint: "", step_hint: "", check_hint: "", solution_hint: "Bước 1: 2(x+3) = 10. Bước 2: Chia hai vế cho 2: x+3 = 5. Bước 3: Trừ 3 hai vế: x = 5-3 = 2. Vậy x = 2." },
  },
  "q-phan-so-001": {
    1: { concept_hint: "Muốn cộng phân số, mẫu số phải bằng nhau", step_hint: "tìm mẫu số chung của 3 và 4", check_hint: "BSCNN(3,4) = 12", solution_hint: "1/3 + 1/4 = 4/12 + 3/12 = 7/12" },
    2: { concept_hint: "BSCNN(3,4) = 12", step_hint: "đổi 1/3 thành ?/12 và 1/4 thành ?/12", check_hint: "1/3 = 4/12, 1/4 = 3/12", solution_hint: "Bước 1: Mẫu chung = 12. Bước 2: 1/3 = 4/12. Bước 3: 1/4 = 3/12. Bước 4: 4/12 + 3/12 = 7/12" },
    3: { concept_hint: "1/3 = 4/12 vì 3×4=12", step_hint: "cộng hai phân số cùng mẫu", check_hint: "4 + 3 = 7, vậy kết quả là 7/12", solution_hint: "4/12 + 3/12 = (4+3)/12 = 7/12" },
    4: { concept_hint: "", step_hint: "", check_hint: "", solution_hint: "Bước 1: Tìm BSCNN(3,4) = 12. Bước 2: Quy đồng: 1/3 = 4/12, 1/4 = 3/12. Bước 3: Cộng: 4/12 + 3/12 = 7/12." },
  },
};

const stellaResponses = [
  {
    patterns: ["phân số", "mẫu số", "tử số"],
    response: "Câu hỏi hay về phân số! Hãy nhớ rằng khi cộng hay trừ phân số, mẫu số phải bằng nhau trước. Em đã tìm bội số chung nhỏ nhất chưa?",
    type: "CLARIFICATION",
  },
  {
    patterns: ["phương trình", "ẩn", "giải"],
    response: "Khi giải phương trình, mục tiêu là tách ẩn ra một mình ở một vế. Em cần thực hiện các phép tính ngược lại theo thứ tự ngược với thứ tự tính toán.",
    type: "IMPLICATIONS",
  },
  {
    patterns: ["nhân", "khai triển", "phân phối"],
    response: "Tính chất phân phối là a(b+c) = ab + ac. Điều quan trọng là phải nhân hệ số với TẤT CẢ các số hạng bên trong ngoặc, không chỉ số hạng đầu tiên. Em có thể thử lại không?",
    type: "ASSUMPTIONS",
  },
  {
    patterns: ["không hiểu", "khó quá", "giúp"],
    response: "Không sao cả! Mọi học sinh đều có lúc cảm thấy khó khăn. Hãy thử chia nhỏ bài toán ra. Bước đầu tiên nên làm gì? Đôi khi chỉ cần bắt đầu là đủ để tìm ra hướng đi.",
    type: "CLARIFICATION",
  },
  {
    patterns: ["đúng không", "kiểm tra", "xác nhận"],
    response: "Cách tốt nhất để kiểm tra là thay đáp án trở lại bài toán ban đầu. Nếu cả hai vế bằng nhau, câu trả lời của em là đúng! Em thử xem nhé.",
    type: "EVIDENCE",
  },
];

router.post("/tutor/hint", async (req, res): Promise<void> => {
  const body = GetTutorHintBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { questionId, hintLevel } = body.data;
  const template = socratiqueHints[hintLevel];
  const hints = mockHintsByQuestion[questionId]?.[hintLevel];
  
  let message = template.template;
  if (hints) {
    message = message
      .replace("{concept_hint}", hints.concept_hint)
      .replace("{step_hint}", hints.step_hint)
      .replace("{check_hint}", hints.check_hint)
      .replace("{solution_hint}", hints.solution_hint);
  } else {
    message = `Gợi ý cấp ${hintLevel}: Hãy suy nghĩ về bước tiếp theo trong việc giải bài toán này. Đừng vội vã — đọc lại đề bài một lần nữa.`;
  }
  res.json(GetTutorHintResponse.parse({
    hintLevel,
    message,
    socraticType: template.type as "CLARIFICATION" | "ASSUMPTIONS" | "EVIDENCE" | "IMPLICATIONS" | "PERSPECTIVES",
    followUpQuestion: hintLevel < 4 ? "Em hiểu gợi ý này chưa? Thử áp dụng xem sao nhé!" : null,
  }));
});

router.post("/tutor/chat", async (req, res): Promise<void> => {
  const body = SendTutorMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const lowerMessage = body.data.message.toLowerCase();
  
  // Find matching Stella response
  let stellaResponse = stellaResponses.find((r) => r.patterns.some((p) => lowerMessage.includes(p)));
  if (!stellaResponse) {
    // Default thoughtful Stella response
    stellaResponse = {
      response: `Câu hỏi rất thú vị! Thay vì Stella trả lời ngay, hãy để Stella hỏi em: Em đã thử cách nào rồi? Khi chúng ta hiểu rõ quá trình suy nghĩ của mình, chúng ta sẽ học tốt hơn rất nhiều.`,
      type: "PERSPECTIVES",
      patterns: [],
    };
  }
  
  res.json(SendTutorMessageResponse.parse({
    message: stellaResponse.response,
    socraticType: stellaResponse.type,
    suggestedNextStep: "Thử áp dụng gợi ý của Stella vào bài tập hiện tại của em nhé!",
    relatedTopicIds: body.data.topicId ? [body.data.topicId] : ["phan-so", "bieu-thuc-dai-so"],
  }));
});

export default router;
