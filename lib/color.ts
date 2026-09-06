/**
 * Color maths shared between the (client) ThemeColorPicker and any server code that needs the
 * same contrast check — kept in a plain module rather than a 'use client' file because a
 * 'use client' component's named exports don't survive being imported into server-side code
 * (Route Handlers, Server Components): the module boundary turns them into client references
 * that aren't callable as plain functions at runtime, even though it type-checks and builds fine.
 *
 * No new hues are invented anywhere here — everything is a move on a picked color.
 */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const hex2rgb = (h?: string): [number, number, number] => {
  let s = String(h || '').replace('#', '')
  if (s.length === 3) s = s.split('').map((c) => c + c).join('')
  return [parseInt(s.slice(0, 2), 16) || 0, parseInt(s.slice(2, 4), 16) || 0, parseInt(s.slice(4, 6), 16) || 0]
}

const rgb2hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')

interface HSL { h: number; s: number; l: number }

function rgb2hsl(hex?: string): HSL {
  const [r, g, b] = hex2rgb(hex).map((v) => v / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4)
  h *= 60
  const l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  return { h, s, l }
}

function hsl2hex({ h, s, l }: HSL): string {
  s = clamp(s, 0, 1); l = clamp(l, 0, 1)
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return rgb2hex((t[0] + m) * 255, (t[1] + m) * 255, (t[2] + m) * 255)
}

export const lum = (hex: string) => {
  const [r, g, b] = hex2rgb(hex).map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const ratio = (a: string, b: string) => {
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

export const normalise = (v?: string) => {
  let s = String(v || '').trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/i.test(s) ? '#' + s.toLowerCase() : null
}

export interface ThemeRoles {
  /** The picked color. Headings, rules, primary actions. */
  accent: string
  /** Darkened same-hue partner. Eyebrows, hover, small text on light. */
  deep: string
  /** 93%-lightness same-hue wash. Callout and price surfaces. */
  tint: string
}

/** The two supporting roles, always derived from the accent unless the user unlocks them. */
export function deriveRoles(accent: string): { deep: string; tint: string } {
  const { h, s, l } = rgb2hsl(accent)
  return {
    deep: hsl2hex({ h, s: clamp(s * 1.08, 0, 1), l: clamp(l * 0.62, 0.12, 0.42) }),
    tint: hsl2hex({ h, s: clamp(s * 0.55, 0, 0.42), l: 0.93 }),
  }
}

/** White or ink, whichever stays legible on the accent. */
export const textOn = (accent: string) => (ratio(accent, '#ffffff') >= 3.6 ? '#ffffff' : '#171717')

/** Contrast of the accent against the proposal's white paper. */
export function paperContrast(accent: string): { r: number; tone: 'good' | 'warn'; icon: string; text: string } {
  const r = ratio(accent, '#ffffff')
  if (r >= 4.5) return { r, tone: 'good', icon: 'check', text: 'Strong on white paper' }
  if (r >= 3) return { r, tone: 'good', icon: 'check', text: 'Fine for headings and rules' }
  return { r, tone: 'warn', icon: 'triangle-alert', text: 'Low contrast — headings will look faint' }
}

export const shadesOf = (accent: string) => {
  const { h, s } = rgb2hsl(accent)
  return [0.86, 0.72, 0.58, 0.46, 0.34, 0.24].map((l) => hsl2hex({ h, s: clamp(s * (l > 0.7 ? 0.72 : 1), 0, 1), l }))
}
