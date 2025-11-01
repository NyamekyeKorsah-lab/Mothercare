import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download } from "lucide-react";

const Reports = () => {
  const [activeTab, setActiveTab] = useState<"mothercare" | "kitchen">("mothercare");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const [productSummary, setProductSummary] = useState({
    totalRevenue: 0,
    totalSales: 0,
    topProducts: [] as { name: string; count: number }[],
    remainingStock: 0,
  });

  const [kitchenSummary, setKitchenSummary] = useState({
    totalRevenue: 0,
    totalSales: 0,
    topFoods: [] as { name: string; count: number }[],
  });

  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const APPROVED_USER = "jadidianyamekyekorsah@gmail.com"; // ✅ Only your boss

  // 🔒 Check access
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user;
      setUser(currentUser);

      if (!currentUser || currentUser.email !== APPROVED_USER) {
        navigate("/"); // 🚫 redirect unapproved users
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === "mothercare") fetchProductReports();
    else fetchKitchenReports();
    setLastUpdated(new Date().toLocaleString());
  }, [startDate, endDate, activeTab]);

  // 🍼 Fetch Mothercare Reports
  const fetchProductReports = async () => {
    try {
      let query = supabase
        .from("sales")
        .select("*, products(product_name, unit_price, quantity)");
      if (startDate && endDate)
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      const { data: sales, error } = await query;
      if (error) throw error;

      if (!sales?.length) {
        setProductSummary({ totalRevenue: 0, totalSales: 0, topProducts: [], remainingStock: 0 });
        return;
      }

      const totalRevenue = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
      const totalSales = sales.length;

      const productCounts: Record<string, number> = {};
      sales.forEach((s: any) => {
        if (s.products?.product_name) {
          productCounts[s.products.product_name] =
            (productCounts[s.products.product_name] || 0) + 1;
        }
      });

      const topProducts = Object.entries(productCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const { data: products, error: stockError } = await supabase
        .from("products")
        .select("quantity");
      if (stockError) throw stockError;

      const remainingStock = products.reduce((sum: number, p: any) => sum + p.quantity, 0);
      setProductSummary({ totalRevenue, totalSales, topProducts, remainingStock });
    } catch (err: any) {
      console.error(err);
      toast.error("❌ Failed to load Mothercare report");
    }
  };

  // 🍳 Fetch Kitchen Reports
  const fetchKitchenReports = async () => {
    try {
      let query = supabase.from("food_sales").select("*");
      if (startDate && endDate)
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      const { data: foodSales, error } = await query;
      if (error) throw error;

      if (!foodSales?.length) {
        setKitchenSummary({ totalRevenue: 0, totalSales: 0, topFoods: [] });
        return;
      }

      const totalRevenue = foodSales.reduce(
        (sum, f: any) => sum + (f.price || 0) * (f.quantity || 0),
        0
      );
      const totalSales = foodSales.length;

      const foodCounts: Record<string, number> = {};
      foodSales.forEach((f: any) => {
        if (f.food_name) {
          foodCounts[f.food_name] = (foodCounts[f.food_name] || 0) + 1;
        }
      });

      const topFoods = Object.entries(foodCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setKitchenSummary({ totalRevenue, totalSales, topFoods });
    } catch (err: any) {
      console.error(err);
      toast.error("❌ Failed to load Kitchen report");
    }
  };

  const handleDateRange = (range: string) => {
    const today = new Date();
    let start, end;

    if (range === "today") {
      start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    } else if (range === "week") {
      const first = today.getDate() - today.getDay();
      start = new Date(today.setDate(first)).toISOString();
      end = new Date().toISOString();
    } else if (range === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
    }

    setStartDate(start || "");
    setEndDate(end || "");
  };

  const exportToCSV = (title: string, data: any[]) => {
    const csvContent = [
      [`${title}`],
      ["Item Name", "Times Sold"],
      ...data.map((i) => [i.name, i.count]),
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s/g, "_")}.csv`;
    link.click();
  };

  if (!user || user.email !== APPROVED_USER) return null;

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Reports</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Performance overview across Mothercare 🍼 and Kitchen 🍳
          </p>
          <p className="text-xs text-muted-foreground italic mt-1">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="flex flex-row lg:flex-col lg:items-end gap-2 flex-wrap lg:flex-nowrap">
          <Button
            variant={activeTab === "mothercare" ? "default" : "outline"}
            onClick={() => setActiveTab("mothercare")}
          >
            🍼 Mothercare
          </Button>
          <Button
            variant={activeTab === "kitchen" ? "default" : "outline"}
            onClick={() => setActiveTab("kitchen")}
          >
            🍳 Kitchen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <Button onClick={() => handleDateRange("today")}>Today</Button>
        <Button onClick={() => handleDateRange("week")}>This Week</Button>
        <Button onClick={() => handleDateRange("month")}>This Month</Button>
      </div>

      {/* Mothercare Section */}
      {activeTab === "mothercare" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">🍼 Mothercare Report</h2>
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV("Mothercare Top Products", productSummary.topProducts)
              }
            >
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>₵{productSummary.totalRevenue.toFixed(2)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Sales</CardTitle>
              </CardHeader>
              <CardContent>{productSummary.totalSales}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Remaining Stock</CardTitle>
              </CardHeader>
              <CardContent>{productSummary.remainingStock}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                {productSummary.topProducts.length ? (
                  <ul className="space-y-1">
                    {productSummary.topProducts.map((p) => (
                      <li key={p.name} className="flex justify-between text-sm">
                        <span>{p.name}</span>
                        <span className="font-semibold">{p.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No sales found</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Kitchen Section */}
      {activeTab === "kitchen" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">🍳 Kitchen Report</h2>
            <Button
              variant="outline"
              onClick={() => exportToCSV("Kitchen Top Foods", kitchenSummary.topFoods)}
            >
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>₵{kitchenSummary.totalRevenue.toFixed(2)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Sales</CardTitle>
              </CardHeader>
              <CardContent>{kitchenSummary.totalSales}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Foods</CardTitle>
              </CardHeader>
              <CardContent>
                {kitchenSummary.topFoods.length ? (
                  <ul className="space-y-1">
                    {kitchenSummary.topFoods.map((f) => (
                      <li key={f.name} className="flex justify-between text-sm">
                        <span>{f.name}</span>
                        <span className="font-semibold">{f.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No food sales found</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
