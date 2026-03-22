import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CatBondDiagram from './catbond-diagram.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CatBondDiagram />
  </StrictMode>,
)
