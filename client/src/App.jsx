import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import MobileNav from './components/MobileNav';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import RecoveryPage from './pages/RecoveryPage';
import PrivacyPage from './pages/PrivacyPage';
import AccountPage from './pages/AccountPage';
import ProfilePage from './pages/ProfilePage';

// The three.js/r3f/drei stack is ~1MB — code-split so only the 3D routes
// pay that cost instead of it loading on every page (feed, login, etc).
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));

function ThreeDLoading() {
  return <div className="three-loading-shell"><p>Loading…</p></div>;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-loading-shell">
        <p>Loading PackSomeWork…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function HomeEntry() {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading-shell"><p>Loading PackSomeWork…</p></div>;
  return user ? <HomePage /> : <LandingPage />;
}

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/forgot-password" element={<RecoveryPage key="forgot" mode="forgot-password" />} />
      <Route path="/reset-password" element={<RecoveryPage key="reset" mode="reset-password" />} />
      <Route path="/resend-verification" element={<RecoveryPage key="resend" mode="resend-verification" />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route
        path="/"
        element={
          <HomeEntry />
        }
      />
      <Route
        path="/profile/:id"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile/:id/achievements"
        element={
          <RequireAuth>
            <Suspense fallback={<ThreeDLoading />}>
              <AchievementsPage />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <MobileNav />
    </>
  );
}
