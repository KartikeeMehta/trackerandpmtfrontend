import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastContainer } from 'react-toastify'
import FeatureFlagsProvider from './components/FeatureFlagsProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastContainer
      style={{ marginTop: "70px" }}
    />
    <FeatureFlagsProvider>
      <App />
    </FeatureFlagsProvider>
  </StrictMode>,
)

// Register a simple service worker to improve notification reliability in production
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((e) => console.debug('SW register failed:', e?.message || e))
  })
}