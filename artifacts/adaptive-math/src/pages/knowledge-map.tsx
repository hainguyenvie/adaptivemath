import { Link } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetKnowledgeMap, getGetKnowledgeMapQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type TopicState = "MASTERY" | "REVIEW" | "CALIBRATION" | "DIAGNOSTIC" | "NOT_STARTED";

function getMasteryColor(pct: number, state: string) {
  if (state === "NOT_STARTED") return "bg-muted/50 border-border text-muted-foreground";
  if (pct >= 80) return "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25";
  if (pct >= 60) return "bg-amber-400/15 border-amber-400/40 text-amber-400 hover:bg-amber-400/25";
  if (pct >= 40) return "bg-orange-500/15 border-orange-500/40 text-orange-400 hover:bg-orange-500/25";
  return "bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25";
}

function getMasteryLabel(pct: number, state: TopicState) {
  if (state === "NOT_STARTED") return "Chưa học";
  if (state === "MASTERY") return "Thành thạo";
  if (state === "REVIEW") return "Ôn tập";
  if (state === "CALIBRATION") return "Đang học";
  if (state === "DIAGNOSTIC") return "Chẩn đoán";
  if (pct >= 80) return "Tốt";
  if (pct >= 60) return "Khá";
  if (pct >= 40) return "Trung bình";
  return "Cần cải thiện";
}

function MasteryDot({ pct, state }: { pct: number; state: string }) {
  const colors: Record<string, string> = {
    "MASTERY": "bg-emerald-400",
    "REVIEW": "bg-cyan-400",
    "CALIBRATION": "bg-amber-400 animate-pulse",
    "DIAGNOSTIC": "bg-purple-400 animate-pulse",
    "NOT_STARTED": "bg-muted-foreground",
  };
  return <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", colors[state] ?? "bg-muted-foreground")} />;
}

export default function KnowledgeMapPage() {
  const { data: mapData, isLoading } = useGetKnowledgeMap({
    query: { queryKey: getGetKnowledgeMapQueryKey() },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Đang tải bản đồ...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Bản đồ kiến thức</h1>
            <p className="text-muted-foreground mt-1">Lớp {mapData?.grade} — Toán học</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-primary">{mapData?.overallMastery}%</div>
              <div className="text-xs text-muted-foreground">Tổng tiến độ</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          {[
            { color: "bg-emerald-400", label: "Thành thạo (≥ 80%)" },
            { color: "bg-amber-400", label: "Khá (60–79%)" },
            { color: "bg-orange-400", label: "Trung bình (40–59%)" },
            { color: "bg-red-400", label: "Cần cải thiện (< 40%)" },
            { color: "bg-muted-foreground", label: "Chưa học" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn("h-3 w-3 rounded-sm", color)} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {mapData?.categories.map((cat) => (
          <Card key={cat.id} className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">{cat.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {cat.topics.map((topic) => (
                  <Link key={topic.topicId} href={`/learn/${topic.topicId}`}>
                    <div className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      getMasteryColor(topic.masteryPercent, topic.state)
                    )}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <MasteryDot pct={topic.masteryPercent} state={topic.state} />
                        <span className="text-xs font-medium">{getMasteryLabel(topic.masteryPercent, topic.state as TopicState)}</span>
                      </div>
                      <div className="text-sm font-semibold leading-tight">{topic.topicName}</div>
                      {topic.state !== "NOT_STARTED" && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Mastery</span>
                            <span className="font-bold">{topic.masteryPercent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-current opacity-70 transition-all"
                              style={{ width: `${topic.masteryPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {topic.state === "NOT_STARTED" && (
                        <div className="mt-2 text-xs opacity-60">Nhấn để bắt đầu</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: "Thành thạo", count: mapData?.categories.flatMap(c => c.topics).filter(t => t.state === "MASTERY" || t.masteryPercent >= 80).length ?? 0, color: "text-emerald-400" },
                { label: "Đang học", count: mapData?.categories.flatMap(c => c.topics).filter(t => t.state === "CALIBRATION" || t.state === "DIAGNOSTIC").length ?? 0, color: "text-amber-400" },
                { label: "Ôn tập", count: mapData?.categories.flatMap(c => c.topics).filter(t => t.state === "REVIEW").length ?? 0, color: "text-cyan-400" },
                { label: "Chưa học", count: mapData?.categories.flatMap(c => c.topics).filter(t => t.state === "NOT_STARTED").length ?? 0, color: "text-muted-foreground" },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className={cn("text-2xl font-black", color)}>{count}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
