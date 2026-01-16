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
import { PageTransition } from './components/common/PageTransition';
import './App.css';
import './styles/animations.css';
import './styles/transitions.css';

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
            <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
            <Route path="/papers" element={<PageTransition><PapersPage /></PageTransition>} />
            <Route path="/papers/:id" element={<PageTransition><PaperDetailPage /></PageTransition>} />
            <Route path="/spam" element={<PageTransition><SpamPage viewMode="grid" /></PageTransition>} />
            <Route path="/collections" element={<PageTransition><CollectionsPage /></PageTransition>} />
            <Route path="/collections/:id" element={<PageTransition><CollectionDetailPage /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
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
