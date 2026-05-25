/**
 * Client-only plugin that applies the saved color mode preference
 * before first paint to avoid a flash of wrong theme.
 *
 * Reads from `localStorage` and defaults to light mode.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const stored = localStorage.getItem('reqcore-color-mode') as 'light' | 'dark' | null
  const shouldBeDark = stored === 'dark'

  if (shouldBeDark) {
    document.documentElement.classList.add('dark')
    document.documentElement.style.colorScheme = 'dark'
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = 'light'
  }
})
