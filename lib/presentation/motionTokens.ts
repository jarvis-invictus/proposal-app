/** framer-motion can't read CSS custom properties, so these mirror the easing/duration tokens
 * defined in app/globals.css — keep the two in sync if those tokens change.
 * Durations here are in seconds (framer-motion's unit); globals.css uses ms. */
export const EASE_OUT_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_SPRING: [number, number, number, number] = [0.175, 0.885, 0.32, 1.275]
export const EASE_STANDARD: [number, number, number, number] = [0.22, 0.61, 0.36, 1]

export const DURATION_BASE = 0.2
export const DURATION_SLOW = 0.34
export const DURATION_ENTRANCE = 0.56
