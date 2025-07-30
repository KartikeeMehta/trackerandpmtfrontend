import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const MainLayout = ({ children, noPadding }) => (
  <div>
    <Sidebar />
    <TopBar />
    <main
      className={
        noPadding
          ? "bg-gray-50 min-h-screen"
          : "ml-64 mt-16 p-8 bg-gray-50 min-h-screen"
      }
    >
      {children}
    </main>
  </div>
);

export default MainLayout;
