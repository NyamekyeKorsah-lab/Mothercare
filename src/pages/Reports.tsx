import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";

const Reports = () => {
  const [activeTab, setActiveTab] = useState<"mothercare" | "kitchen">("mothercare");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  const [form, setForm] = useState({
    date: "",
    totalRevenue: "",
    totalSales: "",
    notes: "",
  });

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

  useEffect(() => {
    if (activeTab === "mothercare") fetchProductReports();
    else fetchKitchenReports();
  }, [startDate, endDate, activeTab]);

  // 🍼 Fetch Mothercare Reports
  const fetchProductReports = async () => {
    try {
      let query = supabase
        .from("sales")
        .select("*, products(product_name, unit_price, quantity)");
      if (startDate && endDate) query = query.gte("created_at", startDate).lte("created_at", endDate);
      const { data: sales, error } = await query;
      if (error) throw error;

      if (!sales?.length) {
        setProductSummary({ totalRevenue: 0, totalSales: 0, topProducts: [], remainingStock: 0 });
        return;
      }

      const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
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

      const { data: products, error: stockError } = await supabase.from("products").select("quantity");
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
      if (startDate && endDate) query = query.gte("created_at", startDate).lte("created_at", endDate);
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

  // ✅ Add Report
  const handleAddReport = async () => {
    try {
      const tableName = activeTab === "mothercare" ? "reports" : "kitchen_reports";
      const { error } = await supabase.from(tableName).insert([
        {
          date: form.date,
          total_revenue: Number(form.totalRevenue),
          total_sales: Number(form.totalSales),
          notes: form.notes,
        },
      ]);
      if (error) throw error;
      toast.success(`✅ ${activeTab === "mothercare" ? "Mothercare" : "Kitchen"} report added!`);
      setOpenDialog(false);
      setForm({ date: "", totalRevenue: "", totalSales: "", notes: "" });
      activeTab === "mothercare" ? fetchProductReports() : fetchKitchenReports();
    } catch (err: any) {
      toast.error("❌ Failed to add report: " + err.message);
    }
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

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Reports</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Monitor and compare sales performance across Mothercare 🍼 and Kitchen 🍳 departments.
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
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">🍼 Mothercare Report</h2>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Add Report
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg">
                <DialogHeader>
                  <DialogTitle>Add Mothercare Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Total Revenue (₵)"
                    value={form.totalRevenue}
                    onChange={(e) => setForm({ ...form, totalRevenue: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Total Sales"
                    value={form.totalSales}
                    onChange={(e) => setForm({ ...form, totalSales: e.target.value })}
                  />
                  <Textarea
                    placeholder="Notes (optional)"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                  <Button className="w-full" onClick={handleAddReport}>
                    Save Report
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Kitchen Section */}
      {activeTab === "kitchen" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">🍳 Kitchen Report</h2>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Add Report
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg">
                <DialogHeader>
                  <DialogTitle>Add Kitchen Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Total Revenue (₵)"
                    value={form.totalRevenue}
                    onChange={(e) => setForm({ ...form, totalRevenue: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Total Sales"
                    value={form.totalSales}
                    onChange={(e) => setForm({ ...form, totalSales: e.target.value })}
                  />
                  <Textarea
                    placeholder="Notes (optional)"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                  <Button className="w-full" onClick={handleAddReport}>
                    Save Report
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
