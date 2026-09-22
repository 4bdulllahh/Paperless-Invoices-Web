import { afterEach, describe, expect, it, vi } from 'vitest'

const original = Object.getOwnPropertyDescriptor(Navigator.prototype, 'language')!

function setLanguage(value: string | undefined) {
  Object.defineProperty(Navigator.prototype, 'language', { get: () => value, configurable: true })
}

afterEach(() => {
  Object.defineProperty(Navigator.prototype, 'language', original)
  vi.resetModules()
})

async function defaultLocale() {
  const { initialSettings } = await import('./stores')
  return initialSettings.locale
}

describe('default locale', () => {
  it('follows the browser language', async () => {
    setLanguage('de-de')
    expect(await defaultLocale()).toBe('de-DE')
  })

  it.each([
    ['invalid', 'not a locale!!'],
    ['missing', undefined],
  ])('falls back to en-US when the language is %s', async (_, language) => {
    setLanguage(language)
    expect(await defaultLocale()).toBe('en-US')
  })
})
