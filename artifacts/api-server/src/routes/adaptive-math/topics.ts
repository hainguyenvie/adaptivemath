import { Router, type IRouter } from "express";
import {
  GetTopicsResponse,
  GetTopicResponse,
  GetTopicParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const topicsData = [
  // Số học / Arithmetic
  { id: "so-tu-nhien", name: "Số tự nhiên", description: "Khái niệm và phép tính với số tự nhiên", grade: 6, category: "so-hoc", prerequisites: [], difficulty: 1.0 },
  { id: "so-nguyen", name: "Số nguyên", description: "Số nguyên âm, dương và phép tính", grade: 6, category: "so-hoc", prerequisites: ["so-tu-nhien"], difficulty: 1.5 },
  { id: "phan-so", name: "Phân số", description: "Phân số, số thập phân và các phép tính", grade: 6, category: "so-hoc", prerequisites: ["so-tu-nhien"], difficulty: 2.0 },
  { id: "so-thap-phan", name: "Số thập phân", description: "Số thập phân và chuyển đổi", grade: 6, category: "so-hoc", prerequisites: ["phan-so"], difficulty: 1.8 },
  { id: "ty-le", name: "Tỉ lệ và tỉ số", description: "Tỉ số, tỉ lệ phần trăm, tỉ lệ thuận nghịch", grade: 6, category: "so-hoc", prerequisites: ["phan-so"], difficulty: 2.2 },

  // Đại số / Algebra
  { id: "bieu-thuc-dai-so", name: "Biểu thức đại số", description: "Biểu thức chứa biến, đơn thức, đa thức", grade: 7, category: "dai-so", prerequisites: ["so-nguyen", "phan-so"], difficulty: 2.5 },
  { id: "phuong-trinh-bac-1", name: "Phương trình bậc nhất", description: "Phương trình bậc nhất một ẩn và ứng dụng", grade: 7, category: "dai-so", prerequisites: ["bieu-thuc-dai-so"], difficulty: 3.0 },
  { id: "bat-dang-thuc", name: "Bất đẳng thức", description: "Bất đẳng thức và bất phương trình", grade: 8, category: "dai-so", prerequisites: ["phuong-trinh-bac-1"], difficulty: 3.2 },
  { id: "he-phuong-trinh", name: "Hệ phương trình", description: "Hệ 2 phương trình bậc nhất 2 ẩn", grade: 9, category: "dai-so", prerequisites: ["phuong-trinh-bac-1"], difficulty: 3.5 },
  { id: "phuong-trinh-bac-2", name: "Phương trình bậc hai", description: "Phương trình bậc hai một ẩn, delta, nghiệm", grade: 9, category: "dai-so", prerequisites: ["he-phuong-trinh"], difficulty: 4.0 },
  { id: "ham-so-bac-1", name: "Hàm số bậc nhất", description: "Hàm số y=ax+b, đồ thị và tính chất", grade: 8, category: "dai-so", prerequisites: ["phuong-trinh-bac-1"], difficulty: 3.3 },
  { id: "ham-so-bac-2", name: "Hàm số bậc hai", description: "Hàm số y=ax², parabol và ứng dụng", grade: 9, category: "dai-so", prerequisites: ["phuong-trinh-bac-2", "ham-so-bac-1"], difficulty: 4.2 },

  // Hình học / Geometry
  { id: "tam-giac", name: "Tam giác", description: "Các loại tam giác, tính chất, chu vi diện tích", grade: 7, category: "hinh-hoc", prerequisites: [], difficulty: 2.0 },
  { id: "tu-giac", name: "Tứ giác", description: "Hình thang, bình hành, hình vuông, hình chữ nhật", grade: 8, category: "hinh-hoc", prerequisites: ["tam-giac"], difficulty: 2.8 },
  { id: "duong-tron", name: "Đường tròn", description: "Đường tròn, cung, dây, tiếp tuyến", grade: 9, category: "hinh-hoc", prerequisites: ["tu-giac"], difficulty: 3.5 },
  { id: "hinh-hoc-khong-gian", name: "Hình học không gian", description: "Khối chóp, lăng trụ, hình cầu, hình trụ", grade: 9, category: "hinh-hoc", prerequisites: ["duong-tron"], difficulty: 4.0 },

  // Thống kê / Statistics
  { id: "thong-ke", name: "Thống kê", description: "Số liệu thống kê, biểu đồ, trung bình", grade: 7, category: "thong-ke", prerequisites: ["phan-so"], difficulty: 2.0 },
  { id: "xac-suat", name: "Xác suất", description: "Xác suất cơ bản, biến cố, không gian mẫu", grade: 8, category: "thong-ke", prerequisites: ["thong-ke"], difficulty: 3.0 },
];

router.get("/topics", async (req, res): Promise<void> => {
  const grade = req.query.grade ? Number(req.query.grade) : undefined;
  const filtered = grade ? topicsData.filter((t) => t.grade <= grade) : topicsData;
  res.json(GetTopicsResponse.parse(filtered));
});

router.get("/topics/:topicId", async (req, res): Promise<void> => {
  const params = GetTopicParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const topic = topicsData.find((t) => t.id === params.data.topicId);
  if (!topic) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }
  res.json(GetTopicResponse.parse(topic));
});

export default router;
export { topicsData };
