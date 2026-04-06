import { Link } from "wouter";
import { ArrowRight, BookOpen, Clock, Star, Zap, TrendingUp, RotateCcw, CheckCircle, AlertCircle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import {
  useGetDashboardSummary,
  useGetRecentActivity,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";

const activityTypeLabel: Record<string, string> = {
  MASTERY_ACHIEVED: "Đạt mastery",
  STREAK_MILESTONE: "Chuỗi ngày",
  TOPIC_STARTED: "Bắt đầu chủ đề",
  REVIEW_COMPLETED: "Hoàn thành ôn tập",
  MISCONCEPTION_FIXED: "Sửa lỗi tư duy",
  LEVEL_UP: "Lên cấp",
};

const activityIcon: Record<string, React.ElementType> = {
  MASTERY_ACHIEVED: CheckCircle,
  STREAK_MILESTONE: Flame,
  TOPIC_STARTED: BookOpen,
  REVIEW_COMPLETED: RotateCcw,
  MISCONCEPTION_FIXED: AlertCircle,
  LEVEL_UP: Star,
};

const activityColor: Record<string, string> = {
  MASTERY_ACHIEVED: "text-emerald-400",
  STREAK_MILESTONE: "text-orange-400",
  TOPIC_STARTED: "text-blue-400",
  REVIEW_COMPLETED: "text-cyan-400",
  MISCONCEPTION_FIXED: "text-amber-400",
  LEVEL_UP: "text-purple-400",
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Vừa xong";
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function DashboardPage() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: activity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Đang tải...</div>
        </div>
      </AppLayout>
    );
  }

  const todayProgress = summary ? Math.round((summary.todayProgressMinutes / summary.todayGoalMinutes) * 100) : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Bảng điều khiển</h1>
            <p className="text-muted-foreground mt-1">Chào trở lại, {summary?.student.name?.split(" ").pop()}!</p>
          </div>
          {summary?.currentTopicId && (
            <Link href={`/learn/${summary.currentTopicId}`}>
              <Button className="gap-2">
                Tiếp tục học <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "XP tổng cộng",
              value: summary?.student.totalXp?.toLocaleString("vi-VN") ?? "—",
              icon: Zap,
              color: "text-amber-400",
              bg: "bg-amber-400/10",
            },
            {
              label: "Chuỗi ngày",
              value: `${summary?.student.streakDays ?? 0} ngày`,
              icon: Flame,
              color: "text-orange-400",
              bg: "bg-orange-400/10",
            },
            {
              label: "Cấp độ",
              value: `Cấp ${summary?.student.level ?? 1}`,
              icon: Star,
              color: "text-purple-400",
              bg: "bg-purple-400/10",
            },
            {
              label: "Chủ đề hoàn thành",
              value: `${summary?.topicsCompleted ?? 0}/${summary?.topicsTotal ?? 0}`,
              icon: CheckCircle,
              color: "text-emerald-400",
              bg: "bg-emerald-400/10",
            },
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

        <div className="grid md:grid-cols-3 gap-6">
          {/* Daily Goal */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Mục tiêu hôm nay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-3xl font-black text-primary">{summary?.todayProgressMinutes}</span>
                <span className="text-muted-foreground mb-1">/ {summary?.todayGoalMinutes} phút</span>
              </div>
              <Progress value={todayProgress} className="h-2 mb-3" />
              <div className="text-sm text-muted-foreground">
                {todayProgress >= 100
                  ? "Tuyệt vời! Đã đạt mục tiêu hôm nay!"
                  : `Còn ${summary ? summary.todayGoalMinutes - summary.todayProgressMinutes : 0} phút nữa`}
              </div>
            </CardContent>
          </Card>

          {/* Mastery Overview */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Tiến độ tổng thể
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-3xl font-black text-primary">{summary?.overallMasteryPercent}%</span>
              </div>
              <Progress value={summary?.overallMasteryPercent} className="h-2 mb-3" />
              <div className="text-sm text-muted-foreground">
                Đã mastery {summary?.topicsCompleted}/{summary?.topicsTotal} chủ đề
              </div>
            </CardContent>
          </Card>

          {/* Review Due */}
          <Card className={cn("border-border", summary?.reviewDueCount ? "border-amber-500/40 bg-amber-400/5" : "bg-card")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-400" />
                Ôn tập đến hạn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-3xl font-black text-amber-400">{summary?.reviewDueCount ?? 0}</span>
                <span className="text-muted-foreground mb-1">chủ đề</span>
              </div>
              <Link href="/review">
                <Button variant="outline" size="sm" className="gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-400/10">
                  Ôn tập ngay <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Weekly XP Chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              XP tuần này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={summary?.weeklyXp ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  itemStyle={{ color: "hsl(var(--primary))" }}
                  formatter={(v) => [`${v} XP`, ""]}
                />
                <Bar dataKey="xp" radius={[4, 4, 0, 0]}>
                  {(summary?.weeklyXp ?? []).map((entry, idx) => (
                    <Cell key={idx} fill={entry.xp > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(activity ?? []).map((item) => {
                const Icon = activityIcon[item.type] ?? BookOpen;
                const color = activityColor[item.type] ?? "text-muted-foreground";
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted", color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{item.description}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{timeAgo(item.timestamp)}</span>
                        {item.xpEarned > 0 && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5 text-amber-400">
                            +{item.xpEarned} XP
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
