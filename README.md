# Toán Lên — Nền tảng học Toán thích nghi bằng AI

Nền tảng học Toán lớp 7 thích nghi, sử dụng AI gia sư Stella và thuật toán IRT/SM-2.

## Tính năng chính

- **Luyện tập thích nghi** — Câu hỏi tự động điều chỉnh độ khó theo năng lực (IRT Theta)
- **Gia sư AI Stella** — Hướng dẫn theo phương pháp Socratic, không giải thẳng đáp án
- **Bản đồ kiến thức** — Theo dõi mức độ thành thạo từng chủ đề
- **Ôn tập thông minh** — Thuật toán SM-2 giúp nhớ lâu hơn
- **Lộ trình cá nhân hoá** — Sắp xếp thứ tự học dựa trên lỗ hổng kiến thức
- **Báo cáo nhận thức** — Phân tích sâu cách học và tư duy
- **Toàn bộ giao diện bằng tiếng Việt**
- **Hỗ trợ hiển thị công thức Toán** (KaTeX)

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Express + TypeScript |
| UI Components | shadcn/ui + Tailwind CSS |
| Math Rendering | KaTeX |
| Charts | Recharts |
| API Client | Orval (tự sinh từ OpenAPI) |
| Package Manager | pnpm (monorepo) |

## Yêu cầu hệ thống

- **Node.js** >= 18
- **pnpm** >= 8

Cài pnpm nếu chưa có:
```bash
npm install -g pnpm
```

## Cài đặt và chạy

### 1. Clone repository

```bash
git clone https://github.com/hainguyenvie/adaptivemath.git
cd adaptivemath
```

### 2. Cài đặt dependencies

```bash
pnpm install
```

### 3. Chạy Backend (API Server)

Mở **terminal thứ nhất**:
```bash
pnpm --filter @workspace/api-server run dev
```

API sẽ chạy tại: `http://localhost:3001`

### 4. Chạy Frontend

Mở **terminal thứ hai**:
```bash
pnpm --filter @workspace/adaptive-math run dev
```

Ứng dụng sẽ chạy tại: `http://localhost:5173`

Mở trình duyệt và vào `http://localhost:5173` là xong.

> **Lưu ý:** Vite tự động chuyển tiếp các request `/api/*` sang backend ở cổng 3001 — không cần cấu hình thêm.

## Cấu trúc dự án

```
adaptivemath/
├── artifacts/
│   ├── adaptive-math/          # Frontend React + Vite
│   │   └── src/
│   │       ├── pages/          # 8 trang chính
│   │       ├── components/     # AppLayout, MathDisplay, UI components
│   │       └── App.tsx         # Routing
│   └── api-server/             # Backend Express
│       └── src/
│           └── routes/
│               └── adaptive-math/   # 8 route handlers
├── lib/
│   ├── api-spec/               # OpenAPI spec (openapi.yaml)
│   ├── api-zod/                # Zod validators (tự sinh)
│   └── api-client-react/       # React Query hooks (tự sinh)
└── package.json
```

## Các trang trong ứng dụng

| Đường dẫn | Trang |
|---|---|
| `/` | Trang chủ |
| `/dashboard` | Bảng điều khiển |
| `/knowledge-map` | Bản đồ kiến thức |
| `/learn/:topicId` | Luyện tập thích nghi |
| `/tutor` | Gia sư AI Stella |
| `/learning-path` | Lộ trình học tập |
| `/review` | Ôn tập thông minh (SM-2) |
| `/report` | Báo cáo nhận thức |

## Lưu ý

Dự án hiện dùng **dữ liệu mẫu trong bộ nhớ** (không cần database thực). Mọi thay đổi sẽ mất khi khởi động lại server — phù hợp để demo và phát triển.
