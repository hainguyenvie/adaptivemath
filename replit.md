# KNTT Adaptive - Nền tảng học toán thích ứng

## Mô tả
Ứng dụng học toán thích ứng cho học sinh THPT Việt Nam dựa trên chương trình "Kết Nối Tri Thức" (KNTT). Cung cấp trải nghiệm học cá nhân hóa qua hệ thống kiểm tra thích ứng (CAT) và theo dõi kiến thức.

## Tech Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v3
- **Routing**: React Router DOM v7
- **Math Rendering**: KaTeX
- **Forms**: React Hook Form + Zod
- **Backend**: Supabase (tích hợp sẵn)

## Cấu trúc dự án
- `src/pages/` - Các trang chính (Onboarding, Home, Diagnostic, Practice)
- `src/components/` - Components UI
- `src/lib/` - Logic cốt lõi (adaptive engine, IRT, CAT, BKT)
- `src/data/` - Dữ liệu tĩnh (topics, questions)
- `src/contexts/` - React Contexts
- `src/types/` - TypeScript types
- `scripts/` - Utility scripts

## Cách chạy
- **Dev**: `npm run dev` (chạy trên port 5000)
- **Build**: `npm run build`
- **Preview**: `npm run preview`

## Workflow
- **Start application**: `npm run dev` (port 5000, webview)
