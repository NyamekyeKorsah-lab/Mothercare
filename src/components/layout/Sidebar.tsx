import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  FileText,
  FolderTree,
  LogOut,
  Baby,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Categories", href: "/categories", icon: FolderTree },
  { name: "Suppliers", href: "/suppliers", icon: Users },
  { name: "Sales", href: "/sales", icon: ShoppingCart },
  { name: "Reports", href: "/reports", icon: FileText },
];

export const Sidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // detect screen width
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Top bar with universal hamburger */}
      <header className="fixed top-0 left-0 w-full bg-white border-b border-border shadow-sm z-50 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            className="text-gray-700 hover:text-primary transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
          <h1 className="text-lg font-semibold">Mothercare</h1>
        </div>
        <p className="text-xs text-gray-500 hidden sm:block">
          Inventory System
        </p>
      </header>

      {/* Sidebar drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 flex flex-col bg-card border-r border-border shadow-lg transform transition-transform duration-300 z-40",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border px-6 mt-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Baby className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Mothercare</h2>
            <p className="text-xs text-muted-foreground">Inventory System</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => isMobile && setIsOpen(false)} // auto close on mobile
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
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

      {/* Page content wrapper with top padding for header */}
      <div
        className={`transition-all duration-300 pt-16 ${
          isOpen && !isMobile ? "lg:ml-64" : "ml-0"
        }`}
      ></div>
    </>
  );
};
