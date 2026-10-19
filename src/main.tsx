import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import { hydrateStores } from '@/store/persistence'
import '@/styles/index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('TinyWorld could not mount: #root element is missing from index.html.')
}

// Hydrate persisted settings and discoveries before the first render so the UI
// never flashes default values before loading real ones.
hydrateStores()

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
