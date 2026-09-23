import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TemplateProps } from '../../templates/layout'
import { clearAllData } from '../../storage/backup'
import { useDraftStore } from '../../storage/stores'
import { PreviewPane } from './PreviewPane'

const { renderPreview } = vi.hoisted(() => ({ renderPreview: vi.fn() }))
vi.mock('../../services/pdf', () => ({ renderPreview, warmUp: vi.fn() }))

let urls = 0
const pagesOf = (count: number) =>
  Array.from({ length: count }, () => ({ url: `blob:page-${++urls}`, width: 1240, height: 1754 }))
const revokeObjectURL = vi.fn()

beforeEach(async () => {
  renderPreview.mockReset()
  urls = 0
  revokeObjectURL.mockReset()
  URL.revokeObjectURL = revokeObjectURL
  await clearAllData()
  useDraftStore.getState().startNewInvoice('2026-09-23')
})

afterEach(() => vi.useRealTimers())

const lastProps = () => renderPreview.mock.lastCall?.[0] as TemplateProps
/** A page's width as a percentage of the pane (jsdom simplifies "calc(100cqw * 1.25)"). */
const widthOf = (page: HTMLElement) => Number(page.style.width.match(/[\d.]+/)?.[0])

describe('PreviewPane', () => {
  it('shows a stand-in page until the PDF is drawn, then the real pages', async () => {
    renderPreview.mockResolvedValue(pagesOf(2))
    render(<PreviewPane />)
    expect(screen.getByRole('img', { name: 'Loading preview' })).toBeInTheDocument()

    const number = useDraftStore.getState().invoice!.number
    expect(
      await screen.findByRole('img', { name: `Invoice ${number}, page 1 of 2` }),
    ).toHaveAttribute('src', 'blob:page-1')
    expect(screen.getByRole('img', { name: `Invoice ${number}, page 2 of 2` })).toBeInTheDocument()
    expect(screen.getByText('A4 · 2 pages')).toBeInTheDocument()
    expect(lastProps().view.number).toBe(number)
  })

  it('redraws after edits and frees the old page images', async () => {
    renderPreview.mockResolvedValueOnce(pagesOf(1)).mockResolvedValueOnce(pagesOf(1))
    render(<PreviewPane />)
    await screen.findByRole('img', { name: /page 1 of 1/ })

    act(() => useDraftStore.getState().updateInvoice((inv) => ({ ...inv, notes: 'Thanks!' })))

    await waitFor(() => expect(renderPreview).toHaveBeenCalledTimes(2))
    expect(lastProps().view.notes).toBe('Thanks!')
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:page-1'))
    expect(screen.getByRole('img', { name: /page 1 of 1/ })).toHaveAttribute('src', 'blob:page-2')
  })

  it('waits for a pause in typing before redrawing', async () => {
    renderPreview.mockImplementation(async () => pagesOf(1))
    render(<PreviewPane />)
    await screen.findByRole('img', { name: /page 1 of 1/ })
    renderPreview.mockClear()

    vi.useFakeTimers()
    for (const notes of ['T', 'Th', 'Tha', 'Than', 'Thank']) {
      act(() => useDraftStore.getState().updateInvoice((inv) => ({ ...inv, notes })))
      await act(() => vi.advanceTimersByTimeAsync(100))
    }
    expect(renderPreview).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(400))
    expect(renderPreview).toHaveBeenCalledOnce()
    expect(lastProps().view.notes).toBe('Thank')
  })

  it('says so when the preview fails, without losing anything, and can try again', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPreview.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(pagesOf(1))
    render(<PreviewPane />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/The preview couldn’t be drawn/)
    expect(useDraftStore.getState().invoice).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('img', { name: /page 1 of 1/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('switches the invoice’s template', async () => {
    renderPreview.mockResolvedValue(pagesOf(1))
    render(<PreviewPane />)
    fireEvent.change(screen.getByLabelText('Invoice template'), { target: { value: 'bold' } })
    expect(useDraftStore.getState().invoice?.templateId).toBe('bold')
    await waitFor(() => expect(lastProps().view.templateId).toBe('bold'))
  })

  it('zooms with buttons and Ctrl + scroll, and remembers the zoom', async () => {
    renderPreview.mockResolvedValue(pagesOf(1))
    const { unmount } = render(<PreviewPane />)
    const page = await screen.findByRole('img', { name: /page 1 of 1/ })
    // Opens at fit width, drawn at the base resolution.
    expect(widthOf(page)).toBe(100)
    expect(renderPreview.mock.lastCall?.[1]).toBe(1240)

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(widthOf(page)).toBe(125)
    expect(screen.getByRole('button', { name: /Zoom 125%/ })).toBeInTheDocument()

    // One mouse-wheel notch zooms by about 1.2×.
    const pane = screen.getByRole('region', { name: 'Invoice preview' })
    fireEvent.wheel(pane, { deltaY: -100, ctrlKey: true })
    expect(screen.getByRole('button', { name: /Zoom 153%/ })).toBeInTheDocument()
    // A plain scroll just scrolls.
    fireEvent.wheel(pane, { deltaY: 100 })
    expect(screen.getByRole('button', { name: /Zoom 153%/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /fit to width/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(widthOf(page)).toBe(75)

    unmount()
    render(<PreviewPane />)
    expect(await screen.findByRole('button', { name: /Zoom 75%/ })).toBeInTheDocument()
  })

  it('fits a whole page, and back to the width', async () => {
    renderPreview.mockResolvedValue(pagesOf(1))
    render(<PreviewPane />)
    await screen.findByRole('img', { name: /page 1 of 1/ })

    fireEvent.click(screen.getByRole('button', { name: 'Fit whole page' }))
    expect(screen.getByRole('button', { name: 'Fit to width' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Fit to width' }))
    expect(screen.getByRole('button', { name: 'Fit whole page' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
