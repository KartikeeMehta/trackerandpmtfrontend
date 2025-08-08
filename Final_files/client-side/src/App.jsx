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

function App() {
  return (
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
            <ProtectedRoute>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
