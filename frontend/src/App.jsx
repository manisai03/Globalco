import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import RouteTitle from './components/RouteTitle';
import Home from './pages/Home';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Jobs = lazy(() => import('./pages/Jobs'));
const JobDetails = lazy(() => import('./pages/JobDetails'));
const Company = lazy(() => import('./pages/Company'));
const Profile = lazy(() => import('./pages/Profile'));
const CandidateDashboard = lazy(() => import('./pages/CandidateDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotificationDetailPage = lazy(() => import('./pages/NotificationDetailPage'));
const AdminJobFormPage = lazy(() => import('./pages/AdminJobFormPage'));
const AdminApplicantPage = lazy(() => import('./pages/AdminApplicantPage'));
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'));
const ResumeViewerPage = lazy(() => import('./pages/ResumeViewerPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteShell({ children }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<LoadingSpinner fullScreen />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <BrowserRouter>
            <RouteTitle />
            <Layout>
              <RouteShell>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/jobs/:id" element={<JobDetails />} />
                  <Route path="/companies/:id" element={<Company />} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/jobs/new" element={<ProtectedRoute adminOnly><AdminJobFormPage /></ProtectedRoute>} />
                  <Route path="/admin/jobs/:id/edit" element={<ProtectedRoute adminOnly><AdminJobFormPage /></ProtectedRoute>} />
                  <Route path="/admin/applicants/:id" element={<ProtectedRoute adminOnly><AdminApplicantPage /></ProtectedRoute>} />
                  <Route path="/applications/:id" element={<ProtectedRoute><ApplicationDetailPage /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                  <Route path="/resume-viewer" element={<ResumeViewerPage />} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/notifications/:id" element={<ProtectedRoute><NotificationDetailPage /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </RouteShell>
            </Layout>
            <Toaster position="top-right" richColors closeButton />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
