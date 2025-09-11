import React, { useContext, useEffect, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { Button } from "@/components/ui/button";
import { FeatureFlagsContext } from "@/components/FeatureFlagsProvider";

export default function HRSettings() {
  const { loading: flagsLoading, hrEnabled, updateHrEnabled, refresh } = useContext(FeatureFlagsContext);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(hrEnabled);
  const token = localStorage.getItem("token");

  useEffect(() => {
    setEnabled(hrEnabled);
  }, []);

  const save = async () => {
    setLoading(true);
    await updateHrEnabled(enabled);
    await refresh();
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border p-6 md:p-8 w-full">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">HR Management Settings</h2>
      <p className="text-sm text-gray-600 mb-4">
        Turn the HR Management System on or off for your company. When off, all HR tracking, attendance, and related APIs and pages are disabled.
      </p>
      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
        <div>
          <div className="font-medium text-gray-900">Enable HR Management</div>
          <div className="text-sm text-gray-600">Controls time tracking, attendance, leaderboard and related features.</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 relative"></div>
        </label>
      </div>
      <div className="pt-4">
        <Button disabled={loading} onClick={save} className="bg-gray-900 hover:bg-gray-800 text-white">
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}


