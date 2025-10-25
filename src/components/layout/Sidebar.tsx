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
  Baby
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

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Baby className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Mothercare</h2>
          <p className="text-xs text-muted-foreground">Inventory System</p>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
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
    </div>
  );
};
