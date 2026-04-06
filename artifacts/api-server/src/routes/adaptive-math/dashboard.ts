import { Router, type IRouter } from "express";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityResponse,
  GetKnowledgeMapResponse,
  GetCognitiveReportResponse,
} from "@workspace/api-zod";
import { studentProfile, studentAbilities } from "./students";

const router: IRouter = Router();

const recentActivity = [
  { id: "act-001", type: "MASTERY_ACHIEVED" as const, topicId: "so-thap-phan", topicName: "Số thập phân", description: "Đạt mastery Số thập phân — xuất sắc!", xpEarned: 150, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "act-002", type: "STREAK_MILESTONE" as const, topicId: null, topicName: null, description: "Chuỗi học 12 ngày liên tục! Tuyệt vời!", xpEarned: 100, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "act-003", type: "TOPIC_STARTED" as const, topicId: "bieu-thuc-dai-so", topicName: "Biểu thức đại số", description: "Bắt đầu học Biểu thức đại số", xpEarned: 20, timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: "act-004", type: "REVIEW_COMPLETED" as const, topicId: "so-nguyen", topicName: "Số nguyên", description: "Hoàn thành ôn tập Số nguyên", xpEarned: 50, timestamp: new Date(Date.now() - 172800000).toISOString() },
  { id: "act-005", type: "MISCONCEPTION_FIXED" as const, topicId: "so-nguyen", topicName: "Số nguyên", description: "Khắc phục lỗi tư duy: nhầm dấu số nguyên âm", xpEarned: 75, timestamp: new Date(Date.now() - 259200000).toISOString() },
  { id: "act-006", type: "LEVEL_UP" as const, topicId: null, topicName: null, description: "Lên cấp 8! Tiếp tục phát huy!", xpEarned: 200, timestamp: new Date(Date.now() - 345600000).toISOString() },
];

const weeklyXp = [
  { day: "T2", xp: 120 },
  { day: "T3", xp: 85 },
  { day: "T4", xp: 200 },
  { day: "T5", xp: 0 },
  { day: "T6", xp: 150 },
  { day: "T7", xp: 300 },
  { day: "CN", xp: 180 },
];

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const masteredCount = studentAbilities.filter((a) => a.state === "MASTERY" || a.state === "REVIEW").length;
  const overallMastery = Math.round(studentAbilities.reduce((sum, a) => sum + a.masteryPercent, 0) / studentAbilities.length);
  const current = studentAbilities.find((a) => a.state === "CALIBRATION" || a.state === "DIAGNOSTIC");
  
  res.json(GetDashboardSummaryResponse.parse({
    student: studentProfile,
    todayGoalMinutes: 30,
    todayProgressMinutes: 22,
    reviewDueCount: 3,
    currentTopicId: current?.topicId ?? null,
    currentTopicName: current?.topicName ?? null,
    currentTopicState: current?.state ?? null,
    overallMasteryPercent: overallMastery,
    topicsCompleted: masteredCount,
    topicsTotal: studentAbilities.length,
    weeklyXp,
  }));
});

router.get("/dashboard/activity", async (_req, res): Promise<void> => {
  res.json(GetRecentActivityResponse.parse(recentActivity));
});

router.get("/dashboard/knowledge-map", async (_req, res): Promise<void> => {
  const categories = [
    {
      id: "so-hoc",
      name: "Số học",
      topics: studentAbilities
        .filter((a) => ["so-tu-nhien", "so-nguyen", "phan-so", "so-thap-phan", "ty-le"].includes(a.topicId))
        .map((a) => ({ topicId: a.topicId, topicName: a.topicName, masteryPercent: a.masteryPercent, state: a.state, theta: a.theta })),
    },
    {
      id: "dai-so",
      name: "Đại số",
      topics: studentAbilities
        .filter((a) => ["bieu-thuc-dai-so", "phuong-trinh-bac-1", "bat-dang-thuc", "he-phuong-trinh", "ham-so-bac-1"].includes(a.topicId))
        .map((a) => ({ topicId: a.topicId, topicName: a.topicName, masteryPercent: a.masteryPercent, state: a.state, theta: a.theta })),
    },
    {
      id: "hinh-hoc",
      name: "Hình học",
      topics: studentAbilities
        .filter((a) => ["tam-giac", "tu-giac", "duong-tron"].includes(a.topicId))
        .map((a) => ({ topicId: a.topicId, topicName: a.topicName, masteryPercent: a.masteryPercent, state: a.state, theta: a.theta })),
    },
    {
      id: "thong-ke",
      name: "Thống kê & Xác suất",
      topics: studentAbilities
        .filter((a) => ["thong-ke"].includes(a.topicId))
        .map((a) => ({ topicId: a.topicId, topicName: a.topicName, masteryPercent: a.masteryPercent, state: a.state, theta: a.theta })),
    },
  ];

  const overallMastery = Math.round(studentAbilities.reduce((sum, a) => sum + a.masteryPercent, 0) / studentAbilities.length);
  
  res.json(GetKnowledgeMapResponse.parse({
    grade: 7,
    categories,
    overallMastery,
  }));
});

router.get("/dashboard/cognitive-report", async (_req, res): Promise<void> => {
  res.json(GetCognitiveReportResponse.parse({
    responseTimeAvgMs: 18500,
    confidenceLevel: 68,
    patternRecognition: 72,
    conceptualUnderstanding: 58,
    adaptabilityScore: 75,
    persistenceIndex: 82,
    totalQuestionsAnswered: 247,
    accuracyOverall: 71,
    topMisconceptions: [
      {
        id: "misc-001",
        topicId: "phan-so",
        topicName: "Phân số",
        errorTag: "quen-quy-dong-mau-so",
        description: "Cộng hai phân số khác mẫu mà không quy đồng mẫu số trước",
        occurrences: 4,
        isResolved: false,
        detectedAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: "misc-002",
        topicId: "bieu-thuc-dai-so",
        topicName: "Biểu thức đại số",
        errorTag: "nham-tinh-chat-phan-phoi",
        description: "Nhân hệ số vào một số hạng thay vì tất cả số hạng trong ngoặc",
        occurrences: 3,
        isResolved: false,
        detectedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  }));
});

export default router;
