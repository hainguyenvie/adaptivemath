import { Brain, Clock, Target, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import {
  useGetCognitiveReport,
  useGetStudentMisconceptions,
  getGetCognitiveReportQueryKey,
  getGetStudentMisconceptionsQueryKey,
} from "@workspace/api-client-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-bold", color)}>{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color.replace("text-", "bg-"))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { data: report, isLoading } = useGetCognitiveReport({
    query: { queryKey: getGetCognitiveReportQueryKey() },
  });
  const { data: misconceptions } = useGetStudentMisconceptions({
    query: { queryKey: getGetStudentMisconceptionsQueryKey() },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Đang tải báo cáo...</div>
        </div>
      </AppLayout>
    );
  }

  const radarData = [
    { subject: "Tư duy mẫu", value: report?.patternRecognition ?? 0, fullMark: 100 },
    { subject: "Hiểu khái niệm", value: report?.conceptualUnderstanding ?? 0, fullMark: 100 },
    { subject: "Thích nghi", value: report?.adaptabilityScore ?? 0, fullMark: 100 },
    { subject: "Kiên nhẫn", value: report?.persistenceIndex ?? 0, fullMark: 100 },
    { subject: "Tự tin", value: report?.confidenceLevel ?? 0, fullMark: 100 },
  ];

  const avgResponseSec = ((report?.responseTimeAvgMs ?? 0) / 1000).toFixed(1);

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black">Báo cáo nhận thức</h1>
          <p className="text-muted-foreground text-sm mt-1">Phân tích chuyên sâu về cách em học và tư duy</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Câu đã làm", value: report?.totalQuestionsAnswered ?? 0, icon: Target, color: "text-primary", bg: "bg-primary/10" },
            { label: "Độ chính xác", value: `${report?.accuracyOverall ?? 0}%`, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Thời gian TB", value: `${avgResponseSec}s`, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Lỗi tư duy", value: misconceptions?.length ?? 0, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-4">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <div className="text-xl font-black">{value}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Hồ sơ nhận thức
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Radar
                    name="Điểm"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v}%`, "Điểm"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Chi tiết các chỉ số
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreBar label="Nhận dạng mẫu hình" value={report?.patternRecognition ?? 0} color="text-primary" />
              <ScoreBar label="Hiểu khái niệm sâu" value={report?.conceptualUnderstanding ?? 0} color="text-blue-400" />
              <ScoreBar label="Khả năng thích nghi" value={report?.adaptabilityScore ?? 0} color="text-emerald-400" />
              <ScoreBar label="Chỉ số kiên nhẫn" value={report?.persistenceIndex ?? 0} color="text-purple-400" />
              <ScoreBar label="Mức độ tự tin" value={report?.confidenceLevel ?? 0} color="text-amber-400" />
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Lỗi tư duy đã phát hiện
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(misconceptions ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                Chưa phát hiện lỗi tư duy nào. Tiếp tục luyện tập!
              </div>
            ) : (
              <div className="space-y-3">
                {(misconceptions ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "p-4 rounded-xl border",
                      m.isResolved
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-amber-400/5 border-amber-400/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">{m.topicName}</Badge>
                          {m.isResolved && (
                            <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              Đã sửa
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-medium">{m.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Xuất hiện {m.occurrences} lần — Phát hiện {new Date(m.detectedAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                      <div className={cn("flex-shrink-0", m.isResolved ? "text-emerald-400" : "text-amber-400")}>
                        {m.isResolved ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Khuyến nghị từ hệ thống</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                report && report.conceptualUnderstanding < 65 && "Tập trung vào hiểu sâu khái niệm — thử giải thích bài toán bằng lời trước khi tính",
                report && report.patternRecognition < 70 && "Luyện nhận dạng dạng bài — mỗi buổi làm 5-10 bài phân loại theo dạng",
                report && report.confidenceLevel < 60 && "Tăng tự tin bằng cách bắt đầu từ bài dễ hơn rồi dần nâng độ khó",
                report && report.persistenceIndex > 75 && "Kiên nhẫn tốt! Áp dụng sức kiên nhẫn vào các bài toán nhiều bước phức tạp hơn",
              ].filter(Boolean).map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  <span className="text-muted-foreground">{rec as string}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
