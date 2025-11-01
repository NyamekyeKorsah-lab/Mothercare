import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  BarChart2,
  Utensils,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Sidebar = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  // ✅ Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    fetchUser();
  }, []);

  const APPROVED_USER = "jadidianyamekyekorsah@gmail.com"; // ✅ Only your boss

  // ✅ Dynamically build nav list based on user email
  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Products", path: "/products", icon: Package },
    { name: "Categories", path: "/categories", icon: Layers },
    { name: "Sales", path: "/sales", icon: ShoppingCart },
    { name: "Food Sales", path: "/foodsales", icon: Utensils },
    // 👇 Reports visible only to approved boss
    ...(user?.email === APPROVED_USER
      ? [{ name: "Reports", path: "/reports", icon: BarChart2 }]
      : []),
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("❌ Failed to sign out: " + error.message);
    } else {
      toast.success("✅ Signed out successfully!");
      navigate("/"); // redirect to homepage or login
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 border-r border-gray-200">
      {/* ✅ Logo & Name Section */}
      <Link
        to="/"
        onClick={onLinkClick}
        className="flex flex-col items-center justify-center gap-2 pt-2 pb-5 border-b border-gray-100"
      >
        <div className="w-24 h-24 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Mount Carmel Logo"
            className="h-20 w-auto object-contain drop-shadow-sm"
          />
        </div>
        <div className="text-center">
          <h1 className="text-base font-semibold text-gray-800">
            Mount Carmel
          </h1>
          <p className="text-xs text-gray-500">Mothercare & Kitchen</p>
        </div>
      </Link>

      {/* ✅ Navigation Links */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors",
                isActive && "bg-gray-100 text-primary font-medium"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* ✅ Sign Out */}
      <div className="p-4 border-t border-gray-100">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:bg-gray-100"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
