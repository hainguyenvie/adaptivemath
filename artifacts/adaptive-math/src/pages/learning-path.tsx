import { Link } from "wouter";
import { Lock, CheckCircle, PlayCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useGetLearningPath, getGetLearningPathQueryKey } from "@workspace/api-client-react";
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

export default function LearningPathPage() {
  const { data: path, isLoading } = useGetLearningPath({
    query: { queryKey: getGetLearningPathQueryKey() },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Đang tải lộ trình...</div>
        </div>
      </AppLayout>
    );
  }

  const grouped: Record<string, typeof path> = {};
  (path ?? []).forEach(bundle => {
    if (!grouped[bundle.topicName]) grouped[bundle.topicName] = [];
    grouped[bundle.topicName]!.push(bundle);
  });

  const completed = (path ?? []).filter(b => b.status === "COMPLETED").length;
  const total = (path ?? []).length;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Lộ trình học tập</h1>
            <p className="text-muted-foreground text-sm mt-1">Từng bước chinh phục Toán lớp 7</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-primary">{completed}/{total}</div>
            <div className="text-xs text-muted-foreground">Bước hoàn thành</div>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(grouped).map(([topicName, bundles]) => {
            const topicCompleted = bundles!.filter(b => b.status === "COMPLETED").length;
            const topicCurrent = bundles!.find(b => b.status === "CURRENT");
            const topicDone = topicCompleted === bundles!.length;

            return (
              <div key={topicName}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
                    topicDone ? "bg-emerald-500/20 text-emerald-400" : topicCurrent ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {topicDone ? <CheckCircle className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-current" />}
                  </div>
                  <h2 className="font-bold text-base">{topicName}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {topicCompleted}/{bundles!.length} bước
                  </Badge>
                </div>

                <div className="ml-9 space-y-2">
                  {bundles!.map((bundle, idx) => (
                    <Card
                      key={bundle.id}
                      className={cn(
                        "border transition-all",
                        bundle.status === "COMPLETED" && "border-emerald-500/20 bg-emerald-500/5",
                        bundle.status === "CURRENT" && "border-primary/40 bg-primary/5",
                        bundle.status === "LOCKED" && "border-border opacity-60"
                      )}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                          bundle.status === "COMPLETED" && "bg-emerald-500/20 text-emerald-400",
                          bundle.status === "CURRENT" && "bg-primary/20 text-primary",
                          bundle.status === "LOCKED" && "bg-muted text-muted-foreground"
                        )}>
                          {bundle.status === "COMPLETED" && <CheckCircle className="h-4 w-4" />}
                          {bundle.status === "CURRENT" && <PlayCircle className="h-4 w-4" />}
                          {bundle.status === "LOCKED" && <Lock className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            Bước {idx + 1}: {topicName}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={cn("text-xs border", difficultyColor[bundle.difficultyLevel])}>
                              {difficultyLabel[bundle.difficultyLevel]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{bundle.estimatedMinutes} phút</span>
                            <span className="text-xs text-muted-foreground">Mastery &ge; {bundle.masteryRequired}%</span>
                          </div>
                        </div>
                        {bundle.status === "CURRENT" && (
                          <Link href={`/learn/${bundle.topicId}`}>
                            <Button size="sm" className="gap-1 h-7 text-xs">
                              Học ngay <ChevronRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                        {bundle.status === "COMPLETED" && (
                          <Link href={`/learn/${bundle.topicId}`}>
                            <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-muted-foreground">
                              Ôn tập
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
