import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { FeatureFlagsContext } from "./FeatureFlagsProvider";

const HRGuard = ({ children }) => {
  const { loading, hrEnabled } = useContext(FeatureFlagsContext);
  if (loading) return null;
  if (!hrEnabled) return <Navigate to="/settings" replace />;
  return children;
};

export default HRGuard;


