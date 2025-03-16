import React, { Suspense, lazy } from 'react'; // react v18.2.0
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'; // react-router-dom v6.8.1
import { CssBaseline, CircularProgress } from '@mui/material'; // @mui/material v5.11.10
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ModalProvider } from './contexts/ModalContext';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';
import ErrorPage from './pages/ErrorPage';
import NotFoundPage from './pages/NotFoundPage';
import { styled } from '@emotion/styled';

// Lazy load components for code splitting
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/Auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApplicationsListPage = lazy(() => import('./pages/Applications/ApplicationsListPage'));
const CreateApplicationPage = lazy(() => import('./pages/Applications/CreateApplicationPage'));
const EditApplicationPage = lazy(() => import('./pages/Applications/EditApplicationPage'));
const ViewApplicationPage = lazy(() => import('./pages/Applications/ViewApplicationPage'));
const ApplicationStatusPage = lazy(() => import('./pages/Applications/ApplicationStatusPage'));
const DocumentsPage = lazy(() => import('./pages/Documents/DocumentsPage'));
const UploadDocumentPage = lazy(() => import('./pages/Documents/UploadDocumentPage'));
const ViewDocumentPage = lazy(() => import('./pages/Documents/ViewDocumentPage'));
const MessagesPage = lazy(() => import('./pages/Messages/MessagesPage'));
const ComposeMessagePage = lazy(() => import('./pages/Messages/ComposeMessagePage'));
const ViewMessagePage = lazy(() => import('./pages/Messages/ViewMessagePage'));
const PaymentsPage = lazy(() => import('./pages/Payments/PaymentsPage'));
const ProcessPaymentPage = lazy(() => import('./pages/Payments/ProcessPaymentPage'));
const PaymentHistoryPage = lazy(() => import('./pages/Payments/PaymentHistoryPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const NotificationSettingsPage = lazy(() => import('./pages/Profile/NotificationSettingsPage'));
const SecuritySettingsPage = lazy(() => import('./pages/Profile/SecuritySettingsPage'));
const WorkflowEditorPage = lazy(() => import('./pages/Admin/WorkflowEditorPage'));
const ApplicationReviewPage = lazy(() => import('./pages/Admin/ApplicationReviewPage'));
const DocumentVerificationPage = lazy(() => import('./pages/Admin/DocumentVerificationPage'));
const UsersPage = lazy(() => import('./pages/Admin/UsersPage'));
const RolesPermissionsPage = lazy(() => import('./pages/Admin/RolesPermissionsPage'));
const ReportsPage = lazy(() => import('./pages/Admin/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/Admin/SettingsPage'));
const FinancialAidPage = lazy(() => import('./pages/FinancialAid/FinancialAidPage'));
const ApplyForAidPage = lazy(() => import('./pages/FinancialAid/ApplyForAidPage'));
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { useAuthContext } from './contexts/AuthContext';

// Styled component for the loading indicator container
const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
`;

/**
 * Component that protects routes requiring authentication
 */
const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

/**
 * Component that protects routes requiring admin role
 */
const AdminRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isAuthenticated, hasRole } = useAuthContext();
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  if (!hasRole('admin')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

/**
 * Component that displays during lazy loading
 */
const LoadingFallback: React.FC = () => (
  <LoadingContainer>
    <CircularProgress />
  </LoadingContainer>
);

/**
 * Main application component that sets up routing and context providers
 */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <CssBaseline />
      <FeatureFlagProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <ModalProvider>
                <ErrorBoundary fallback={<ErrorPage />}>
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/auth/login" element={<LoginPage />} />
                      <Route path="/auth/register" element={<RegisterPage />} />
                      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

                      {/* Protected Routes */}
                      <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/applications" element={<ApplicationsListPage />} />
                        <Route path="/applications/new" element={<CreateApplicationPage />} />
                        <Route path="/applications/:id/edit" element={<EditApplicationPage />} />
                        <Route path="/applications/:id" element={<ViewApplicationPage />} />
                        <Route path="/applications/:id/status" element={<ApplicationStatusPage />} />
                        <Route path="/documents" element={<DocumentsPage />} />
                        <Route path="/documents/upload" element={<UploadDocumentPage />} />
                        <Route path="/documents/:id" element={<ViewDocumentPage />} />
                        <Route path="/messages" element={<MessagesPage />} />
                        <Route path="/messages/compose" element={<ComposeMessagePage />} />
                        <Route path="/messages/:id" element={<ViewMessagePage />} />
                        <Route path="/payments" element={<PaymentsPage />} />
                        <Route path="/payments/process" element={<ProcessPaymentPage />} />
                        <Route path="/payments/history" element={<PaymentHistoryPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/profile/notifications" element={<NotificationSettingsPage />} />
                        <Route path="/profile/security" element={<SecuritySettingsPage />} />
                        <Route path="/financial-aid" element={<FinancialAidPage />} />
                        <Route path="/financial-aid/apply" element={<ApplyForAidPage />} />

                        {/* Admin Routes */}
                        <Route element={<AdminRoute />}>
                          <Route path="/admin/workflow-editor" element={<WorkflowEditorPage />} />
                          <Route path="/admin/applications" element={<ApplicationReviewPage />} />
                          <Route path="/admin/documents" element={<DocumentVerificationPage />} />
                          <Route path="/admin/users" element={<UsersPage />} />
                          <Route path="/admin/roles" element={<RolesPermissionsPage />} />
                          <Route path="/admin/reports" element={<ReportsPage />} />
                          <Route path="/admin/settings" element={<SettingsPage />} />
                        </Route>
                      </Route>

                      {/* Error Routes */}
                      <Route path="/error" element={<ErrorPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </ModalProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </FeatureFlagProvider>
    </BrowserRouter>
  );
};

export default App;