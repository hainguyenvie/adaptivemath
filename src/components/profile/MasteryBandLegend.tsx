import { MASTERY_BANDS, type MasteryBand } from '../../types/profile'
import { cn } from '../../lib/cn'

/**
 * Centralized color palette for mastery bands. Both the legend and the
 * topic bars read from this so colors stay consistent across the profile.
 */
export const BAND_BAR_CLASS: Record<MasteryBand, string> = {
  'chua-biet': 'bg-rose-500',
  'dang-hoc': 'bg-orange-500',
  'so-cap': 'bg-amber-500',
  kha: 'bg-teal-500',
  'thanh-thao': 'bg-emerald-500',
}

export const BAND_TEXT_CLASS: Record<MasteryBand, string> = {
  'chua-biet': 'text-rose-700',
  'dang-hoc': 'text-orange-700',
  'so-cap': 'text-amber-700',
  kha: 'text-teal-700',
  'thanh-thao': 'text-emerald-700',
}

export const BAND_CHIP_CLASS: Record<MasteryBand, string> = {
  'chua-biet': 'bg-rose-100 text-rose-800 border-rose-200',
  'dang-hoc': 'bg-orange-100 text-orange-800 border-orange-200',
  'so-cap': 'bg-amber-100 text-amber-800 border-amber-200',
  kha: 'bg-teal-100 text-teal-800 border-teal-200',
  'thanh-thao': 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

/**
 * Horizontal legend showing the 5 mastery bands with their color swatch,
 * label, and numeric range. Rendered next to the radar chart so the student
 * can map colors → bands visually.
 */
export function MasteryBandLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {MASTERY_BANDS.map((band) => (
        <div
          key={band.id}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-1',
            BAND_CHIP_CLASS[band.id],
          )}
        >
          <span
            className={cn('h-2 w-2 rounded-full', BAND_BAR_CLASS[band.id])}
          />
          <span className="font-medium">{band.label}</span>
          <span className="tabular-nums opacity-70">
            {band.min.toFixed(2)}–{band.id === 'thanh-thao' ? '1.00' : band.max.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}
