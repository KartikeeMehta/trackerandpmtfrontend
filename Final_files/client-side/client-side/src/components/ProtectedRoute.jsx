import { Navigate } from "react-router-dom";

// Optionally restrict by role using roles={["owner","admin","manager"]}
const ProtectedRoute = ({ children, roles }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/Login" replace />;
  }

  if (Array.isArray(roles) && roles.length > 0) {
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const role = (user?.role || "").toLowerCase();
      const allowed = roles.map((r) => r.toLowerCase());
      if (!allowed.includes(role)) {
        return <Navigate to="/DashBoard" replace />;
      }
    } catch (e) {
      // If parsing fails, treat as unauthorized for restricted routes
      return <Navigate to="/DashBoard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
