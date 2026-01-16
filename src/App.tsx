import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import PapersPage from './pages/PapersPage';
import PaperDetailPage from './pages/PaperDetailPage';
import SpamPage from './pages/SpamPage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';
import './styles/animations.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<div className="page-transition"><HomePage /></div>} />
            <Route path="/papers" element={<div className="page-transition"><PapersPage /></div>} />
            <Route path="/papers/:id" element={<div className="page-transition"><PaperDetailPage /></div>} />
            <Route path="/spam" element={<div className="page-transition"><SpamPage viewMode="grid" /></div>} />
            <Route path="/collections" element={<div className="page-transition"><CollectionsPage /></div>} />
            <Route path="/collections/:id" element={<div className="page-transition"><CollectionDetailPage /></div>} />
            <Route path="/settings" element={<div className="page-transition"><SettingsPage /></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg, #fff)',
              color: 'var(--toast-color, #1f2937)',
              border: '1px solid var(--toast-border, #e5e7eb)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
