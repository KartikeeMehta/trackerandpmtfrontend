import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Login from "./pages/Login";
import TeamMember from "./pages/TeamMember";
import MyTeam from "./pages/MyTeam";
import DashBoard from "./pages/DashBoard";
import WorkHistory from "./pages/WorkHistory";
import AllProject from "./pages/AllProject";
import MainLayout from "./components/MainLayout";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import CreateProject from "./pages/CreateProject";
import EmpLogin from "./pages/Login/emp_login";
import AllTask from "./pages/AllTask";
import ProjectOverview from "./pages/ProjectDetails/ProjectOverview";
import PhaseDetails from "./pages/ProjectDetails/PhaseDetails";
import SubtaskDetails from "./pages/ProjectDetails/SubtaskDetails";
import CreateTask from "./pages/CreateTask";
import EditTask from "./pages/EditTask";
import Settings from "./pages/Settings";
import ForgetPassword from "./pages/ForgetPassword";
import Verification from "./pages/Verification";
import ResetPassword from "./pages/ResetPassword";
import Messaging from "./pages/Message/Messaging";
import NotificationWrapper from "./components/NotificationWrapper";
import TrackerConnectPageWrapper from "./pages/TrackerConnect";
import TrackerPage from "./pages/Tracker";
import OverallStatsPage from "./pages/OverallStats";
import PeopleTracking from "./pages/PeopleTracking";
import HRManagement from "./pages/HRManagement";
import HRMemberAttendance from "./pages/HRMemberAttendance";
import HRMemberAttendanceDetail from "./pages/HRMemberAttendanceDetail";

// Main App component

function App() {
  return (
    <NotificationWrapper>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Register" element={<Register />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/emp-login" element={<EmpLogin />} />
          <Route path="/ForgetPassword" element={<ForgetPassword />} />
          <Route path="/Verification" element={<Verification />} />
          <Route path="/ResetPassword" element={<ResetPassword />} />
          <Route
            path="/TeamMember"
            element={
              <ProtectedRoute roles={["owner", "admin", "manager"]}>
                <MainLayout>
                  <TeamMember />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/MyTeam"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MyTeam />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/AllTask"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AllTask />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/CreateTask"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateTask />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/EditTask"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EditTask />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/DashBoard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashBoard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/WorkHistory"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <WorkHistory />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/CreateProject"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateProject />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/messaging"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Messaging />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/AllProject"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AllProject />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ProjectDetails"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ProjectOverview />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/PhaseDetails"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PhaseDetails />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/SubtaskDetails"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SubtaskDetails />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/Profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracker-connect"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TrackerConnectPageWrapper />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracker"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TrackerPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/overall-stats"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <OverallStatsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/people-tracking"
            element={
              <ProtectedRoute roles={["owner", "admin", "manager"]}>
                <MainLayout>
                  <PeopleTracking />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr-management"
            element={
              <ProtectedRoute roles={["owner", "admin"]}>
                <MainLayout>
                  <HRManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr-attendance"
            element={
              <ProtectedRoute roles={["owner", "admin"]}>
                <MainLayout>
                  <HRMemberAttendance />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr-attendance/:teamMemberId"
            element={
              <ProtectedRoute roles={["owner", "admin"]}>
                <MainLayout>
                  <HRMemberAttendanceDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr-management"
            element={
              <ProtectedRoute roles={["owner", "admin"]}>
                <MainLayout>
                  <HRManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </NotificationWrapper>
  );
}

export default App;
