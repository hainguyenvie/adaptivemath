# Profile Page Redesign — Design Spec

**Date:** 2026-04-22  
**Route:** `/profile` → `KnowledgeProfilePage`  
**Status:** Approved

---

## 1. Goal

Redesign `KnowledgeProfilePage` to match the visual language of the homepage, onboarding, and diagnostic pages. The existing page uses generic `slate-` grays, minimal shadows, and flat cards. The redesign brings in the shared design system: `#e7fff3` mint background, radial gradient blobs, glassmorphic white cards, lime `#b2f746` accent, and `rounded-[32px]` large-radius panels.

No data logic changes. Only the presentation layer changes.

---

## 2. Design System (shared with other pages)

| Token | Value |
|---|---|
| Page background | `#e7fff3` |
| Background gradients | Same radial set as `DiagnosticPage` / `OnboardingPage` |
| Primary accent | `#b2f746` (lime) |
| Dark green | `#003527`, `#064e3b` |
| Olive text | `#446900` |
| Muted text | `#9fb3aa` |
| Card style | `bg-white/90 border border-white/65 rounded-[32px] shadow-[0_18px_55px_rgba(0,53,39,0.09)] backdrop-blur-sm` |
| Font | Manrope (existing) |
| Pill/badge radius | `rounded-full` |
| Nav bar | Same floating pill as `DiagnosticPage` |

---

## 3. Layout

**Structure:** Dark sidebar (fixed left) + scrollable main content. Sidebar is sticky. Same pattern as `HomePage`.

```
┌─ floating pill navbar (top, fixed) ────────────────────┐
│ AdaptiveMath · Hồ Sơ Năng Lực              ← Trang chủ │
└────────────────────────────────────────────────────────┘

┌─ sidebar (280px sticky) ──┐  ┌─ main content ──────────┐
│  Dark #064e3b→#003527     │  │  Page title + subtitle  │
│  rounded-[32px]           │  │  [Warning banner?]      │
│  ─────────────────────    │  │  Stats pills row        │
│  🎓 Grade · Goal badge    │  │  ─────────────────────  │
│  Big θ value              │  │  Radar ╎ Gap list       │
│  SE ±xx label             │  │  (2 col, equal width)   │
│  Progress bar → target    │  │  ─────────────────────  │
│  ─────────────────────    │  │  Chapters accordion     │
│  Nav anchors:             │  │  ─────────────────────  │
│    📊 Tổng quan           │  │  Error signals (dark)   │
│    🎯 Điểm yếu            │  │  ─────────────────────  │
│    📚 Chi tiết chủ đề     │  │  Learning path CTA card │
│    ⚡ Tín hiệu lỗi        │  └─────────────────────────┘
│    🗺️ Lộ trình học        │
│  ─────────────────────    │
│  [Lime CTA button]        │
└───────────────────────────┘
```

---

## 4. Components to Build / Modify

### 4.1 `KnowledgeProfilePage.tsx` (full rewrite of JSX)

- Replace `bg-gradient-to-b from-slate-50` with `#e7fff3` + radial gradient overlay (copy pattern from `DiagnosticPage`)
- Add two floating blur blobs (same as `OnboardingPage`)
- Replace content wrapper with sidebar + main layout
- Preserve all existing data logic (`useMemo`, `useEffect`, `buildKnowledgeProfile`) — no changes to data

### 4.2 New `ProfileSidebar` component (`src/components/profile/ProfileSidebar.tsx`)

Props: `profile: KnowledgeProfile`, `onGeneratePath: () => void`

Renders:
- Rounded dark card (`bg-gradient-to-b from-[#064e3b] to-[#003527] rounded-[32px]`)
- Grade + goal badge row with avatar emoji
- Large θ value (`text-[44px] font-black text-[#b2f746]`)
- SE label below
- Progress bar: `(avgMastery / profile.target) * 100%` filled lime on dark track, where `avgMastery = mean(profile.topics.map(t => t.mastery))`, capped at 100%
- Divider
- Nav anchor links (scroll-to via `id` anchors on main sections)
- Lime CTA button at bottom: "🗺️ Tạo lộ trình học tập"

Active nav state: highlight the item whose section is in the viewport (IntersectionObserver).

### 4.3 Stats Row (inline in page)

Five glassmorphic pill-shaped stat blocks in a horizontal flex row:
- θ value + "Năng lực" label
- Answered % + "Trả lời" label  
- Gap count + "Điểm yếu" label — lime accent background
- Target % + "Mục tiêu" label
- Avg duration (mm:ss) + "Thời gian TB" label

