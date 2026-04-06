import { Router, type IRouter } from "express";
import { GetLearningPathResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const learningPath = [
  // Completed
  { id: "bundle-001", topicId: "so-tu-nhien", topicName: "Số tự nhiên", difficultyLevel: "NORMAL" as const, status: "COMPLETED" as const, estimatedMinutes: 20, masteryRequired: 80, prerequisites: [] },
  { id: "bundle-002", topicId: "so-tu-nhien", topicName: "Số tự nhiên", difficultyLevel: "HARD" as const, status: "COMPLETED" as const, estimatedMinutes: 25, masteryRequired: 80, prerequisites: ["bundle-001"] },
  { id: "bundle-003", topicId: "so-tu-nhien", topicName: "Số tự nhiên", difficultyLevel: "VERY_HARD" as const, status: "COMPLETED" as const, estimatedMinutes: 30, masteryRequired: 80, prerequisites: ["bundle-002"] },
  { id: "bundle-004", topicId: "so-nguyen", topicName: "Số nguyên", difficultyLevel: "NORMAL" as const, status: "COMPLETED" as const, estimatedMinutes: 20, masteryRequired: 80, prerequisites: ["bundle-001"] },
  { id: "bundle-005", topicId: "so-nguyen", topicName: "Số nguyên", difficultyLevel: "HARD" as const, status: "COMPLETED" as const, estimatedMinutes: 25, masteryRequired: 80, prerequisites: ["bundle-004"] },
  { id: "bundle-006", topicId: "so-nguyen", topicName: "Số nguyên", difficultyLevel: "VERY_HARD" as const, status: "COMPLETED" as const, estimatedMinutes: 30, masteryRequired: 80, prerequisites: ["bundle-005"] },
  { id: "bundle-007", topicId: "so-thap-phan", topicName: "Số thập phân", difficultyLevel: "NORMAL" as const, status: "COMPLETED" as const, estimatedMinutes: 20, masteryRequired: 80, prerequisites: ["bundle-004"] },
  { id: "bundle-008", topicId: "so-thap-phan", topicName: "Số thập phân", difficultyLevel: "HARD" as const, status: "COMPLETED" as const, estimatedMinutes: 25, masteryRequired: 80, prerequisites: ["bundle-007"] },
  { id: "bundle-009", topicId: "so-thap-phan", topicName: "Số thập phân", difficultyLevel: "VERY_HARD" as const, status: "COMPLETED" as const, estimatedMinutes: 30, masteryRequired: 80, prerequisites: ["bundle-008"] },

  // Currently active
  { id: "bundle-010", topicId: "phan-so", topicName: "Phân số", difficultyLevel: "NORMAL" as const, status: "CURRENT" as const, estimatedMinutes: 25, masteryRequired: 80, prerequisites: ["bundle-004"] },
  
  // Locked
  { id: "bundle-011", topicId: "phan-so", topicName: "Phân số", difficultyLevel: "HARD" as const, status: "LOCKED" as const, estimatedMinutes: 30, masteryRequired: 80, prerequisites: ["bundle-010"] },
  { id: "bundle-012", topicId: "phan-so", topicName: "Phân số", difficultyLevel: "VERY_HARD" as const, status: "LOCKED" as const, estimatedMinutes: 35, masteryRequired: 80, prerequisites: ["bundle-011"] },
  { id: "bundle-013", topicId: "ty-le", topicName: "Tỉ lệ và tỉ số", difficultyLevel: "NORMAL" as const, status: "LOCKED" as const, estimatedMinutes: 25, masteryRequired: 80, prerequisites: ["bundle-010"] },
  { id: "bundle-014", topicId: "ty-le", topicName: "Tỉ lệ và tỉ số", difficultyLevel: "HARD" as const, status: "LOCKED" as const, estimatedMinutes: 30, masteryRequired: 80, prerequisites: ["bundle-013"] },
  { id: "bundle-015", topicId: "bieu-thuc-dai-so", topicName: "Biểu thức đại số", difficultyLevel: "NORMAL" as const, status: "LOCKED" as const, estimatedMinutes: 30, masteryRequired: 80, prerequisites: ["bundle-012"] },
  { id: "bundle-016", topicId: "bieu-thuc-dai-so", topicName: "Biểu thức đại số", difficultyLevel: "HARD" as const, status: "LOCKED" as const, estimatedMinutes: 35, masteryRequired: 80, prerequisites: ["bundle-015"] },
  { id: "bundle-017", topicId: "phuong-trinh-bac-1", topicName: "Phương trình bậc nhất", difficultyLevel: "NORMAL" as const, status: "LOCKED" as const, estimatedMinutes: 35, masteryRequired: 80, prerequisites: ["bundle-015"] },
  { id: "bundle-018", topicId: "tam-giac", topicName: "Tam giác", difficultyLevel: "NORMAL" as const, status: "LOCKED" as const, estimatedMinutes: 25, masteryRequired: 80, prerequisites: [] },
];

router.get("/learning-path", async (_req, res): Promise<void> => {
  res.json(GetLearningPathResponse.parse(learningPath));
});

export default router;
