import { AppShell } from './app/AppShell'
import { ErrorBoundary } from './app/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  )
}

export default App
