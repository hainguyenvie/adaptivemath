import { Router, type IRouter } from "express";
import {
  GetNextQuestionQueryParams,
  GetNextQuestionResponse,
  SubmitPracticeAnswerBody,
  SubmitPracticeAnswerResponse,
  GetPracticeSessionStatsQueryParams,
  GetPracticeSessionStatsResponse,
} from "@workspace/api-zod";
import questionBank from "./questions";

const router: IRouter = Router();

// In-memory session tracker
const sessionStats = new Map<string, {
  questionsAnswered: number;
  correctCount: number;
  currentTheta: number;
  streak: number;
  veryHardCorrect: number;
  openMisconceptions: number;
  timeSpentMinutes: number;
  state: "DIAGNOSTIC" | "CALIBRATION" | "MASTERY" | "REVIEW";
}>();

function getStatsForTopic(topicId: string) {
  if (!sessionStats.has(topicId)) {
    sessionStats.set(topicId, {
      questionsAnswered: 0,
      correctCount: 0,
      currentTheta: 0.0,
      streak: 0,
      veryHardCorrect: 0,
      openMisconceptions: 0,
      timeSpentMinutes: 0,
      state: "DIAGNOSTIC",
    });
  }
  return sessionStats.get(topicId)!;
}

router.get("/practice/next-question", async (req, res): Promise<void> => {
  const params = GetNextQuestionQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { topicId, state } = params.data;
  const topicQuestions = questionBank.filter((q) => q.topicId === topicId);
  if (topicQuestions.length === 0) {
    res.status(404).json({ error: "No questions found for topic" });
    return;
  }
  const stats = getStatsForTopic(topicId);
  const currentState = (state as "DIAGNOSTIC" | "CALIBRATION" | "MASTERY" | "REVIEW") ?? stats.state;
  // Pick question based on state and theta
  let targetDifficulty = stats.currentTheta + 0.5;
  const sorted = [...topicQuestions].sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty));
  const question = sorted[stats.questionsAnswered % sorted.length];
  res.json(GetNextQuestionResponse.parse({
    question,
    learningState: currentState,
    targetProbability: 0.75,
    sessionProgress: stats.questionsAnswered,
    hintAvailable: stats.questionsAnswered > 0,
  }));
});

router.post("/practice/answer", async (req, res): Promise<void> => {
  const body = SubmitPracticeAnswerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { questionId, selectedOptionId, topicId } = body.data;
  const question = questionBank.find((q) => q.id === questionId);
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  const correctOption = question.options.find((o) => o.isCorrect);
  const selectedOption = question.options.find((o) => o.id === selectedOptionId);
  const isCorrect = selectedOption?.isCorrect ?? false;
  const stats = getStatsForTopic(topicId);
  
  // Update ELO-like theta
  const pCorrect = 1 / (1 + Math.exp(-(stats.currentTheta - question.difficulty)));
  const K = 0.3;
  stats.currentTheta = stats.currentTheta + K * ((isCorrect ? 1 : 0) - pCorrect);
  stats.questionsAnswered++;
  if (isCorrect) {
    stats.correctCount++;
    stats.streak++;
  } else {
    stats.streak = 0;
  }
  if (isCorrect && (question.difficultyLabel as string) === "VERY_HARD") {
    stats.veryHardCorrect++;
  }
  
  // Detect misconception
  let misconception = null;
  if (!isCorrect && selectedOption?.misconceptionTag) {
    stats.openMisconceptions++;
    misconception = {
      id: `misc-${Date.now()}`,
      topicId,
      topicName: question.topicId,
      errorTag: selectedOption.misconceptionTag,
      description: getMisconceptionDescription(selectedOption.misconceptionTag),
      occurrences: 1,
      isResolved: false,
      detectedAt: new Date().toISOString(),
    };
  }

  // Check mastery conditions: accuracy >= 80% in last 5, at least 2 very hard correct, no open misconceptions
  const accuracy = stats.questionsAnswered > 0 ? (stats.correctCount / stats.questionsAnswered) * 100 : 0;
  const masteryAchieved = accuracy >= 80 && stats.veryHardCorrect >= 2 && stats.openMisconceptions === 0 && stats.questionsAnswered >= 5;
  
  if (masteryAchieved) {
    stats.state = "MASTERY";
  } else if (stats.questionsAnswered >= 3) {
    stats.state = "CALIBRATION";
  }

  res.json(SubmitPracticeAnswerResponse.parse({
    isCorrect,
    correctOptionId: correctOption?.id ?? "",
    explanation: (question as any).explanation ?? "Xem lại lý thuyết để hiểu rõ hơn.",
    misconception,
    updatedTheta: stats.currentTheta,
    supplementaryRound: !isCorrect && !!selectedOption?.misconceptionTag,
    newLearningState: stats.state,
    masteryAchieved,
  }));
});

router.get("/practice/session-stats", async (req, res): Promise<void> => {
  const params = GetPracticeSessionStatsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const stats = getStatsForTopic(params.data.topicId);
  const accuracy = stats.questionsAnswered > 0 ? Math.round((stats.correctCount / stats.questionsAnswered) * 100) : 0;
  res.json(GetPracticeSessionStatsResponse.parse({
    topicId: params.data.topicId,
    learningState: stats.state,
    questionsAnswered: stats.questionsAnswered,
    correctCount: stats.correctCount,
    accuracyPercent: accuracy,
    currentTheta: stats.currentTheta,
    recentStreak: stats.streak,
    veryHardCorrect: stats.veryHardCorrect,
    openMisconceptions: stats.openMisconceptions,
    timeSpentMinutes: stats.timeSpentMinutes,
  }));
});

function getMisconceptionDescription(tag: string): string {
  const descriptions: Record<string, string> = {
    "quen-quy-dong-mau-so": "Cộng hai phân số khác mẫu mà không quy đồng mẫu số trước",
    "nham-tinh-chat-phan-phoi": "Nhân hệ số vào một số hạng thay vì tất cả số hạng trong ngoặc",
    "quen-chia-2-ve-cho-2": "Quên chia cả hai vế cho hệ số khi giải phương trình",
    "nham-dau-khi-tru-so-am": "Nhầm dấu khi thực hiện phép trừ số nguyên âm",
    "rut-gon-chua-het-ucln": "Rút gọn phân số chưa đến mức tối giản (chưa chia cho ƯCLN)",
    "quen-quy-tac-phan-phoi": "Quên áp dụng tính chất phân phối của phép nhân",
  };
  return descriptions[tag] ?? `Lỗi tư duy: ${tag.replace(/-/g, " ")}`;
}

export default router;
