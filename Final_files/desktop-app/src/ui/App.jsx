import React, { useState, useEffect } from "react";
import { API } from "../utils/api_desktop";
import Front from "./pages/Front.jsx";
import Connect from "./pages/Connect.jsx";
import Track from "./pages/Track.jsx";

export default function App() {
  const getInitialRoute = () => {
    try {
      const saved = localStorage.getItem("pf_route");
      if (saved) return saved;
      const token = localStorage.getItem("pf_auth_token");
      return token ? "track" : "front";
    } catch (_) {
      return "front";
    }
  };

  const [route, setRoute] = useState(getInitialRoute);

  // Persist route
  useEffect(() => {
    try {
      localStorage.setItem("pf_route", route);
    } catch (_) {}
  }, [route]);

  // On boot, if we have a token, verify pairing status to decide route
  useEffect(() => {
    const token = (() => {
      try {
        return localStorage.getItem("pf_auth_token");
      } catch (_) {
        return null;
      }
    })();
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${API.base}/pairing/status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        // Treat non-200 as disconnected
        if (!res.ok) {
          setRoute("connect");
          return;
        }
        const data = await res.json();
        if (data?.success && data.status === "paired") {
          setRoute("track");
        } else {
          setRoute("connect");
        }
      } catch (_) {
        // Network or parsing error: assume disconnected
        setRoute("connect");
      }
    })();
  }, []);

  return (
    <div className="flex items-center justify-center px-5 bg-gradient-to-br from-sky-50 to-emerald-50">
      <div className="rounded-2xl h-[97vh] mt-[1.5vh] bg-white overflow-hidden w-ful bg-gradient-to-br from-sky-50 to-emerald-50 w-full">
        {route === "front" && <Front onConnect={() => setRoute("connect")} />}
        {route === "connect" && (
          <Connect
            onDone={() => setRoute("track")}
            onBack={() => setRoute("front")}
          />
        )}
        {route === "track" && <Track />}
      </div>
    </div>
  );
}
