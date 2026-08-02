import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Toast from './components/ui/Toast';

// Auth pages
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Core pages
import DashboardPage    from './pages/DashboardPage';
import ShipmentsPage    from './pages/ShipmentsPage';
import TimelinePage     from './pages/TimelinePage';
import StateScrubberPage from './pages/StateScrubberPage';
import AnalyticsPage    from './pages/AnalyticsPage';
import AuditLogsPage    from './pages/AuditLogsPage';   // now Event Log
import AIInsightsPage   from './pages/AIInsightsPage';
import AlertsPage       from './pages/AlertsPage';
import ReportsPage      from './pages/ReportsPage';
import SettingsPage     from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Header />
      {children}
    </div>
    <Toast />
  </div>
);

const P = ({ children }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />

        {/* Protected */}
        <Route path="/dashboard"  element={<P><DashboardPage /></P>} />
        <Route path="/shipments"  element={<P><ShipmentsPage /></P>} />
        <Route path="/timeline"   element={<P><TimelinePage /></P>} />
        <Route path="/scrubber"   element={<P><StateScrubberPage /></P>} />
        <Route path="/analytics"  element={<P><AnalyticsPage /></P>} />
        <Route path="/events"     element={<P><AuditLogsPage /></P>} />
        <Route path="/ai-insights" element={<P><AIInsightsPage /></P>} />
        <Route path="/alerts"     element={<P><AlertsPage /></P>} />
        <Route path="/reports"    element={<P><ReportsPage /></P>} />
        <Route path="/settings"   element={<P><SettingsPage /></P>} />

        {/* Redirects */}
        <Route path="/"  element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
        <Route path="*"  element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
