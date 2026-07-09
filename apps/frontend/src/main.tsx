import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster
          theme="dark"
          position="top-right"
          offset={{ top: 76 }}
          toastOptions={{
            style: {
              background: 'rgba(23,19,16,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0ebe0',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
