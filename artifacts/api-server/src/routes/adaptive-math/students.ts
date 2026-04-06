import { Router, type IRouter } from "express";
import {
  GetStudentProfileResponse,
  GetStudentAbilitiesResponse,
  GetStudentMisconceptionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const studentProfile = {
  id: "student-001",
  name: "Nguyễn Minh Khoa",
  grade: 7,
  avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Khoa&backgroundColor=b6e3f4",
  streakDays: 12,
  totalXp: 3840,
  level: 8,
  joinedAt: "2025-09-01T00:00:00.000Z",
};

const studentAbilities = [
  { topicId: "so-tu-nhien", topicName: "Số tự nhiên", theta: 2.1, masteryPercent: 95, state: "MASTERY", lastPracticedAt: "2026-04-01T10:00:00.000Z" },
  { topicId: "so-nguyen", topicName: "Số nguyên", theta: 1.8, masteryPercent: 90, state: "REVIEW", lastPracticedAt: "2026-04-03T10:00:00.000Z" },
  { topicId: "phan-so", topicName: "Phân số", theta: 0.8, masteryPercent: 72, state: "CALIBRATION", lastPracticedAt: "2026-04-05T10:00:00.000Z" },
  { topicId: "so-thap-phan", topicName: "Số thập phân", theta: 1.2, masteryPercent: 80, state: "MASTERY", lastPracticedAt: "2026-04-04T10:00:00.000Z" },
  { topicId: "ty-le", topicName: "Tỉ lệ và tỉ số", theta: 0.2, masteryPercent: 55, state: "CALIBRATION", lastPracticedAt: "2026-04-05T10:00:00.000Z" },
  { topicId: "bieu-thuc-dai-so", topicName: "Biểu thức đại số", theta: -0.3, masteryPercent: 42, state: "DIAGNOSTIC", lastPracticedAt: "2026-04-06T08:00:00.000Z" },
  { topicId: "phuong-trinh-bac-1", topicName: "Phương trình bậc nhất", theta: -1.2, masteryPercent: 25, state: "DIAGNOSTIC", lastPracticedAt: null },
  { topicId: "tam-giac", topicName: "Tam giác", theta: 0.5, masteryPercent: 65, state: "CALIBRATION", lastPracticedAt: "2026-04-02T10:00:00.000Z" },
  { topicId: "tu-giac", topicName: "Tứ giác", theta: -0.8, masteryPercent: 30, state: "DIAGNOSTIC", lastPracticedAt: null },
  { topicId: "thong-ke", topicName: "Thống kê", theta: 1.0, masteryPercent: 75, state: "CALIBRATION", lastPracticedAt: "2026-03-28T10:00:00.000Z" },
  { topicId: "bat-dang-thuc", topicName: "Bất đẳng thức", theta: -2.0, masteryPercent: 10, state: "NOT_STARTED", lastPracticedAt: null },
  { topicId: "he-phuong-trinh", topicName: "Hệ phương trình", theta: -2.5, masteryPercent: 5, state: "NOT_STARTED", lastPracticedAt: null },
];

const studentMisconceptions = [
  {
    id: "misc-001",
    topicId: "phan-so",
    topicName: "Phân số",
    errorTag: "quen-quy-dong-mau-so",
    description: "Cộng hai phân số khác mẫu mà không quy đồng mẫu số trước",
    occurrences: 4,
    isResolved: false,
    detectedAt: "2026-04-04T10:00:00.000Z",
  },
  {
    id: "misc-002",
    topicId: "bieu-thuc-dai-so",
    topicName: "Biểu thức đại số",
    errorTag: "nham-tinh-chat-phan-phoi",
    description: "Nhân hệ số vào một số hạng thay vì tất cả số hạng trong ngoặc",
    occurrences: 3,
    isResolved: false,
    detectedAt: "2026-04-06T08:30:00.000Z",
  },
  {
    id: "misc-003",
    topicId: "so-nguyen",
    topicName: "Số nguyên",
    errorTag: "nham-dau-khi-tru-so-am",
    description: "Nhầm dấu khi thực hiện phép trừ số nguyên âm",
    occurrences: 2,
    isResolved: true,
    detectedAt: "2026-03-20T10:00:00.000Z",
  },
];

router.get("/students/me", async (_req, res): Promise<void> => {
  res.json(GetStudentProfileResponse.parse(studentProfile));
});

router.get("/students/me/abilities", async (_req, res): Promise<void> => {
  res.json(GetStudentAbilitiesResponse.parse(studentAbilities));
});

router.get("/students/me/misconceptions", async (_req, res): Promise<void> => {
  res.json(GetStudentMisconceptionsResponse.parse(studentMisconceptions));
});

export default router;
export { studentProfile, studentAbilities, studentMisconceptions };
