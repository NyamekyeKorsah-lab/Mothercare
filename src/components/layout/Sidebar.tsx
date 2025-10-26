import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Layers,
  Truck,
  ShoppingCart,
  BarChart2,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Sidebar = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Products", path: "/products", icon: Package },
    { name: "Categories", path: "/categories", icon: Layers },
    { name: "Sales", path: "/sales", icon: ShoppingCart },
    { name: "Reports", path: "/reports", icon: BarChart2 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ✅ Mothercare Logo + Name */}
      <div className="flex items-center gap-3 p-5 border-b border-white/10 dark:border-gray-800">
        <img
          src="/logo.png"
          alt="Mothercare"
          className="h-8 w-8 rounded-full shadow-sm"
        />
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Mothercare
        </h1>
      </div>

      {/* ✅ Navigation Links */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-primary/10 transition-colors",
                isActive && "bg-primary/20 text-primary font-medium"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* ✅ Sign Out */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="ghost" className="w-full justify-start text-red-600">
          <LogOut className="mr-2 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
