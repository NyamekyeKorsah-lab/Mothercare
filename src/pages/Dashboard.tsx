import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // ✅ Fetch current (latest) account session
  const fetchCurrentSession = async () => {
    const { data, error } = await supabase
      .from("account_sessions")
      .select("*")
      .order("accounted_date", { ascending: false })
      .limit(1)
      .single();
    if (!error) setCurrentSession(data);
  };

  // ✅ Fetch products
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories:category_id(name)");
    if (!error) setProducts(data || []);
  };

  // ✅ Fetch sales
  const fetchSales = async (sessionId?: number) => {
    if (!sessionId) return setSales([]);
    const { data, error } = await supabase
      .from("sales")
      .select("*, products(product_name, categories:category_id(name))")
      .eq("session_id", sessionId)
      .order("sale_date", { ascending: false })
      .limit(10);
    if (!error) setSales(data || []);
  };

  // ✅ Load data
  useEffect(() => {
    fetchCurrentSession();
    fetchProducts();
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    if (currentSession?.id) {
      fetchSales(currentSession.id);
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [currentSession?.id]);

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const stockAlerts = products.filter(
    (p) => p.quantity <= (p.reorder_level || 0)
  );

  const totalRevenue = sales.reduce(
    (sum, s) => sum + Number(s.total_price || 0),
    0
  );
  const totalSalesCount = sales.length;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      maximumFractionDigits: 2,
    }).format(amount);

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 space-y-5 max-w-screen-xl mx-auto">
      {/* ✅ Removed Breadcrumb */}

      {/* Header */}
      <div className="text-left">
        <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Real-Time Inventory Insights
        </p>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
          Track product performance, sales, and stock status in real time.
        </p>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 italic">
          Last updated: {lastUpdated}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4 w-full">
        {[
          {
            title: "Total Products",
            value: totalProducts,
            icon: <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
            sub: "Active items in stock",
          },
          {
            title: "Total Stock",
            value: totalStock,
            icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />,
            sub: "Units available",
          },
          {
            title: "Stock Alerts",
            value: stockAlerts.length,
            icon: (
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            ),
            sub: "Low or out of stock items",
          },
          {
            title: "Total Sales",
            value: formatCurrency(totalRevenue),
            icon: <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />,
            sub: `${totalSalesCount} sale${
              totalSalesCount !== 1 ? "s" : ""
            } this session`,
          },
        ].map((item, i) => (
          <Card
            key={i}
            className="flex flex-col justify-center items-center p-2 sm:p-4 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200"
          >
            <CardHeader className="flex flex-col items-center justify-center space-y-1 p-0 text-center">
              <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                {item.title} {item.icon}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center p-0 mt-1 flex flex-col justify-center items-center">
              <div className="font-bold text-lg sm:text-xl md:text-2xl leading-tight break-words text-balance">
                {item.value}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {item.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <Card className="shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200 w-full">
          <CardHeader className="px-3 sm:px-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 sm:px-4">
            {stockAlerts.map((p) => {
              const isOutOfStock =
                p.quantity === 0 || p.status === "Out of Stock";
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                    isOutOfStock
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "bg-muted/50"
                  } hover:bg-gray-50 transition-colors duration-200`}
                >
                  <div className="text-left">
                    <p className="font-medium text-sm sm:text-base">
                      {p.product_name} ({p.categories?.name || "Uncategorized"})
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {isOutOfStock
                        ? "Out of stock"
                        : `Reorder level: ${p.reorder_level}`}
                    </p>
                  </div>
                  <Badge
                    variant={isOutOfStock ? "secondary" : "destructive"}
                    className={`text-[10px] sm:text-xs px-2 py-1 ${
                      isOutOfStock
                        ? "bg-gray-300 dark:bg-gray-700 text-gray-800"
                        : ""
                    }`}
                  >
                    {p.quantity} / {p.reorder_level} units
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent Sales */}
      {sales.length > 0 && (
        <Card className="shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200 w-full">
          <CardHeader className="px-3 sm:px-4">
            <CardTitle className="text-sm sm:text-base font-semibold">
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 sm:px-4">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-left">
                  <p className="text-sm sm:text-base text-foreground/70">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm sm:text-base font-medium text-foreground/85">
                    {sale.products?.product_name}{" "}
                    <span className="text-muted-foreground">
                      ({sale.products?.categories?.name || "Uncategorized"})
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm sm:text-base font-normal text-foreground/80">
                    {formatCurrency(Number(sale.total_price))}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {sale.quantity_sold} units
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <footer className="text-[11px] text-center text-muted-foreground mt-8 pb-4">
        © {new Date().getFullYear()} Mount Carmel Inventory System
      </footer>
    </div>
  );
};

export default Dashboard;
