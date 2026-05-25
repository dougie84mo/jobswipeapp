import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import theme from './theme';
import Layout from './components/common/Layout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import JobBrowse from './pages/JobBrowse';
import JobManage from './pages/JobManage';
import Matches from './pages/Matches';
import Match from './pages/Match';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import CompanyManage from './pages/CompanyManage';
import TestAuth from './pages/TestAuth';
import RecruiterDashboard from './pages/RecruiterDashboard';
import JobseekerDashboard from './pages/JobseekerDashboard';
import ProfilesManagementPage from './pages/ProfilesManagement';
import SkillGrowthPage from './pages/SkillGrowth';
import Settings from './pages/Settings';
import Recruiters from './pages/Recruiters';
import ResumeManagementPage from './pages/ResumeManagement';
import CommunityPage from './pages/Community';
import JobMatchesPage from './pages/JobMatches';

// Protected route component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'jobseeker' | 'recruiter';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredUserType 
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  console.log('ProtectedRoute Debug:', {
    isAuthenticated,
    userType: user?.userType,
    requiredUserType,
    user: user
  });

  if (loading) {
    console.log('ProtectedRoute: Still loading user data');
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }

  if (requiredUserType && user?.userType !== requiredUserType) {
    console.log(`ProtectedRoute: User type mismatch - User is ${user?.userType}, required ${requiredUserType}`);
    return <Navigate to="/" />;
  }

  console.log(`ProtectedRoute: Access granted for user type ${user?.userType}`);
  return <>{children}</>;
};

// App component with routes
const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Layout>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/" /> : <Register />} 
        />
        <Route 
          path="/forgot-password"
          element={isAuthenticated ? <Navigate to="/" /> : <ForgotPassword />}
        />
        <Route 
          path="/reset-password"
          element={isAuthenticated ? <Navigate to="/" /> : <ResetPassword />}
        />
        <Route path="/test-auth" element={<TestAuth />} />

        {/* Protected routes */}
        <Route 
          path="/jobs" 
          element={
            <ProtectedRoute requiredUserType="jobseeker">
              <JobBrowse />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/jobs/manage" 
          element={
            <ProtectedRoute requiredUserType="recruiter">
              <JobManage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/companies/manage" 
          element={
            <ProtectedRoute requiredUserType="recruiter">
              <CompanyManage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/matches" 
          element={
            <ProtectedRoute>
              <Matches />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/match" 
          element={
            <ProtectedRoute>
              <Match />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/messages/:matchId?" 
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        {/* Dashboard route - conditionally renders based on user type */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              {user?.userType === 'recruiter' ? <RecruiterDashboard /> : <JobseekerDashboard />}
            </ProtectedRoute>
          } 
        />

        {/* Jobseeker specific routes */}
        <Route 
          path="/profiles" 
          element={
            <ProtectedRoute requiredUserType="jobseeker">
              <ProfilesManagementPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/skills" 
          element={
            <ProtectedRoute requiredUserType="jobseeker">
              <SkillGrowthPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/resumes" 
          element={
            <ProtectedRoute requiredUserType="jobseeker">
              <ResumeManagementPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/community" 
          element={
            <ProtectedRoute requiredUserType="jobseeker">
              <CommunityPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/job-matches" 
          element={
            <ProtectedRoute requiredUserType="jobseeker">
              <JobMatchesPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/recruiters" 
          element={
            <ProtectedRoute>
              <Recruiters />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/notifications" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/security" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/payment" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/subscriptions" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all route for 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
