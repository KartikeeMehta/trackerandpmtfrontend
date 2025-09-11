import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

export const FeatureFlagsContext = createContext({
  loading: true,
  hrEnabled: true,
  refresh: async () => {},
  updateHrEnabled: async (next) => {},
});

export default function FeatureFlagsProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [hrEnabled, setHrEnabled] = useState(true);

  const fetchFlags = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setHrEnabled(true);
      setLoading(false);
      return;
    }
    try {
      const res = await apiHandler.GetApi(api_url.hrSettings, token);
      setHrEnabled(!!res?.hrEnabled);
    } catch (_) {
      setHrEnabled(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const updateHrEnabled = useCallback(async (next) => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const res = await apiHandler.PostApi(api_url.hrSettings, { hrEnabled: !!next }, token);
      setHrEnabled(!!res?.hrEnabled);
    } catch (_) {
      // keep previous if failed
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({ loading, hrEnabled, refresh: fetchFlags, updateHrEnabled }), [loading, hrEnabled, fetchFlags, updateHrEnabled]);

  return (
    <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>
  );
}


