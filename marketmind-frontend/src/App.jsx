import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavBar from './components/NavBar';
import Login from './pages/Login';
import Landing from './pages/Landing';
import LoadingSpinner from './components/LoadingSpinner';
import PrivateRoute from './components/PrivateRoute';
import AuthCallback from './pages/AuthCallback';
import { CONTENT_SHELL_CLASS } from './constants/layout';

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CampaignNew = React.lazy(() => import('./pages/CampaignNew'));
const Calendar = React.lazy(() => import('./pages/Calendar'));
const Library = React.lazy(() => import('./pages/Library'));
const Settings = React.lazy(() => import('./pages/Settings'));
const BrandsPage = React.lazy(() => import('./pages/BrandsPage'));
const BrandManagePage = React.lazy(() => import('./pages/BrandManagePage'));

function HomeRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
}

/** Navbar + scroll region below it (pt-16 = h-16 fixed nav). All routes render as children here. */
function AppLayout() {
  return (
    <div className="flex min-h-dvh min-h-screen flex-col bg-[hsl(0,0%,100%)]">
      <NavBar />
      <main className="flex min-h-0 flex-1 flex-col pt-16">
        <Outlet />
      </main>
    </div>
  );
}

/** Default pages: centered container + lazy route content. */
function MainLayout() {
  return (
    <div className={[CONTENT_SHELL_CLASS, 'py-8'].join(' ')}>
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" richColors closeButton />
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/login" element={<Login />} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/brands"
                element={
                  <PrivateRoute>
                    <BrandsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/brands/:brandId"
                element={
                  <PrivateRoute>
                    <BrandManagePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/campaigns/new"
                element={
                  <PrivateRoute>
                    <CampaignNew />
                  </PrivateRoute>
                }
              />
              <Route
                path="/campaigns/:campaignId/edit"
                element={
                  <PrivateRoute>
                    <CampaignNew />
                  </PrivateRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <PrivateRoute>
                    <Calendar />
                  </PrivateRoute>
                }
              />
              <Route
                path="/library"
                element={
                  <PrivateRoute>
                    <Library />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
