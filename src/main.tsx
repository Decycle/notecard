import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import StatsPage from './components/StatsPage.tsx'

// @ts-ignore - Ignoring TypeScript errors for React Router
const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    {/* @ts-ignore - Ignoring TypeScript errors for React Router components */}
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<App />} />
        <Route path='/stats' element={<StatsPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
