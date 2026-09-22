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

  it('says so when the preview fails, without losing anything', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPreview.mockRejectedValue(new Error('boom'))
    render(<PreviewPane />)
    expect(await screen.findByText(/The preview couldn’t be drawn/)).toBeInTheDocument()
    expect(useDraftStore.getState().invoice).not.toBeNull()
    consoleError.mockRestore()
  })

  it('switches the invoice’s template', async () => {
    renderPreview.mockResolvedValue(pagesOf(1))
    render(<PreviewPane />)
    fireEvent.click(screen.getByRole('radio', { name: 'Classic' }))
    expect(useDraftStore.getState().invoice?.templateId).toBe('classic')
    await waitFor(() => expect(lastProps().view.templateId).toBe('classic'))
  })
})
