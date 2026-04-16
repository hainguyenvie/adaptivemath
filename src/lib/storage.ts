import { z } from 'zod'
import type { UserProfile } from '../types/user'

/**
 * localStorage key for the user profile. Versioned so we can migrate safely
 * when the schema evolves in later phases.
 */
export const PROFILE_STORAGE_KEY = 'kntt.profile.v1'

/**
 * Runtime schema guarding whatever was previously serialized — never trust the
 * shape of data coming out of localStorage even on our own domain.
 */
const profileSchema = z.object({
  grade: z.union([z.literal(10), z.literal(11), z.literal(12)]),
  goal: z.enum(['giua-ky', 'cuoi-ky', 'thpt-qg', 'nang-cao']),
  dailyMinutes: z.union([
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(90),
  ]),
  deadline: z.string().nullable(),
  selfLevel: z.enum(['yeu', 'tb', 'kha', 'gioi']),
  weakTopicIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export function saveProfile(profile: UserProfile): void {
  const serialized = JSON.stringify(profile)
  window.localStorage.setItem(PROFILE_STORAGE_KEY, serialized)
}

export function loadProfile(): UserProfile | null {
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    const validated = profileSchema.safeParse(parsed)
    if (!validated.success) {
      // Corrupt or stale shape — discard silently so the user gets a clean start.
      window.localStorage.removeItem(PROFILE_STORAGE_KEY)
      return null
    }
    return validated.data
  } catch {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY)
    return null
  }
}

export function clearProfile(): void {
  window.localStorage.removeItem(PROFILE_STORAGE_KEY)
}