Style: `bg-white/90 border border-white/65 rounded-full px-5 py-2 shadow-[0_8px_24px_rgba(0,53,39,0.07)] backdrop-blur-sm`

### 4.4 `RadarChart` (existing, no logic change)

Wrap in new card style: `bg-white/90 border border-white/65 rounded-[32px]`. Add card title label above. Move `MasteryBandLegend` inside this card below the chart.

### 4.5 `GapList` (existing, restyle)

Wrap in matching card. Gap bar colors: `from-[#fb7185] to-[#fb923c]` (rose→orange gradient). Show "⭐" for `weakBonus > 1` topics. Show "+N điểm yếu khác" footer if gaps > 5 shown.

### 4.6 `ChapterBarList` (existing, restyle)

Wrap in card. Each chapter row: `bg-[#f4fff9]` header with chapter name, mastery bar colored by band, percentage. Expanded topics: white background with left border `border-l-4 border-[#e4fbef]`.

### 4.7 Error Signals Card (existing `ErrorSignalsCard`, restyle)

New wrapper: `bg-gradient-to-br from-[#064e3b] to-[#003527] rounded-[32px] p-6`. Title in lime. 4-tile grid with `bg-white/7` tiles. Speed tile gets lime tint `bg-[#b2f746]/12` when signal is present.

### 4.8 Learning Path CTA Card (existing inline section, restyle)

White/85 card with lime border and lime box-shadow glow. Two columns: text (label + heading + subtitle) and lime pill button. Replaces the current `Banner`-style prompt.

### 4.9 Preliminary Warning Banner (conditional)

Shown only when `profile.isPreliminary === true`. Style: rounded-full pill, amber background `bg-amber-50/90 border border-amber-300/50`, not the flat `Banner` component.

---

## 5. Floating Navbar

Reuse the same pill nav pattern from `DiagnosticPage`:

```tsx
<nav className="fixed left-1/2 top-3 z-50 -translate-x-1/2 flex items-center gap-3
  rounded-full border border-white/50 bg-white/92 px-5 py-2.5
  shadow-[0_12px_40px_rgba(0,53,39,0.08)] backdrop-blur-sm">
  <span className="font-black text-[#003527]">Adaptive<span className="text-[#b2f746]">Math</span></span>
  <div className="h-4 w-px bg-[#003527]/12" />
  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#446900]">Hồ Sơ Năng Lực</span>
  <Link to="/" className="ml-auto text-xs font-bold text-[#9fb3aa] hover:text-[#003527]">← Trang chủ</Link>
</nav>
```

---

## 6. Section IDs for Anchor Navigation

| Section | `id` |
|---|---|
| Stats row | `profile-overview` |
| Radar + Gap list | `profile-gaps` |
| Chapters accordion | `profile-chapters` |
| Error signals | `profile-signals` |
| Learning path CTA | `profile-path` |

Sidebar nav items use `href="#profile-overview"` etc. with smooth scroll (`scroll-behavior: smooth` already on `html`).

---

## 7. Responsive Behaviour

- **≥ lg (1024px):** Sidebar visible (280px), main content offset
- **< lg:** Sidebar hidden; stats + content stack vertically; top nav stays
- Radar + Gap list: 2-col on `≥ md`, stacked on mobile
- Error signals grid: 4-col on `≥ md`, 2-col on mobile, 1-col on small

---

## 8. Files Changed

| File | Change |
|---|---|
| `src/pages/KnowledgeProfilePage.tsx` | Full JSX rewrite (data logic untouched) |
| `src/components/profile/ProfileSidebar.tsx` | New component |
| `src/components/profile/RadarChart.tsx` | Wrapper style only |
| `src/components/profile/GapList.tsx` | Wrapper + bar colors |
| `src/components/profile/ChapterBarList.tsx` | Wrapper + row colors |
| `src/components/profile/ErrorSignalsCard.tsx` | Dark card wrapper |
| `src/components/profile/MasteryBandLegend.tsx` | Moved inside RadarChart card |

No changes to: `src/lib/profiling.ts`, `src/lib/storage.ts`, `src/lib/diagnosticStorage.ts`, `src/types/profile.ts`, `src/types/user.ts`.

---

## 9. Out of Scope

- Data logic changes
- New data fetched from Supabase
- `ProfileDebugPanel` visual overhaul (keep as-is, still expandable)
- Learning path generation logic
- Animations / entrance transitions (keep existing)
