import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { AuthProvider, useAuth } from './store';
import { HeroSkeleton } from './components/ui';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const MenuPage = lazy(() => import('./pages/MenuPage').then((m) => ({ default: m.MenuPage })));
const TablesPage = lazy(() => import('./pages/TablesPage').then((m) => ({ default: m.TablesPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderQueuePage = lazy(() =>
  import('./pages/OrderQueuePage').then((m) => ({ default: m.OrderQueuePage })),
);
const DeliveriesPage = lazy(() =>
  import('./pages/DeliveriesPage').then((m) => ({ default: m.DeliveriesPage })),
);
const ManageMenuPage = lazy(() =>
  import('./pages/ManageMenuPage').then((m) => ({ default: m.ManageMenuPage })),
);
const ReservationsPage = lazy(() =>
  import('./pages/ReservationsPage').then((m) => ({ default: m.ReservationsPage })),
);
const PaymentsPage = lazy(() =>
  import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const ReceiptPage = lazy(() =>
  import('./pages/ReceiptPage').then((m) => ({ default: m.ReceiptPage })),
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminRolesPage = lazy(() =>
  import('./pages/AdminRolesPage').then((m) => ({ default: m.AdminRolesPage })),
);

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

function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<HeroSkeleton />}>{children}</Suspense>;
}

function AppRoutes() {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';

  if (isAuthRoute) {
    return (
      <AuthLayout>
        <PageSuspense>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
        </PageSuspense>
      </AuthLayout>
    );
  }

  return (
    <AppLayout>
      <PageSuspense>
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
            <Route path="queue" element={<OrderQueuePage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="menu" element={<ManageMenuPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="tables" element={<TablesPage />} />
          </Route>
          <Route path="/admin/permissions" element={<Navigate to="/admin/roles" replace />} />
        </Routes>
      </PageSuspense>
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
