import { CraneMark } from './components/brand/CraneMark'

function App() {
  return (
    <main className="grid h-dvh place-items-center p-4">
      <section className="w-full max-w-md rounded-xl border border-sand bg-cream p-8 shadow-[0_8px_32px_rgb(37_36_34/0.08)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-md bg-flame text-ink">
              <CraneMark className="w-7" strokeWidth={1.25} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Paperless</span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-sand/40 px-3 py-1 text-xs font-medium text-olive">
            <span className="size-2 rounded-full bg-flame" aria-hidden="true" />
            Milestone 0
          </span>
        </div>
        <CraneMark className="mx-auto mt-8 w-56 text-ink" strokeWidth={2} />
        <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">
          Hello, Paperless
        </h1>
        <p className="mt-2 text-olive">
          Free, private invoicing that runs entirely in your browser. Your data never leaves your
          device.
        </p>
        <button
          type="button"
          className="mt-6 rounded-full bg-flame px-6 py-3 text-base font-semibold text-ink transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-flame/40 focus-visible:outline-none"
        >
          Create invoice
        </button>
      </section>
    </main>
  )
}

export default App
