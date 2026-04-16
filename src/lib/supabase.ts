import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Anonymous device ID — stored in localStorage, used for ownership tracking. */
export function getDeviceId(): string {
  let id = localStorage.getItem('kntt.deviceId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('kntt.deviceId', id)
  }
  return id
}
