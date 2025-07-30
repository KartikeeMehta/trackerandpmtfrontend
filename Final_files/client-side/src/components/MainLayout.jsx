import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const MainLayout = ({ children, noPadding }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div>
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <TopBar sidebarOpen={sidebarOpen} />
      <main
        className={
          noPadding
            ? "bg-gray-50 min-h-screen"
            : `transition-all duration-300 ${
                sidebarOpen ? "ml-64" : "ml-0"
              } mt-16 p-8 bg-gray-50 min-h-screen`
        }
      >
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
