import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

const samples = [
  {
    display_name: 'Minh Anh',
    avatar: '🎯',
    grade: 11,
    goal: 'thpt-qg',
    daily_minutes: 45,
    total_topics: 8,
    total_days: 15,
    sprint_count: 3,
    completion_pct: 72,
    xp: 1250,
    level: 3,
    current_streak: 12,
    longest_streak: 12,
    badges: ['first-practice', 'streak-5', 'streak-10', 'q-100', 'first-mastery'],
    total_questions: 156,
    study_tools: ['Sách giáo khoa', 'YouTube', 'Đề thi các năm'],
    motivation: 'Cố gắng đỗ đại học Bách Khoa! 💪',
    completion_velocity: 4.2,
    sprint_summary: [
      { weekNumber: 1, topicNames: ['Dãy số', 'Cấp số cộng', 'Cấp số nhân'], activityCount: 9, learnCount: 4, practiceCount: 4, reviewCount: 1 },
      { weekNumber: 2, topicNames: ['Giới hạn dãy số', 'Giới hạn hàm số', 'Hàm số liên tục'], activityCount: 9, learnCount: 4, practiceCount: 4, reviewCount: 1 },
      { weekNumber: 3, topicNames: ['Đạo hàm', 'Khoảng cách'], activityCount: 6, learnCount: 3, practiceCount: 2, reviewCount: 1 },
    ],
    inspire_count: 23,
    device_id: 'seed-device-1',
  },
  {
    display_name: 'Huy Hoàng',
    avatar: '🚀',
    grade: 10,
    goal: 'cuoi-ky',
    daily_minutes: 30,
    total_topics: 5,
    total_days: 8,
    sprint_count: 2,
    completion_pct: 45,
    xp: 520,
    level: 2,
    current_streak: 5,
    longest_streak: 7,
    badges: ['first-practice', 'streak-5'],
    total_questions: 67,
    study_tools: ['Sách giáo khoa', 'App học thêm'],
    motivation: 'Ôn cho kịp cuối kỳ! 📚',
    completion_velocity: 3.1,
    sprint_summary: [
      { weekNumber: 1, topicNames: ['Mệnh đề', 'Tập hợp', 'Vectơ'], activityCount: 8, learnCount: 3, practiceCount: 4, reviewCount: 1 },
      { weekNumber: 2, topicNames: ['Lượng giác', 'Thống kê'], activityCount: 6, learnCount: 3, practiceCount: 2, reviewCount: 1 },
    ],
    inspire_count: 8,
    device_id: 'seed-device-2',
  },
  {
    display_name: 'Thu Hà',
    avatar: '⭐',
    grade: 11,
    goal: 'thpt-qg',
    daily_minutes: 60,
    total_topics: 12,
    total_days: 22,
    sprint_count: 4,
    completion_pct: 89,
    xp: 2800,
    level: 5,
    current_streak: 20,
    longest_streak: 20,
    badges: ['first-practice', 'streak-5', 'streak-10', 'q-100', 'q-500', 'first-mastery', 'perfect-assessment'],
    total_questions: 342,
    study_tools: ['Sách giáo khoa', 'YouTube', 'Gia sư', 'Nhóm học', 'Đề thi các năm'],
    motivation: 'Chinh phục THPT QG, mục tiêu 9+ điểm Toán! 🔥',
    completion_velocity: 6.8,
    sprint_summary: [
      { weekNumber: 1, topicNames: ['Lượng giác', 'Công thức lượng giác'], activityCount: 8, learnCount: 3, practiceCount: 4, reviewCount: 1 },
      { weekNumber: 2, topicNames: ['Dãy số', 'Cấp số cộng', 'Cấp số nhân'], activityCount: 9, learnCount: 4, practiceCount: 4, reviewCount: 1 },
      { weekNumber: 3, topicNames: ['Quan hệ song song', 'Phép chiếu'], activityCount: 8, learnCount: 3, practiceCount: 4, reviewCount: 1 },
      { weekNumber: 4, topicNames: ['Giới hạn', 'Đạo hàm', 'Thể tích'], activityCount: 9, learnCount: 4, practiceCount: 4, reviewCount: 1 },
    ],
    inspire_count: 47,
    device_id: 'seed-device-3',
  },
  {
    display_name: 'Đức Anh',
    avatar: '💪',
    grade: 12,
    goal: 'thpt-qg',
    daily_minutes: 90,
    total_topics: 4,
    total_days: 6,
    sprint_count: 1,
    completion_pct: 100,
    xp: 890,
    level: 2,
    current_streak: 6,
    longest_streak: 6,
    badges: ['first-practice', 'streak-5', 'first-mastery', 'perfect-assessment'],
    total_questions: 98,
    study_tools: ['Sách giáo khoa', 'Đề thi các năm', 'Ghi chú tay'],
    motivation: 'Lớp 12 rồi, phải all-in thôi! 🎓',
    completion_velocity: 8.5,
    sprint_summary: [
      { weekNumber: 1, topicNames: ['Đơn điệu & cực trị', 'Phương sai', 'Khoảng biến thiên', 'Mặt cầu'], activityCount: 12, learnCount: 5, practiceCount: 6, reviewCount: 1 },
    ],
    inspire_count: 15,
    device_id: 'seed-device-4',
  },
  {
    display_name: 'Phương Linh',
    avatar: '📖',
    grade: 10,
    goal: 'nang-cao',
    daily_minutes: 60,
    total_topics: 10,
    total_days: 18,
    sprint_count: 3,
    completion_pct: 55,
    xp: 1680,
    level: 4,
    current_streak: 8,
    longest_streak: 14,
    badges: ['first-practice', 'streak-5', 'streak-10', 'q-100', 'first-mastery'],
    total_questions: 215,
    study_tools: ['Sách giáo khoa', 'YouTube', 'Nhóm học', 'Flashcard'],
    motivation: 'Muốn vào đội tuyển HSG tỉnh! 🏆',
    completion_velocity: 5.3,
    sprint_summary: [
      { weekNumber: 1, topicNames: ['Mệnh đề', 'Tập hợp', 'BPT bậc nhất'], activityCount: 9, learnCount: 4, practiceCount: 4, reviewCount: 1 },
      { weekNumber: 2, topicNames: ['Lượng giác', 'Hệ thức lượng', 'Vectơ'], activityCount: 9, learnCount: 4, practiceCount: 4, reviewCount: 1 },
      { weekNumber: 3, topicNames: ['Thống kê', 'Nhị thức Newton', 'Tích vô hướng'], activityCount: 9, learnCount: 4, practiceCount: 4, reviewCount: 1 },
    ],
    inspire_count: 31,
    device_id: 'seed-device-5',
  },
  {
    display_name: 'Quốc Bảo',
    avatar: '🧠',
    grade: 11,
    goal: 'giua-ky',
    daily_minutes: 30,
    total_topics: 4,
    total_days: 5,
    sprint_count: 1,
    completion_pct: 30,
    xp: 180,
    level: 1,
    current_streak: 3,
    longest_streak: 3,
    badges: ['first-practice'],
    total_questions: 28,
    study_tools: ['App học thêm'],
    motivation: 'Ôn nhanh cho giữa kỳ tuần sau 😅',
    completion_velocity: 2.4,
    sprint_summary: [
      { weekNumber: 1, topicNames: ['Hàm số lượng giác', 'Phương trình lượng giác'], activityCount: 8, learnCount: 3, practiceCount: 4, reviewCount: 1 },
    ],
    inspire_count: 5,
    device_id: 'seed-device-6',
  },
  {
    display_name: 'Thanh Tùng',
    avatar: '🔥',
    grade: 11,
    goal: 'cuoi-ky',
    daily_minutes: 45,
    total_topics: 6,
    total_days: 10,
    sprint_count: 2,
    completion_pct: 60,
    xp: 920,
    level: 3,
    current_streak: 0,
    longest_streak: 9,
    badges: ['first-practice', 'streak-5', 'q-100'],
    total_questions: 112,
    study_tools: ['Sách giáo khoa', 'YouTube', 'Ghi chú tay'],
    motivation: 'Năm nay phải vào top 10 lớp!',
    completion_velocity: 3.8,
    sprint_summary: [
      { weekNumber: 1, topicNames: ['Dãy số', 'Cấp số cộng', 'Cấp số nhân'], activityCount: 9, learnCount: 4, practiceCount: 4, reviewCount: 1 },
      { weekNumber: 2, topicNames: ['Thống kê', 'Quan hệ song song'], activityCount: 7, learnCount: 3, practiceCount: 3, reviewCount: 1 },
    ],
    inspire_count: 12,
    device_id: 'seed-device-7',
  },
]

async function seed() {
  console.log('Seeding community with', samples.length, 'sample paths...')
  
  // Stagger shared_at times so they appear in order
  const now = Date.now()
  for (let i = 0; i < samples.length; i++) {
    const sample = {
      ...samples[i],
      shared_at: new Date(now - i * 3600000 * (2 + Math.random() * 10)).toISOString(), // spread over last few days
    }
    
    const { error } = await supabase.from('shared_paths').insert(sample)
    if (error) {
      console.error(`Failed to insert ${sample.display_name}:`, error.message)
    } else {
      console.log(`✓ ${sample.display_name} (Lớp ${sample.grade}, ${sample.goal})`)
    }
  }
  
  console.log('\nDone! Check /community to see the cards.')
}

seed()
