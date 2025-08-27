import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastContainer } from 'react-toastify'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastContainer
      style={{ marginTop: "70px" }}
    />
    <App />
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