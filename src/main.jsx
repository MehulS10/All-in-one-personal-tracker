import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Override default alert/confirm with Electron native dialogs to fix keyboard focus loss on Windows
if (window.api && window.api.showAlert && window.api.showConfirm) {
  window.alert = (message, title) => window.api.showAlert(message, title);
  window.confirm = (message, title) => window.api.showConfirm(message, title);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
