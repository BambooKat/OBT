import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // <-- importa questo
import App from './App.jsx'
import './styles/theme.css'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* <-- aggiungi wrapper */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)