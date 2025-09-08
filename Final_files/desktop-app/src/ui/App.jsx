import React, { useState } from "react";
import Front from "./pages/Front.jsx";
import Connect from "./pages/Connect.jsx";
import Track from "./pages/Track.jsx";

export default function App() {
  const [route, setRoute] = useState("front");

  return (
    <div className="flex items-center justify-center bg-white px-5">
      <div className="rounded-2xl h-[97vh] mt-[1.5vh] bg-white overflow-hidden w-full">
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
