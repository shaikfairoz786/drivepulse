import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Role } from './types';

// Feature Pages
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { CustomerListPage } from './features/customers/CustomerListPage';
import { CustomerDetailPage } from './features/customers/CustomerDetailPage';
import { RequirementListPage } from './features/requirements/RequirementListPage';
import { RequirementDetailPage } from './features/requirements/RequirementDetailPage';
import { InventoryListPage } from './features/inventory/InventoryListPage';
import { InventoryDetailPage } from './features/inventory/InventoryDetailPage';
import { MatchingOpportunitiesPage } from './features/matching/MatchingOpportunitiesPage';
import { FollowUpQueuePage } from './features/followups/FollowUpQueuePage';
import { ReportsPage } from './features/reports/ReportsPage';
import { UsersPage } from './features/admin/UsersPage';
import { AuditLogsPage } from './features/admin/AuditLogsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected SaaS Layout Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Customer Routes */}
              <Route path="customers" element={<CustomerListPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />

              {/* Requirement & Lead Pipeline Routes */}
              <Route path="requirements" element={<RequirementListPage />} />
              <Route path="requirements/:id" element={<RequirementDetailPage />} />

              {/* Inventory Management Routes */}
              <Route path="inventory" element={<InventoryListPage />} />
              <Route path="inventory/:id" element={<InventoryDetailPage />} />

              {/* Intelligent Matching Engine */}
              <Route path="matching" element={<MatchingOpportunitiesPage />} />

              {/* Follow-up Queue */}
              <Route path="followups" element={<FollowUpQueuePage />} />

              {/* Reports & BI (Manager & Admin) */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Management Routes */}
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
