import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const MainLayout = ({ children, noPadding }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  // Keyboard shortcut for toggling sidebar (Ctrl+B or Cmd+B)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarCollapsed]);

  return (
    <div>
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <TopBar isSidebarCollapsed={isSidebarCollapsed} />
      <main className={`bg-gray-50 transition-all duration-300 ${
        noPadding 
          ? "bg-gray-50" 
          : `p-8 bg-gray-50 ${isSidebarCollapsed ? "ml-16" : "ml-64"} mt-16`
      }`}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
