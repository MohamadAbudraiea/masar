import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './state/auth.jsx';

// Public Pages
import Login from './pages/public/Login.jsx';
import PendingApproval from './pages/public/PendingApproval.jsx';
import SignupChoice from './pages/public/SignupChoice.jsx';
import ManufacturerSignup from './pages/public/ManufacturerSignup.jsx';
import DriverSignup from './pages/public/DriverSignup.jsx';
import OpenResolver from './pages/public/OpenResolver.jsx';
import DevEmails from './pages/dev/DevEmails.jsx';

// Shared
import NotificationsPage from './pages/shared/NotificationsPage.jsx';
import SettingsPage from './pages/shared/SettingsPage.jsx';

// Manufacturer Portal
import ManufacturerLayout from './layouts/ManufacturerLayout.jsx';
import ManufacturerOverview from './pages/manufacturer/Overview.jsx';
import ManufacturerShipments from './pages/manufacturer/Shipments.jsx';
import NewShipment from './pages/manufacturer/NewShipment.jsx';
import ShipmentDetail from './pages/manufacturer/ShipmentDetail.jsx';
import ManufacturerPayments from './pages/manufacturer/Payments.jsx';
import ManufacturerDrivers from './pages/manufacturer/Drivers.jsx';
import ManufacturerDriverProfile from './pages/manufacturer/DriverProfile.jsx';
import ManufacturerLocations from './pages/manufacturer/Locations.jsx';
import ManufacturerCompanyProfile from './pages/manufacturer/CompanyProfile.jsx';

// Escrow Portal
import EscrowLayout from './layouts/EscrowLayout.jsx';
import EscrowOverview from './pages/escrow/Overview.jsx';
import EscrowHeldFunds from './pages/escrow/HeldFunds.jsx';
import EscrowReleases from './pages/escrow/Releases.jsx';
import EscrowCompanies from './pages/escrow/Companies.jsx';
import EscrowCompanyDetail from './pages/escrow/CompanyDetail.jsx';
import EscrowDrivers from './pages/escrow/Drivers.jsx';
import EscrowDriverDetail from './pages/escrow/DriverDetail.jsx';
import EscrowShipments from './pages/escrow/Shipments.jsx';
import EscrowShipmentDetail from './pages/escrow/ShipmentDetail.jsx';

// Admin Portal
import AdminLayout from './layouts/AdminLayout.jsx';
import AdminOverview from './pages/admin/Overview.jsx';
import AdminApprovals from './pages/admin/Approvals.jsx';
import AdminManufacturers from './pages/admin/Manufacturers.jsx';
import AdminManufacturerDetail from './pages/admin/ManufacturerDetail.jsx';
import AdminDrivers from './pages/admin/Drivers.jsx';
import AdminDriverDetail from './pages/admin/DriverDetail.jsx';
import AdminShipments from './pages/admin/Shipments.jsx';
import AdminShipmentDetail from './pages/admin/ShipmentDetail.jsx';
import AdminFinancial from './pages/admin/Financial.jsx';
import AdminRatings from './pages/admin/Ratings.jsx';

// Driver App (Phone Frame)
import DriverLayout from './layouts/DriverLayout.jsx';
import DriverShipments from './pages/driver/Shipments.jsx';
import ActiveShipment from './pages/driver/ActiveShipment.jsx';
import DriverEarnings from './pages/driver/Earnings.jsx';
import DriverProfile from './pages/driver/Profile.jsx';
import DriverHistory from './pages/driver/History.jsx';
import DriverManufacturerProfile from './pages/driver/ManufacturerProfile.jsx';

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
  const { user, token } = useAuth();

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
      <Route path="/signup" element={<SignupChoice />} />
      <Route path="/signup/manufacturer" element={<ManufacturerSignup />} />
      <Route path="/signup/driver" element={<DriverSignup />} />
      <Route path="/open" element={<OpenResolver />} />
      <Route path="/dev/emails" element={<DevEmails />} />

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
        <Route path="shipments" element={<ManufacturerShipments />} />
        <Route path="shipments/new" element={<NewShipment />} />
        <Route path="shipments/:id" element={<ShipmentDetail />} />
        <Route path="payments" element={<ManufacturerPayments />} />
        <Route path="drivers" element={<ManufacturerDrivers />} />
        <Route path="drivers/:id" element={<ManufacturerDriverProfile />} />
        <Route path="locations" element={<ManufacturerLocations />} />
        <Route path="profile" element={<ManufacturerCompanyProfile />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
        <Route path="held" element={<EscrowHeldFunds />} />
        <Route path="releases" element={<EscrowReleases />} />
        <Route path="companies" element={<EscrowCompanies />} />
        <Route path="companies/:id" element={<EscrowCompanyDetail />} />
        <Route path="manufacturers" element={<EscrowCompanies />} />
        <Route path="manufacturers/:id" element={<EscrowCompanyDetail />} />
        <Route path="drivers" element={<EscrowDrivers />} />
        <Route path="drivers/:id" element={<EscrowDriverDetail />} />
        <Route path="shipments" element={<EscrowShipments />} />
        <Route path="shipments/:id" element={<EscrowShipmentDetail />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
        <Route path="approvals" element={<AdminApprovals />} />
        <Route path="manufacturers" element={<AdminManufacturers />} />
        <Route path="manufacturers/:id" element={<AdminManufacturerDetail />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="drivers/:id" element={<AdminDriverDetail />} />
        <Route path="shipments" element={<AdminShipments />} />
        <Route path="shipments/:id" element={<AdminShipmentDetail />} />
        <Route path="financial" element={<AdminFinancial />} />
        <Route path="ratings" element={<AdminRatings />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
        <Route path="active" element={<ActiveShipment />} />
        <Route path="earnings" element={<DriverEarnings />} />
        <Route path="me" element={<DriverProfile />} />
        <Route path="history" element={<DriverHistory />} />
        <Route path="manufacturers/:id" element={<DriverManufacturerProfile />} />
        <Route path="shipments/:id" element={<ActiveShipment />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
