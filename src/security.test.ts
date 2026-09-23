// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The Content-Security-Policy in vercel.json allows only scripts it knows. These checks fail
 * the build if index.html gains a script the policy would silently block in production.
 */

const html = readFileSync('index.html', 'utf8')
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const siteHeaders = new Map(
  vercel.headers.find((rule) => rule.source === '/(.*)')!.headers.map((h) => [h.key, h.value]),
)
const csp = siteHeaders.get('Content-Security-Policy')!
const directive = (name: string) =>
  csp
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([key]) => key === name)
    ?.slice(1) ?? []

describe('Content-Security-Policy', () => {
  it('allows each inline script in index.html by its hash', () => {
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    expect(inline.length).toBeGreaterThan(0)
    for (const script of inline) {
      const hash = `'sha256-${createHash('sha256').update(script).digest('base64')}'`
      expect(directive('script-src')).toContain(hash)
    }
  })

  it('has no inline event handlers or javascript: links, which it can’t allow', () => {
    expect(html).not.toMatch(/\son[a-z]+\s*=/i)
    expect(html).not.toMatch(/javascript:/i)
  })

  it('never allows eval, plugins, framing or other sites', () => {
    expect(directive('script-src')).not.toContain("'unsafe-eval'")
    expect(directive('script-src')).not.toContain("'unsafe-inline'")
    expect(directive('object-src')).toEqual(["'none'"])
    expect(directive('frame-ancestors')).toEqual(["'none'"])
    expect(directive('default-src')).toEqual(["'self'"])
    expect(csp).not.toMatch(/https?:/)
  })

  it('comes with the other hardening headers', () => {
    expect(siteHeaders.get('X-Content-Type-Options')).toBe('nosniff')
    expect(siteHeaders.get('X-Frame-Options')).toBe('DENY')
    expect(siteHeaders.get('Referrer-Policy')).toBe('no-referrer')
    expect(siteHeaders.get('Permissions-Policy')).toContain('camera=()')
  })
})

describe('Cache headers', () => {
  const cacheFor = (source: string) =>
    vercel.headers
      .find((rule) => rule.source === source)
      ?.headers.find((h) => h.key === 'Cache-Control')?.value

  it('caches fingerprinted assets forever, and always revalidates the app shell', () => {
    expect(cacheFor('/assets/(.*)')).toContain('immutable')
    // A stale sw.js or index.html would pin visitors to an old version.
    expect(cacheFor('/(sw.js|index.html|manifest.webmanifest)')).toContain('max-age=0')
  })
})
