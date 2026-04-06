import { useState, useRef, useEffect } from "react";
import { Send, BookOpen, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { MathText } from "@/components/MathDisplay";
import { sendTutorMessage, getTutorHint } from "@workspace/api-client-react";
import type { ChatMessage } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEMO_QUESTION_ID = "q-phanso-001";

interface UIMessage {
  role: "student" | "stella";
  text: string;
  timestamp: Date;
}

const socraticTypeLabel: Record<string, string> = {
  RECALL: "Gợi nhớ kiến thức",
  ANALYZE: "Phân tích",
  GUIDE: "Dẫn dắt",
  CONFIRM: "Xác nhận",
};

const hintLevels = [
  { value: "1", label: "Gợi ý nhẹ" },
  { value: "2", label: "Gợi ý vừa" },
  { value: "3", label: "Gợi ý rõ" },
  { value: "4", label: "Gợi ý đầy đủ" },
];

const demoTopics = [
  { id: DEMO_QUESTION_ID, name: "Phân số — Cộng phân số khác mẫu" },
  { id: "q-nguyen-001", name: "Số nguyên — Cộng số nguyên âm" },
  { id: "q-daisoh-001", name: "Đại số — Khai triển hằng đẳng thức" },
];

export default function TutorPage() {
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      role: "stella",
      text: "Xin chào! Mình là Stella, gia sư Toán của em. Mình sẽ không cho đáp án trực tiếp nhé — thay vào đó mình sẽ giúp em tự khám phá cách giải. Em đang gặp khó khăn với bài toán nào?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hintLevel, setHintLevel] = useState("2");
  const [selectedTopic, setSelectedTopic] = useState(DEMO_QUESTION_ID);
  const [lastHint, setLastHint] = useState<{ text: string; socraticType: string; level: number } | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    const userMsg: UIMessage = { role: "student", text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const now = new Date().toISOString();
    const newHistory: ChatMessage[] = [
      ...conversationHistory,
      { role: "user", content: text, timestamp: now },
    ];

    try {
      const res = await sendTutorMessage({
        message: text,
        questionId: selectedTopic,
        topicId: null,
        conversationHistory: newHistory,
      });
      const stellaText = res.message;
      setMessages(prev => [...prev, { role: "stella", text: stellaText, timestamp: new Date() }]);
      setConversationHistory([
        ...newHistory,
        { role: "assistant", content: stellaText, timestamp: new Date().toISOString() },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: "stella", text: "Stella đang nghĩ... Thử lại nhé!", timestamp: new Date() }]);
    }
    setLoading(false);
  };

  const getHint = async () => {
    setLoading(true);
    try {
      const res = await getTutorHint({ questionId: selectedTopic, hintLevel: Number(hintLevel) });
      const hintText = res.message;
      const socType = res.socraticType ?? "GUIDE";
      setLastHint({ text: hintText, socraticType: socType, level: Number(hintLevel) });
      setMessages(prev => [...prev, {
        role: "stella",
        text: `[Gợi ý cấp ${hintLevel}] ${hintText}`,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, { role: "stella", text: "Không thể lấy gợi ý. Thử lại nhé!", timestamp: new Date() }]);
    }
    setLoading(false);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Gia sư Stella</h1>
            <p className="text-muted-foreground text-sm mt-1">Phương pháp Socrates — Em tự khám phá, Stella dẫn dắt</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400">Trực tuyến</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="h-[480px] overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={cn("flex gap-3", msg.role === "student" && "justify-end")}>
                      {msg.role === "stella" && (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          S
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        msg.role === "stella"
                          ? "bg-muted rounded-tl-none"
                          : "bg-primary/20 border border-primary/30 rounded-tr-none"
                      )}>
                        <MathText text={msg.text} />
                        <div className="text-xs text-muted-foreground mt-1.5">{formatTime(msg.timestamp)}</div>
                      </div>
                      {msg.role === "student" && (
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          Em
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">S</div>
                      <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-2.5">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
                <div className="border-t border-border p-3 flex gap-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Nhập câu hỏi hoặc mô tả bài toán..."
                    className="flex-1"
                    disabled={loading}
                  />
                  <Button onClick={sendMessage} disabled={!input.trim() || loading} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Chủ đề
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {demoTopics.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  Xin gợi ý
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={hintLevel} onValueChange={setHintLevel}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hintLevels.map(h => (
                      <SelectItem key={h.value} value={h.value} className="text-xs">{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={getHint}
                  disabled={loading}
                  variant="outline"
                  className="w-full text-xs gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-400/10"
                  size="sm"
                >
                  <Lightbulb className="h-3 w-3" />
                  Nhận gợi ý
                </Button>

                {lastHint && (
                  <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3 text-xs space-y-2">
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-xs">
                      {socraticTypeLabel[lastHint.socraticType] ?? lastHint.socraticType}
                    </Badge>
                    <p className="text-muted-foreground leading-relaxed"><MathText text={lastHint.text} /></p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="font-semibold text-foreground mb-2">Phương pháp Socrates</div>
                  {["Stella luôn hỏi ngược lại thay vì giải", "Dẫn dắt từng bước nhỏ", "Em tự tìm ra đáp án"].map(s => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className="h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
