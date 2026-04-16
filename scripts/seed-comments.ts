import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yueqnoxfyagyxmkcutvo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZXFub3hmeWFneXhta2N1dHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTU1NzMsImV4cCI6MjA5MTkzMTU3M30._5oA5vBsoX1pagEHjT7xxnyfmTTh6bQLT6jGVgOCybk'
)

async function seed() {
  // Get all shared paths
  const { data: paths } = await supabase.from('shared_paths').select('id, display_name').order('shared_at', { ascending: false })
  if (!paths || paths.length === 0) { console.log('No paths found'); return }

  const comments = [
    { display_name: 'An Khang', avatar: '🌟', content: 'Lộ trình hay quá! Mình cũng đang ôn THPT QG, inspire nhiều lắm 💪', device_id: 'comment-device-1' },
    { display_name: 'Bảo Ngọc', avatar: '✨', content: 'Chuỗi 12 ngày streak xịn thật! Mình mới được 3 ngày thôi 😅', device_id: 'comment-device-2' },
    { display_name: 'Minh Tú', avatar: '🎓', content: 'Bạn dùng YouTube kênh nào để học Toán vậy? Share cho mình với!', device_id: 'comment-device-3' },
    { display_name: 'Hải Đăng', avatar: '🚀', content: 'Cố lên nha! Mình cũng lớp 11, cùng nhau chiến THPT QG!', device_id: 'comment-device-4' },
    { display_name: 'Thuý Vy', avatar: '📖', content: 'Mình thấy phần Lượng giác khó nhất, bạn có tips gì không?', device_id: 'comment-device-5' },
    { display_name: 'Quang Huy', avatar: '💪', content: 'Respect! 89% completion rate là quá đỉnh luôn 🔥', device_id: 'comment-device-6' },
    { display_name: 'Mai Linh', avatar: '🎯', content: '100% hoàn thành!!! Goals siu nhân 🦸‍♂️', device_id: 'comment-device-7' },
    { display_name: 'Đức Minh', avatar: '🧠', content: 'Nhóm học có hiệu quả không bạn? Mình đang tính tìm nhóm ôn cùng', device_id: 'comment-device-8' },
  ]

  // Distribute comments across paths
  for (let i = 0; i < comments.length; i++) {
    const pathIdx = i % paths.length
    const comment = comments[i]
    const timeOffset = (comments.length - i) * 3600000 * (1 + Math.random() * 5)

    const { error } = await supabase.from('comments').insert({
      path_id: paths[pathIdx].id,
      ...comment,
      created_at: new Date(Date.now() - timeOffset).toISOString(),
    })

    if (error) {
      console.error(`Failed: ${comment.display_name}:`, error.message)
    } else {
      console.log(`✓ ${comment.display_name} → ${paths[pathIdx].display_name}`)
    }
  }
  console.log('\nDone!')
}

seed()
