import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AuthProvider, useAuth } from './store';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <p className="text-stone-600">Loading…</p>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AppLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
