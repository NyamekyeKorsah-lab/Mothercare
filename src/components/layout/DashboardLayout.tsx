import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DashboardLayout = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  // ✅ Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarOpen");
    setIsSidebarOpen(saved === "true");
    setHydrated(true);
  }, []);

  // ✅ Persist sidebar state
  useEffect(() => {
    if (hydrated) localStorage.setItem("sidebarOpen", String(isSidebarOpen));
  }, [isSidebarOpen, hydrated]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );

  if (!user) return <Navigate to="/auth" replace />;

  // ✅ Generate dynamic page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    return path
      .split("/")
      .pop()
      ?.replace(/-/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* ✅ Sidebar with glass blur */}
      <aside
        className={`fixed lg:static top-0 left-0 h-full w-64
        ${hydrated ? "bg-white/60 dark:bg-gray-900/40" : "bg-transparent"}
        backdrop-blur-xl border-r border-white/10 shadow-lg 
        z-40 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <Sidebar onLinkClick={closeSidebar} />
      </aside>

      {/* ✅ Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={closeSidebar}
        />
      )}

      {/* ✅ Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* ✅ Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl border-b border-white/10 shadow-md transition-colors duration-300">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="lg:hidden"
              >
                <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              </Button>
              {/* ✅ Dynamic Page Title */}
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 capitalize">
                {getPageTitle()}
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              Inventory System
            </p>
          </div>
        </header>

        {/* ✅ Page content */}
        <main className="flex-1 overflow-y-auto bg-background px-6 pt-6 pb-6 transition-all duration-300">
          <div className="container mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
