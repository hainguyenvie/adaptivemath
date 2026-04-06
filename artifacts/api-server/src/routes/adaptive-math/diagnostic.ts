import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import {
  StartDiagnosticBody,
  StartDiagnosticResponse,
  SubmitDiagnosticAnswerParams,
  SubmitDiagnosticAnswerBody,
  SubmitDiagnosticAnswerResponse,
  GetDiagnosticResultsParams,
  GetDiagnosticResultsResponse,
} from "@workspace/api-zod";
import questionBank from "./questions";

const router: IRouter = Router();

// In-memory session store (demo only)
const sessions = new Map<string, {
  sessionId: string;
  grade: number;
  currentIndex: number;
  questions: typeof questionBank;
  answers: Array<{ questionId: string; selectedOptionId: string; isCorrect: boolean; responseTimeMs: number }>;
}>();

function getSessionQuestions(grade: number) {
  // Pick ~15 questions spread across topics appropriate for the grade
  return questionBank.slice(0, 15);
}

router.post("/diagnostic/start", async (req, res): Promise<void> => {
  const parsed = StartDiagnosticBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const sessionId = randomUUID();
  const questions = getSessionQuestions(parsed.data.grade);
  sessions.set(sessionId, {
    sessionId,
    grade: parsed.data.grade,
    currentIndex: 0,
    questions,
    answers: [],
  });
  const session = sessions.get(sessionId)!;
  res.json(StartDiagnosticResponse.parse({
    sessionId,
    currentQuestion: session.questions[0] ?? null,
    questionIndex: 0,
    totalQuestions: session.questions.length,
    isComplete: false,
    topicsAssessed: [...new Set(session.questions.map((q) => q.topicId))],
  }));
});

router.post("/diagnostic/:sessionId/answer", async (req, res): Promise<void> => {
  const params = SubmitDiagnosticAnswerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SubmitDiagnosticAnswerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const session = sessions.get(params.data.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const currentQ = session.questions[session.currentIndex];
  const isCorrect = currentQ?.options.find((o) => o.id === body.data.selectedOptionId)?.isCorrect ?? false;
  session.answers.push({ questionId: body.data.questionId, selectedOptionId: body.data.selectedOptionId, isCorrect, responseTimeMs: body.data.responseTimeMs });
  session.currentIndex++;
  const isComplete = session.currentIndex >= session.questions.length;
  const nextQuestion = isComplete ? null : session.questions[session.currentIndex];
  res.json(SubmitDiagnosticAnswerResponse.parse({
    sessionId: params.data.sessionId,
    currentQuestion: nextQuestion,
    questionIndex: session.currentIndex,
    totalQuestions: session.questions.length,
    isComplete,
    topicsAssessed: [...new Set(session.questions.map((q) => q.topicId))],
  }));
});

router.get("/diagnostic/:sessionId/results", async (req, res): Promise<void> => {
  const params = GetDiagnosticResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const session = sessions.get(params.data.sessionId);
  // Return mock results if session not found (for demo)
  const abilities = [
    { topicId: "phan-so", topicName: "Phân số", theta: 0.8, masteryPercent: 72, state: "CALIBRATION" as const, lastPracticedAt: new Date().toISOString() },
    { topicId: "bieu-thuc-dai-so", topicName: "Biểu thức đại số", theta: -0.3, masteryPercent: 42, state: "DIAGNOSTIC" as const, lastPracticedAt: null },
    { topicId: "so-nguyen", topicName: "Số nguyên", theta: 1.8, masteryPercent: 90, state: "MASTERY" as const, lastPracticedAt: new Date().toISOString() },
    { topicId: "tam-giac", topicName: "Tam giác", theta: 0.5, masteryPercent: 65, state: "CALIBRATION" as const, lastPracticedAt: new Date().toISOString() },
  ];
  const cognitiveReport = {
    responseTimeAvgMs: 18500,
    confidenceLevel: 68,
    patternRecognition: 72,
    conceptualUnderstanding: 58,
    adaptabilityScore: 75,
    persistenceIndex: 82,
    totalQuestionsAnswered: session?.answers.length ?? 15,
    accuracyOverall: session ? Math.round((session.answers.filter((a) => a.isCorrect).length / session.answers.length) * 100) : 67,
    topMisconceptions: [
      {
        id: "misc-001",
        topicId: "phan-so",
        topicName: "Phân số",
        errorTag: "quen-quy-dong-mau-so",
        description: "Cộng hai phân số khác mẫu mà không quy đồng mẫu số trước",
        occurrences: 3,
        isResolved: false,
        detectedAt: new Date().toISOString(),
      },
    ],
  };
  res.json(GetDiagnosticResultsResponse.parse({
    sessionId: params.data.sessionId,
    abilities,
    weakTopics: ["bieu-thuc-dai-so", "phuong-trinh-bac-1"],
    strongTopics: ["so-nguyen", "so-tu-nhien"],
    cognitiveReport,
  }));
});

export default router;
