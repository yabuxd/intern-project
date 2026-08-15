import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminRolesPage } from './pages/AdminRolesPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ManageMenuPage } from './pages/ManageMenuPage';
import { MenuPage } from './pages/MenuPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { OrderQueuePage } from './pages/OrderQueuePage';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { TablesPage } from './pages/TablesPage';
import { SignupPage } from './pages/SignupPage';
import { AuthProvider, useAuth } from './store';
import { HeroSkeleton } from './components/ui';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <HeroSkeleton />;
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
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId/receipt"
          element={
            <ProtectedRoute>
              <ReceiptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/queue"
          element={
            <ProtectedRoute>
              <OrderQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/deliveries"
          element={
            <ProtectedRoute>
              <DeliveriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu/manage"
          element={
            <ProtectedRoute>
              <ManageMenuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservations"
          element={
            <ProtectedRoute>
              <ReservationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="roles" element={<AdminRolesPage />} />
        </Route>
        <Route path="/admin/permissions" element={<Navigate to="/admin/roles" replace />} />
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
