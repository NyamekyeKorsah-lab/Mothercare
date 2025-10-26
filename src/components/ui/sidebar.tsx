import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Layers,
  Users,
  ShoppingCart,
  FileText,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar on navigation (mobile only)
  useEffect(() => {
    if (isMobile) setIsOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Products", icon: Package, path: "/products" },
    { name: "Categories", icon: Layers, path: "/categories" },
    { name: "Suppliers", icon: Users, path: "/suppliers" },
    { name: "Sales", icon: ShoppingCart, path: "/sales" },
    { name: "Reports", icon: FileText, path: "/reports" },
  ];

  return (
    <>
      {/* Top Mobile Navbar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-white shadow-sm fixed w-full z-50">
        <h1 className="text-lg font-semibold">Mothercare</h1>
        <button
          className="text-gray-700 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg border-r transform transition-transform duration-300 z-40 
        ${isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b lg:justify-center">
          <div>
            <h1 className="text-xl font-semibold">Mothercare</h1>
            <p className="text-sm text-gray-500">Inventory System</p>
          </div>
          {/* Close button (mobile) */}
          {isMobile && (
            <button
              className="text-gray-600 lg:hidden"
              onClick={() => setIsOpen(false)}
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* Menu List */}
        <nav className="flex-1 overflow-y-auto mt-4">
          {menuItems.map(({ name, icon: Icon, path }) => (
            <Link
              key={name}
              to={path}
              className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors
                ${
                  location.pathname === path
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              <Icon size={18} />
              {name}
            </Link>
          ))}
        </nav>

        {/* Sign Out Button */}
        <div className="border-t px-6 py-4">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-start gap-3 text-gray-600 hover:text-red-600"
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Push content on large screens */}
      <div className={`lg:ml-64 ${isMobile ? "pt-16" : ""}`}></div>
    </>
  );
};

export default Sidebar;
