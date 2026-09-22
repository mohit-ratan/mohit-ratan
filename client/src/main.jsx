import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import App from './App.jsx';
import { CelebrationProvider } from './context/CelebrationContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CelebrationProvider><App /></CelebrationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
