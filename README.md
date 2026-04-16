# KNTT Adaptive — Web App

Nền tảng học Toán cấp 3 thích ứng, xây trên dữ liệu LaTeX "Kết Nối Tri Thức" (KNTT) của repo mẹ.

## Chạy local

```bash
cd web
npm install      # chỉ cần lần đầu
npm run dev      # → http://localhost:5173
```

Các script khác:

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Vite dev server, hot reload |
| `npm run build` | TypeScript check + bundle production vào `dist/` |
| `npm run preview` | Chạy thử bundle production |
| `npm run lint` | ESLint |

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS** v3
- **react-router-dom** — routing
- **zod** — runtime validation (profile từ localStorage)
- **clsx** — className composition

## Cấu trúc

```
src/
├── App.tsx                       # BrowserRouter + InitialRedirect gate
├── main.tsx                      # React entry
├── index.css                     # Tailwind base
├── types/user.ts                 # UserProfile, Grade, Goal, DailyMinutes, SelfLevel
├── data/topics.ts                # 39 bài KNTT (lớp 10/11/12) — seed data
├── lib/
│   ├── cn.ts                     # clsx wrapper
│   └── storage.ts                # localStorage (load/save/clear) + zod guard
├── contexts/OnboardingContext.tsx# reducer state + canProceedFrom predicate
├── components/
│   ├── ui/                       # Button, Card, RadioCardGroup, StepIndicator
│   └── onboarding/               # 8 step slides + OnboardingWizard orchestrator
└── pages/
    ├── OnboardingPage.tsx        # "/"  — wizard
    └── HomePage.tsx              # "/home" — sau khi submit profile
```

## Phase 1 — Onboarding wizard

Thu thập 6 trường profile qua 8 bước:

| # | Step | Trường lưu |
|---|---|---|
| 0 | Welcome | — |
| 1 | Grade | `grade` (10/11/12) |
| 2 | Goal | `goal` (giua-ky / cuoi-ky / thpt-qg / nang-cao) |
| 3 | DailyTime | `dailyMinutes` (30/45/60/90) |
| 4 | Deadline | `deadline` (nullable ISO date) |
| 5 | SelfAssessment | `selfLevel` (yeu/tb/kha/gioi) |
| 6 | WeakTopics | `weakTopicIds[]` — lọc theo grade |
| 7 | Summary | (submit) |

Profile được lưu vào `localStorage` key **`kntt.profile.v1`**. Reload sẽ tự redirect về `/home`.

## Phase tiếp theo

- Phase 2: Diagnostic test (bài đầu vào adaptive)
- Phase 3: Parser LaTeX → JSON ngân hàng câu hỏi (thay thế `data/topics.ts` hardcoded)
- Phase 4: Adaptive engine + spaced repetition
- Phase 5: Backend, auth, multi-device sync
