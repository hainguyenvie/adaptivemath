import { Router, type IRouter } from "express";
import {
  GetReviewScheduleResponse,
  SubmitReviewAnswerBody,
  SubmitReviewAnswerResponse,
} from "@workspace/api-zod";
import { questionBank } from "./questions";

const router: IRouter = Router();

const reviewItems = [
  {
    id: "rev-001",
    topicId: "so-nguyen",
    topicName: "Số nguyên",
    dueDate: new Date().toISOString(),
    interval: 1,
    repetitions: 1,
    easeFactor: 2.5,
    status: "DUE" as const,
    questionId: "q-phan-so-003",
  },
  {
    id: "rev-002",
    topicId: "so-tu-nhien",
    topicName: "Số tự nhiên",
    dueDate: new Date().toISOString(),
    interval: 6,
    repetitions: 2,
    easeFactor: 2.6,
    status: "DUE" as const,
    questionId: "q-phan-so-001",
  },
  {
    id: "rev-003",
    topicId: "so-thap-phan",
    topicName: "Số thập phân",
    dueDate: new Date().toISOString(),
    interval: 1,
    repetitions: 1,
    easeFactor: 2.5,
    status: "DUE" as const,
    questionId: "q-phan-so-002",
  },
  {
    id: "rev-004",
    topicId: "tam-giac",
    topicName: "Tam giác",
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    interval: 6,
    repetitions: 2,
    easeFactor: 2.4,
    status: "UPCOMING" as const,
    questionId: null,
  },
  {
    id: "rev-005",
    topicId: "ty-le",
    topicName: "Tỉ lệ và tỉ số",
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    interval: 15,
    repetitions: 3,
    easeFactor: 2.7,
    status: "UPCOMING" as const,
    questionId: null,
  },
];

function toPublicItem(item: typeof reviewItems[0]) {
  const q = item.questionId ? questionBank.find((qb) => qb.id === item.questionId) : null;
  return {
    id: item.id,
    topicId: item.topicId,
    topicName: item.topicName,
    dueDate: item.dueDate,
    interval: item.interval,
    repetitions: item.repetitions,
    easeFactor: item.easeFactor,
    status: item.status,
    intervalDays: item.interval,
    reviewCount: item.repetitions,
    question: q
      ? {
          id: q.id,
          stem: q.text,
          options: q.options.map((opt, idx) => ({
            id: opt.id,
            label: String.fromCharCode(65 + idx),
            text: opt.text,
          })),
          correctOptionId: q.options.find((opt) => opt.isCorrect)?.id ?? "",
          explanation: q.explanation,
        }
      : null,
  };
}

// Simple SM-2 algorithm
function sm2Update(item: typeof reviewItems[0], quality: number) {
  let { interval, repetitions, easeFactor } = item;
  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions++;
  } else {
    interval = 1;
    repetitions = 0;
  }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return { interval, repetitions, easeFactor };
}

router.get("/review/schedule", async (_req, res): Promise<void> => {
  const due = reviewItems.filter((r) => r.status === "DUE").map(toPublicItem);
  const upcoming = reviewItems.filter((r) => r.status === "UPCOMING").map(toPublicItem);
  res.json({
    dueTodayCount: due.length,
    upcomingCount: upcoming.length,
    dueItems: due,
    upcomingItems: upcoming,
  });
});

router.post("/review/answer", async (req, res): Promise<void> => {
  const body = SubmitReviewAnswerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const item = reviewItems.find((r) => r.id === body.data.reviewItemId);
  if (!item) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }

  const q = item.questionId ? questionBank.find((qb) => qb.id === item.questionId) : null;
  const correctOpt = q?.options.find((opt) => opt.isCorrect);
  const isCorrect = correctOpt ? body.data.selectedOptionId === correctOpt.id : body.data.qualityScore >= 3;

  const updated = sm2Update(item, body.data.qualityScore);
  const newDueDate = new Date(Date.now() + updated.interval * 86400000).toISOString();
  Object.assign(item, { ...updated, dueDate: newDueDate, status: "COMPLETED" as const });

  res.json({
    id: item.id,
    topicId: item.topicId,
    topicName: item.topicName,
    dueDate: newDueDate,
    interval: updated.interval,
    repetitions: updated.repetitions,
    easeFactor: updated.easeFactor,
    status: "COMPLETED",
    isCorrect,
    explanation: q?.explanation ?? "Câu trả lời đã được ghi nhận.",
    newIntervalDays: updated.interval,
  });
});

export default router;
