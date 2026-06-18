import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Roster from './pages/Roster';
import Warrants from './pages/Warrants';
import Shifts from './pages/Shifts';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Users_ from './pages/Users';
import LeaveRequests from './pages/LeaveRequests';
import CommandCentre from './pages/CommandCentre';
import FPOTracker from './pages/FPOTracker';
import InCityRequests from './pages/InCityRequests';
import Rewards from './pages/Rewards';
import WeaponsInventory from './pages/WeaponsInventory';
import DivisionTransfers from './pages/DivisionTransfers';
import Certifications from './pages/Certifications';
import PendingRequests from './pages/PendingRequests';
import TerminationApproval from './pages/TerminationApproval';
import TerminationLogs from './pages/TerminationLogs';
import Feedback from './pages/Feedback';
import DutyAnalytics from './pages/DutyAnalytics';
import Reports from './pages/Reports';
import OfficerManagement from './pages/OfficerManagement';
import RecruitTraining from './pages/RecruitTraining';
import RecruitTracker from './pages/RecruitTracker';
import FTOTracking from './pages/FTOTracking';
import CIRTRecruitTracker from './pages/CIRTRecruitTracker';
import Divisions from './pages/Divisions';
import RolePermissions from './pages/RolePermissions';
import DatabaseStats from './pages/DatabaseStats';
import Announcements from './pages/Announcements';
import Promotions from './pages/Promotions';
import Strikes from './pages/Strikes';
import Apply from './pages/Apply';
import DiscordCallback from './pages/DiscordCallback';
import LeadershipApplications from './pages/LeadershipApplications';
import Citizens from './pages/Citizens';
import Vehicles from './pages/Vehicles';
import Incidents from './pages/Incidents';
import BOLOs from './pages/BOLOs';
import LeadershipCommand from './pages/LeadershipCommand';
import AcademyOnboarding from './pages/AcademyOnboarding';
import PendingActivation from './pages/PendingActivation';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/apply" replace />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/auth/discord" element={<DiscordCallback />} />
          <Route path="/pending-activation" element={<PendingActivation />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/warrants" element={<Warrants />} />
            <Route path="/shifts" element={<Shifts />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/users" element={<Users_ />} />
            <Route path="/leave-requests" element={<LeaveRequests />} />

            {/* Fully implemented pages */}
            <Route path="/command-centre" element={<CommandCentre />} />
            <Route path="/fpo-tracker" element={<FPOTracker />} />
            <Route path="/in-city-requests" element={<InCityRequests />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/weapons-inventory" element={<WeaponsInventory />} />
            <Route path="/division-transfers" element={<DivisionTransfers />} />
            <Route path="/certifications" element={<Certifications />} />
            <Route path="/pending-requests" element={<PendingRequests />} />
            <Route path="/termination-approval" element={<TerminationApproval />} />
            <Route path="/termination-logs" element={<TerminationLogs />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/duty-analytics" element={<DutyAnalytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/mdt" element={<OfficerManagement />} />
            <Route path="/recruit-training" element={<Navigate to="/recruit-tracker" replace />} />
            <Route path="/recruit-tracker" element={<RecruitTracker />} />
            <Route path="/cirt-recruit-tracker" element={<CIRTRecruitTracker />} />
            <Route path="/fto-tracking" element={<FTOTracking />} />
            <Route path="/divisions" element={<Divisions />} />
            <Route path="/role-permissions" element={<RolePermissions />} />
            <Route path="/database-stats" element={<DatabaseStats />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/strikes" element={<Strikes />} />
            <Route path="/leadership-applications" element={<LeadershipApplications />} />
            <Route path="/citizens" element={<Citizens />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/bolos" element={<BOLOs />} />
            <Route path="/leadership-command" element={<LeadershipCommand />} />
            <Route path="/academy-onboarding" element={<AcademyOnboarding />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1f2937', color: '#f9fafb', border: '1px solid rgba(55,65,81,0.5)', borderRadius: '12px' },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
