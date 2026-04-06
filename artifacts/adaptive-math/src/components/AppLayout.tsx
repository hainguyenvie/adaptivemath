import { Link, useRoute } from "wouter";
import { BookOpen, LayoutDashboard, Map, Target, MessageCircle, Route, RotateCcw, BarChart3, Star } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGetStudentProfile } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { href: "/knowledge-map", label: "Bản đồ kiến thức", icon: Map },
  { href: "/learn/phan-so", label: "Luyện tập", icon: Target },
  { href: "/tutor", label: "Gia sư Stella", icon: MessageCircle },
  { href: "/learning-path", label: "Lộ trình", icon: Route },
  { href: "/review", label: "Ôn tập", icon: RotateCcw },
  { href: "/report", label: "Báo cáo", icon: BarChart3 },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const [active] = useRoute(href === "/dashboard" ? "/" : href);
  const [atDash] = useRoute("/dashboard");
  const isActive = href === "/dashboard" ? (active || atDash) : active;

  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
        isActive
          ? "bg-primary/20 text-primary border border-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{label}</span>
      </div>
    </Link>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: profile } = useGetStudentProfile();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-60 flex-shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Toán Lên</div>
              <div className="text-xs text-muted-foreground">Học thích nghi</div>
            </div>
          </div>
        </div>

        {profile && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile.avatar ?? undefined} alt={profile.name} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {profile.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profile.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    Lớp {profile.grade}
                  </Badge>
                  <span className="text-xs text-amber-400 flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-current" />
                    Cấp {profile.level}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="text-amber-400 font-semibold">{profile.totalXp.toLocaleString("vi-VN")}</span> XP
              </span>
              <span className="flex items-center gap-1">
                <span className="text-orange-400 font-semibold">{profile.streakDays}</span> ngay lien tuc
              </span>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            Toán Lên &copy; 2025
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
