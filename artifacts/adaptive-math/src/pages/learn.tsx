import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { CheckCircle, XCircle, ArrowRight, Lightbulb, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/AppLayout";
import { MathText } from "@/components/MathDisplay";
import {
  useGetNextQuestion,
  useGetPracticeSessionStats,
  useGetTopic,
  getGetNextQuestionQueryKey,
  getGetPracticeSessionStatsQueryKey,
  getGetTopicQueryKey,
  submitPracticeAnswer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const difficultyLabel: Record<string, string> = {
  EASY: "Dễ",
  NORMAL: "Trung bình",
  HARD: "Khó",
  VERY_HARD: "Rất khó",
};

const difficultyColor: Record<string, string> = {
  EASY: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  NORMAL: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  HARD: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  VERY_HARD: "text-red-400 border-red-500/30 bg-red-500/10",
};

export default function LearnPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const qc = useQueryClient();
  const startTimeRef = useRef(Date.now());

  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    explanation: string;
    correctOptionId: string;
    misconceptionDescription?: string | null;
  } | null>(null);
  const [showHint, setShowHint] = useState(false);

  const { data: topicData } = useGetTopic(
    topicId ?? "",
    { query: { queryKey: getGetTopicQueryKey(topicId ?? "") } }
  );

  const { data: practiceData, isLoading } = useGetNextQuestion(
    { topicId: topicId ?? "" },
    { query: { queryKey: getGetNextQuestionQueryKey({ topicId: topicId ?? "" }) } }
  );

  const { data: stats } = useGetPracticeSessionStats(
    { topicId: topicId ?? "" },
    { query: { queryKey: getGetPracticeSessionStatsQueryKey({ topicId: topicId ?? "" }) } }
  );

  const question = practiceData?.question;

  const handleSubmit = async () => {
    if (!selected || !question) return;
    setSubmitted(true);
    const responseTimeMs = Date.now() - startTimeRef.current;
    try {
      const res = await submitPracticeAnswer({
        questionId: question.id,
        selectedOptionId: selected,
        topicId: topicId ?? "",
        responseTimeMs,
      });
      setResult({
        isCorrect: res.isCorrect,
        explanation: res.explanation,
        correctOptionId: res.correctOptionId,
        misconceptionDescription: res.misconception?.description ?? null,
      });
      await qc.invalidateQueries({ queryKey: getGetPracticeSessionStatsQueryKey({ topicId: topicId ?? "" }) });
    } catch {
      setResult({ isCorrect: false, explanation: "Có lỗi xảy ra. Vui lòng thử lại.", correctOptionId: "", misconceptionDescription: null });
    }
  };

  const handleNext = async () => {
    setSelected(null);
    setSubmitted(false);
    setResult(null);
    setShowHint(false);
    startTimeRef.current = Date.now();
    await qc.invalidateQueries({ queryKey: getGetNextQuestionQueryKey({ topicId: topicId ?? "" }) });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Đang chọn câu hỏi phù hợp...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">{topicData?.name ?? topicId}</h1>
            <p className="text-muted-foreground text-sm mt-1">Học thích nghi — Hệ thống chọn câu phù hợp với em</p>
          </div>
          {stats && (
            <div className="flex items-center gap-3 text-sm">
              <div className="text-center">
                <div className="font-black text-lg text-emerald-400">{stats.questionsAnswered}</div>
                <div className="text-xs text-muted-foreground">Đã làm</div>
              </div>
              <div className="text-center">
                <div className="font-black text-lg text-primary">{stats.accuracyPercent}%</div>
                <div className="text-xs text-muted-foreground">Chính xác</div>
              </div>
            </div>
          )}
        </div>

        {stats && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tiến độ phiên</span>
              <span className="font-semibold">{stats.accuracyPercent}%</span>
            </div>
            <Progress value={stats.accuracyPercent} className="h-2" />
          </div>
        )}

        {question && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Câu hỏi</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs border", difficultyColor[question.difficultyLabel])}>
                    {difficultyLabel[question.difficultyLabel] ?? question.difficultyLabel}
                  </Badge>
                  {practiceData?.hintAvailable && !submitted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs text-amber-400 hover:text-amber-300 h-6 px-2"
                      onClick={() => setShowHint(!showHint)}
                    >
                      <Lightbulb className="h-3 w-3" />
                      Gợi ý
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-base leading-relaxed font-medium">
                <MathText text={question.text} />
                {question.latex && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <MathText text={`$$${question.latex}$$`} />
                  </div>
                )}
              </div>

              {showHint && (
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3 text-sm text-amber-300">
                  <Lightbulb className="h-4 w-4 inline mr-2 mb-0.5" />
                  Hãy đọc kỹ đề bài và nghĩ xem cần thực hiện những bước nào trước.
                </div>
              )}

              <div className="space-y-2">
                {question.options.map((opt, idx) => {
                  const isSelected = selected === opt.id;
                  const isCorrect = result ? opt.id === result.correctOptionId : false;
                  const isWrong = submitted && isSelected && !isCorrect;
                  const label = String.fromCharCode(65 + idx);

                  let optStyle = "border-border bg-muted/30 hover:bg-muted hover:border-primary/30";
                  if (submitted) {
                    if (isCorrect) optStyle = "border-emerald-500/60 bg-emerald-500/10 text-emerald-300";
                    else if (isWrong) optStyle = "border-red-500/60 bg-red-500/10 text-red-300";
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
                        {label}
                      </span>
                      <span className="text-sm flex-1">
                        <MathText text={opt.text} />
                      </span>
                      {submitted && isCorrect && <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                      {submitted && isWrong && <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              {!submitted && (
                <Button onClick={handleSubmit} disabled={!selected} className="w-full">
                  Kiểm tra
                </Button>
              )}

              {submitted && result && (
                <div className={cn(
                  "rounded-xl border p-4 space-y-3",
                  result.isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
                )}>
                  <div className="flex items-center gap-2 font-bold">
                    {result.isCorrect
                      ? <><CheckCircle className="h-5 w-5 text-emerald-400" /> <span className="text-emerald-300">Chính xác!</span></>
                      : <><XCircle className="h-5 w-5 text-red-400" /> <span className="text-red-300">Chưa đúng!</span></>
                    }
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    <MathText text={result.explanation} />
                  </div>
                  {result.misconceptionDescription && (
                    <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-2 text-xs text-amber-300">
                      Stella phát hiện lỗi tư duy: {result.misconceptionDescription}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleNext} className="flex-1 gap-2">
                      Câu tiếp theo <ArrowRight className="h-4 w-4" />
                    </Button>
                    {!result.isCorrect && (
                      <Link href="/tutor">
                        <Button variant="outline" className="gap-2 border-primary/30 text-primary">
                          Hỏi Stella
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {stats && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <BarChart2 className="h-4 w-4 text-primary" />
                Thống kê phiên
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { label: "Chuỗi đúng", value: stats.recentStreak, color: "text-emerald-400" },
                  { label: "Đã làm", value: stats.questionsAnswered, color: "text-primary" },
                  { label: "Chính xác", value: `${stats.accuracyPercent}%`, color: "text-blue-400" },
                  { label: "Trạng thái", value: stats.learningState, color: "text-amber-400" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className={cn("text-xl font-black", color)}>{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
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
