import { Link } from "wouter";
import { ArrowRight, BookOpen, Brain, Target, TrendingUp, Star, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: Brain, title: "Thích nghi thông minh", desc: "Hệ thống tự động điều chỉnh độ khó theo năng lực thực tế của từng học sinh" },
  { icon: Target, title: "Luyện tập theo mục tiêu", desc: "Bài tập được chọn lọc dựa trên lý thuyết phản ứng câu hỏi (IRT) để tối ưu học tập" },
  { icon: Zap, title: "Gia sư AI Stella", desc: "Được dẫn dắt theo phương pháp Socrates — Stella không cho đáp án, giúp em tự khám phá" },
  { icon: Shield, title: "Phát hiện lỗi tư duy", desc: "Nhận diện sai lầm khái niệm ẩn sau từng đáp án sai để sửa tận gốc" },
  { icon: TrendingUp, title: "Ôn tập thông minh SM-2", desc: "Lịch ôn tập cá nhân hóa theo thuật toán Spaced Repetition giúp nhớ lâu hơn" },
  { icon: Star, title: "Bản đồ kiến thức", desc: "Hình dung rõ ràng điểm mạnh, điểm yếu qua bản đồ kiến thức trực quan" },
];

const testimonials = [
  { name: "Lê Thu Hà", grade: "Học sinh lớp 7", text: "Nhờ Stella mình mới hiểu ra rằng mình đã nhầm cách quy đồng mẫu số bao nhiêu năm nay. Giờ làm Phân số không còn sai nữa!" },
  { name: "Trần Quốc Bảo", grade: "Học sinh lớp 9", text: "Bản đồ kiến thức giúp mình thấy ngay chỗ nào yếu nhất. Từ 45 lên 78 điểm toán chỉ trong 2 tháng!" },
  { name: "Nguyễn Minh Anh", grade: "Học sinh lớp 6", text: "Toán Lên không nhàm chán như sách giáo khoa. Mình học mỗi ngày 30 phút mà vẫn thấy vui!" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Toán Lên</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Tính năng</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Phản hồi</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Bảng giá</a>
          </nav>
          <Link href="/dashboard">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              Bắt đầu học
            </Button>
          </Link>
        </div>
      </header>

      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
            Nền tảng học Toán thích nghi hàng đầu Việt Nam
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Học Toán <span className="text-primary">thông minh</span> hơn,<br />
            không phải nhiều hơn
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Toán Lên sử dụng AI để cá nhân hóa từng bài học, phát hiện điểm yếu ẩn và dẫn dắt em đến mastery thực sự — không phải chỉ học vẹt.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 px-8 h-12 text-base">
                Bắt đầu miễn phí <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/knowledge-map">
              <Button size="lg" variant="outline" className="px-8 h-12 text-base">
                Xem bản đồ kiến thức
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[["10.000+", "Học sinh"], ["98%", "Cải thiện điểm"], ["3x", "Nhanh hơn lớp thường"]].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black text-primary">{num}</div>
                <div className="text-sm text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Học khác — Nhớ khác</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">Toán Lên không chỉ là bài tập online. Đây là người thầy thông minh hiểu từng em học sinh.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Gia sư AI Stella</Badge>
              <h2 className="text-4xl font-black mb-6 leading-tight">
                Không cho đáp án —<br /><span className="text-primary">Giúp em tự tìm ra</span>
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Stella sử dụng phương pháp Socrates: thay vì giải luôn bài toán, Stella hỏi ngược lại để em tự khám phá lỗi sai và hiểu sâu hơn. Đây là cách học dẫn đến hiểu thật, không phải thuộc lòng.
              </p>
              <div className="space-y-3">
                {["Gợi ý từng bước theo cấp độ", "Phát hiện lỗi khái niệm cụ thể", "Giải thích ngắn gọn, trực quan"].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <Link href="/tutor">
                <Button className="mt-8 gap-2">Thử Stella ngay <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">S</div>
                <div className="bg-muted rounded-xl rounded-tl-none p-3 text-sm max-w-xs">
                  Em thử vẽ số line của tử số và mẫu số lên giấy xem nhé. Hai phân số này có chung mẫu không?
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <div className="bg-primary/20 rounded-xl rounded-tr-none p-3 text-sm max-w-xs">
                  Không ạ, một cái là /4 và cái kia là /6
                </div>
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">K</div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">S</div>
                <div className="bg-muted rounded-xl rounded-tl-none p-3 text-sm max-w-xs">
                  Chính xác! Vậy trước khi cộng, em cần làm gì với hai mẫu số này?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Học sinh nói gì?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ name, grade, text }) => (
              <div key={name} className="p-6 rounded-xl border border-border bg-card">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic">"{text}"</p>
                <div className="font-semibold text-sm">{name}</div>
                <div className="text-xs text-muted-foreground">{grade}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-6 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-4">Bắt đầu ngay hôm nay</h2>
          <p className="text-muted-foreground mb-10">Miễn phí 14 ngày. Không cần thẻ tín dụng.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {[
              { name: "Cơ bản", price: "Miễn phí", features: ["5 chủ đề cơ bản", "Gia sư Stella (10 lần/ngày)", "Báo cáo cơ bản"], cta: "Dùng thử ngay", variant: "outline" as const },
              { name: "Pro", price: "99.000đ/tháng", features: ["Toàn bộ chương trình lớp 6-9", "Gia sư Stella không giới hạn", "Báo cáo chi tiết + lỗi tư duy"], cta: "Đăng ký Pro", variant: "default" as const },
            ].map(({ name, price, features, cta, variant }) => (
              <div key={name} className={`p-6 rounded-xl border ${variant === "default" ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                <div className="text-lg font-bold mb-1">{name}</div>
                <div className="text-3xl font-black mb-6">{price}</div>
                <ul className="space-y-2 mb-6">
                  {features.map(f => (
                    <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard">
                  <Button variant={variant} className="w-full">{cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-border text-center text-sm text-muted-foreground">
        <div>&copy; 2025 Toán Lên. Tất cả quyền được bảo lưu.</div>
      </footer>
    </div>
  );
}
