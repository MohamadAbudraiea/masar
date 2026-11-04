import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './state/auth.jsx';

// Pages & Layouts
import Login from './pages/public/Login.jsx';
import PendingApproval from './pages/public/PendingApproval.jsx';
import ManufacturerLayout from './layouts/ManufacturerLayout.jsx';
import ManufacturerOverview from './pages/manufacturer/Overview.jsx';
import EscrowLayout from './layouts/EscrowLayout.jsx';
import EscrowOverview from './pages/escrow/Overview.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import AdminOverview from './pages/admin/Overview.jsx';
import DriverLayout from './layouts/DriverLayout.jsx';
import DriverShipments from './pages/driver/Shipments.jsx';

function ProtectedRoute({ allowedRoles, children }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-xs text-ink-muted">
        Loading session...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'pending' || user.status === 'rejected') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}

export default function AppRoutes() {
  const { user, token, loading } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          token && user ? (
            user.status === 'pending' || user.status === 'rejected' ? (
              <Navigate to="/pending-approval" replace />
            ) : (
              <Navigate to={`/${user.role}`} replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/pending-approval" element={<PendingApproval />} />

      {/* 1. Manufacturer Portal */}
      <Route
        path="/manufacturer"
        element={
          <ProtectedRoute allowedRoles={['manufacturer']}>
            <ManufacturerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ManufacturerOverview />} />
        {/* Subroutes to be added in Phase 2 & 3 */}
      </Route>

      {/* 2. Escrow Portal */}
      <Route
        path="/escrow"
        element={
          <ProtectedRoute allowedRoles={['escrow']}>
            <EscrowLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EscrowOverview />} />
      </Route>

      {/* 3. Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
      </Route>

      {/* 4. Driver App (Phone Frame) */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={['driver']}>
            <DriverLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DriverShipments />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

