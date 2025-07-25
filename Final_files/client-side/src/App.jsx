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
import ProjectDetails from "./pages/ProjectDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/emp-login" element={<EmpLogin />} />
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
                <ProjectDetails />
              </MainLayout>
            </ProtectedRoute>
          } />

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// import React from "react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Register from "./pages/Register";
// import Home from "./pages/Home";
// import Login from "./pages/Login";
// import TeamMember from "./pages/TeamMember";
// import MyTeam from "./pages/MyTeam";
// import DashBoard from "./pages/DashBoard";
// import WorkHistory from "./pages/WorkHistory";
// import AllProject from "./pages/AllProject";
// import CreateProject from "./pages/CreateProject";

// export default function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/Register" element={<Register />} />
//         <Route path="/Login" element={<Login />} />
//         <Route path="/TeamMember" element={<TeamMember />} />
//         <Route path="/MyTeam" element={<MyTeam />} />
//         <Route path="/DashBoard" element={<DashBoard />} />
//         <Route path="/WorkHistory" element={<WorkHistory />} />
//         <Route path="/AllProject" element={<AllProject />} />
//         <Route path="/CreateProject" element={<CreateProject />} />

//       </Routes>
//     </BrowserRouter>
//   );
// }
