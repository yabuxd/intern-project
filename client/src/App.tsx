import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
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
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';

  if (isAuthRoute) {
    return (
      <AuthLayout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </AuthLayout>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
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
