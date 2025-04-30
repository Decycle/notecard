import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import StatsPage from './components/StatsPage.tsx'

// @ts-ignore - Ignoring TypeScript errors for React Router
const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    {/*
      Using HashRouter instead of BrowserRouter for GitHub Pages
      This ensures routes work correctly with the sub-path
    */}
    <HashRouter>
      <Routes>
        <Route path='/' element={<App />} />
        <Route path='/stats' element={<StatsPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
)
