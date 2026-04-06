import { useState } from "react";
import { CheckCircle, XCircle, Clock, ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/AppLayout";
import { MathText } from "@/components/MathDisplay";
import {
  useGetReviewSchedule,
  getGetReviewScheduleQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ReviewQuestion {
  id: string;
  stem: string;
  options: { id: string; label: string; text: string }[];
  correctOptionId: string;
  explanation: string;
}

interface EnrichedReviewItem {
  id: string;
  topicId: string;
  topicName: string;
  dueDate: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  status: "DUE" | "UPCOMING" | "COMPLETED";
  intervalDays?: number;
  reviewCount?: number;
  question?: ReviewQuestion | null;
}

async function submitReviewAnswerFetch(body: {
  reviewItemId: string;
  questionId: string;
  selectedOptionId: string;
  responseTimeMs: number;
  qualityScore: number;
}): Promise<{ isCorrect: boolean; explanation: string; newIntervalDays: number }> {
  const resp = await fetch("/api/review/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
}

const statusLabel: Record<string, string> = {
  DUE: "Đến hạn",
  UPCOMING: "Sắp đến hạn",
  COMPLETED: "Đã hoàn thành",
};

const statusColor: Record<string, string> = {
  DUE: "text-red-400 border-red-500/30 bg-red-500/10",
  UPCOMING: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  COMPLETED: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
};

export default function ReviewPage() {
  const qc = useQueryClient();
  const { data: schedule, isLoading } = useGetReviewSchedule({
    query: { queryKey: getGetReviewScheduleQueryKey() },
  });

  const [activeIdx, setActiveIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; explanation: string; newIntervalDays: number } | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [startTime] = useState(Date.now());

  const dueItems = ((schedule as any)?.dueItems ?? []) as EnrichedReviewItem[];
  const upcomingItems = ((schedule as any)?.upcomingItems ?? []) as EnrichedReviewItem[];
  const currentItem = dueItems[activeIdx];

  const handleSubmit = async () => {
    if (!selected || !currentItem?.question) return;
    setSubmitted(true);
    const isCorrect = selected === currentItem.question.correctOptionId;
    try {
      const res = await submitReviewAnswerFetch({
        reviewItemId: currentItem.id,
        questionId: currentItem.question.id,
        selectedOptionId: selected,
        responseTimeMs: Date.now() - startTime,
        qualityScore: isCorrect ? 5 : 1,
      });
      setResult({ isCorrect: res.isCorrect, explanation: res.explanation, newIntervalDays: res.newIntervalDays });
      await qc.invalidateQueries({ queryKey: getGetReviewScheduleQueryKey() });
    } catch {
      setResult({ isCorrect: false, explanation: "Có lỗi. Vui lòng thử lại.", newIntervalDays: 1 });
    }
  };

  const handleNext = () => {
    setSelected(null);
    setSubmitted(false);
    setResult(null);
    setReviewedCount(prev => prev + 1);
    setActiveIdx(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Đang tải lịch ôn tập...</div>
        </div>
      </AppLayout>
    );
  }

  if (!dueItems.length || activeIdx >= dueItems.length) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-black">Ôn tập thông minh</h1>
          <Card className="bg-card border-border">
            <CardContent className="p-10 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto" />
              <h2 className="text-xl font-bold">
                {reviewedCount > 0 ? "Tuyệt vời! Hoàn thành ôn tập!" : "Không có gì cần ôn tập hôm nay!"}
              </h2>
              <p className="text-muted-foreground">
                {reviewedCount > 0
                  ? `Em đã ôn ${reviewedCount} câu. Hệ thống SM-2 đã cập nhật lịch cho từng chủ đề.`
                  : "Hệ thống Spaced Repetition sẽ nhắc em đúng lúc nhớ sắp phai."}
              </p>
            </CardContent>
          </Card>

          {upcomingItems.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Lịch ôn tập sắp tới
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <div className="text-sm font-medium">{item.topicName}</div>
                        <div className="text-xs text-muted-foreground">
                          Hạn: {new Date(item.dueDate).toLocaleDateString("vi-VN")} — Khoảng cách {item.interval} ngày
                        </div>
                      </div>
                      <Badge className={cn("text-xs border", statusColor[item.status])}>
                        {statusLabel[item.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    );
  }

  const q = currentItem.question;

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Ôn tập thông minh</h1>
            <p className="text-muted-foreground text-sm mt-1">Thuật toán SM-2 — Ôn đúng lúc, nhớ lâu hơn</p>
          </div>
          <div className="text-center">
            <div className="font-black text-lg text-primary">{activeIdx + 1}/{dueItems.length}</div>
            <div className="text-xs text-muted-foreground">Câu</div>
          </div>
        </div>

        <Progress value={(activeIdx / dueItems.length) * 100} className="h-1.5" />

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{currentItem.topicName}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Lần ôn #{(currentItem.reviewCount ?? currentItem.repetitions) + 1} — Khoảng cách {currentItem.intervalDays ?? currentItem.interval} ngày
                  </span>
                </div>
              </div>
              <Badge className={cn("text-xs border", statusColor[currentItem.status])}>
                {statusLabel[currentItem.status]}
              </Badge>
            </div>
          </CardHeader>

          {q ? (
            <CardContent className="space-y-4">
              <div className="text-base leading-relaxed font-medium">
                <MathText text={q.stem} />
              </div>

              <div className="space-y-2">
                {q.options.map(opt => {
                  const isSelected = selected === opt.id;
                  const isCorrect = opt.id === q.correctOptionId;
                  let optStyle = "border-border bg-muted/30 hover:bg-muted hover:border-primary/30";
                  if (submitted) {
                    if (isCorrect) optStyle = "border-emerald-500/60 bg-emerald-500/10 text-emerald-300";
                    else if (isSelected && !isCorrect) optStyle = "border-red-500/60 bg-red-500/10 text-red-300";
                    else optStyle = "border-border bg-muted/20 opacity-50";
                  } else if (isSelected) {
                    optStyle = "border-primary/60 bg-primary/10";
                  }

                  return (
                    <button
                      key={opt.id}
                      disabled={submitted}
                      onClick={() => setSelected(opt.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3",
                        optStyle
                      )}
                    >
                      <span className="h-6 w-6 rounded-full border border-current flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {opt.label}
                      </span>
                      <span className="text-sm flex-1"><MathText text={opt.text} /></span>
                      {submitted && isCorrect && <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                      {submitted && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              {!submitted && (
                <Button onClick={handleSubmit} disabled={!selected} className="w-full">Kiểm tra</Button>
              )}

              {submitted && result && (
                <div className={cn(
                  "rounded-xl border p-4 space-y-3",
                  result.isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
                )}>
                  <div className="flex items-center gap-2 font-bold">
                    {result.isCorrect
                      ? <><CheckCircle className="h-5 w-5 text-emerald-400" /><span className="text-emerald-300">Chính xác!</span></>
                      : <><XCircle className="h-5 w-5 text-red-400" /><span className="text-red-300">Chưa đúng!</span></>
                    }
                    <span className="ml-auto text-xs text-muted-foreground">
                      Ôn tiếp sau {result.newIntervalDays} ngày
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground"><MathText text={result.explanation} /></div>
                  <Button onClick={handleNext} className="w-full gap-2">
                    Câu tiếp theo <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          ) : (
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                <p className="mb-4">Chủ đề này chưa có câu hỏi ôn tập.</p>
                <Button onClick={handleNext} variant="outline">Bỏ qua</Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
