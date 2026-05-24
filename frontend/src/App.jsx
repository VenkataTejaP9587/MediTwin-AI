import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useThemeStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import MonitoringPage from './pages/MonitoringPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import PatientPortal from './pages/PatientPortal';
import Layout from './components/Layout';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { init } = useThemeStore();
  useEffect(() => { init(); }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1526',
            color: '#e2e8f0',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: '12px',
          },
          duration: 4000,
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with Layout */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['doctor', 'admin']}>
            <Layout><DoctorDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/patients" element={
          <ProtectedRoute roles={['doctor', 'admin']}>
            <Layout><PatientsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/patients/:id" element={
          <ProtectedRoute roles={['doctor', 'admin']}>
            <Layout><PatientDetailPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/monitoring" element={
          <ProtectedRoute roles={['doctor', 'admin']}>
            <Layout><MonitoringPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute roles={['doctor', 'admin']}>
            <Layout><AnalyticsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <Layout><AdminPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout><SettingsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/patient-portal" element={
          <ProtectedRoute roles={['patient']}>
            <Layout><PatientPortal /></Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
