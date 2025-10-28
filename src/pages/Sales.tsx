import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(amount);

const Sales = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState<number | "">("");
  const [total, setTotal] = useState<number | "">("");
  const [currentSession, setCurrentSession] = useState<any>(null);

  // ✅ Fetch current active session
  const fetchCurrentSession = async () => {
    const { data, error } = await supabase
      .from("account_sessions")
      .select("*")
      .order("accounted_date", { ascending: false })
      .limit(1)
      .single();
    if (error) console.error("Fetch session error:", error);
    else setCurrentSession(data);
  };

  // ✅ Create new account session
  const handleMakeAccount = async () => {
    const { error } = await supabase.from("account_sessions").insert([
      {
        accounted_date: new Date().toISOString(),
      },
    ]);
    if (error) {
      toast.error("❌ Failed to make account: " + error.message);
    } else {
      toast.success("✅ New account session created!");
      fetchCurrentSession();
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    }
  };

  // ✅ Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, product_name, unit_price, quantity, status, reorder_level, categories:category_id(name)"
        );
      if (error) throw error;
      return data;
    },
  });

  // ✅ Fetch current session sales
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", currentSession?.id],
    queryFn: async () => {
      if (!currentSession?.id) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(product_name, categories:category_id(name))")
        .eq("session_id", currentSession.id)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentSession,
  });

  // ✅ Add sale
  const addSaleMutation = useMutation({
    mutationFn: async (newSale: any) => {
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("quantity, status, reorder_level")
        .eq("id", newSale.product_id)
        .single();
      if (fetchError) throw fetchError;

      if (!product) throw new Error("Product not found");
      if (product.status === "Out of Stock" || product.quantity <= 0)
        throw new Error("❌ Product is out of stock!");
      if (newSale.quantity_sold > product.quantity)
        throw new Error("⚠️ Quantity sold exceeds available stock!");

      const newQty = product.quantity - newSale.quantity_sold;
      const newStatus =
        newQty <= 0
          ? "Out of Stock"
          : newQty <= (product.reorder_level ?? 5)
          ? "Low Stock"
          : "In Stock";

      const { error: saleError } = await supabase.from("sales").insert([
        {
          ...newSale,
          session_id: currentSession?.id || null,
        },
      ]);
      if (saleError) throw saleError;

      const { error: updateError } = await supabase
        .from("products")
        .update({ quantity: newQty, status: newStatus })
        .eq("id", newSale.product_id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("✅ Sale added & stock updated!");
      setIsOpen(false);
      setSelectedProduct(null);
      setQuantity("");
      setTotal("");
    },
    onError: (err: any) => toast.error("❌ " + err.message),
  });

  // ✅ Delete sale
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("🗑️ Sale deleted.");
    },
    onError: (err: any) => toast.error("❌ " + err.message),
  });

  // ✅ Auto total calc
  useEffect(() => {
    if (selectedProduct && quantity) {
      const totalValue = Number(selectedProduct.unit_price) * Number(quantity);
      setTotal(Number(totalValue.toFixed(2)));
    } else setTotal("");
  }, [selectedProduct, quantity]);

  useEffect(() => {
    fetchCurrentSession();
  }, []);

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  const totalSales = sales.length;
  const averageSale = totalSales ? totalRevenue / totalSales : 0;

  return (
    <div className="space-y-6 px-3 sm:px-6">
      <div className="flex items-start justify-between flex-wrap sm:flex-nowrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 mb-8 leading-snug break-words">
            Manage customer sales, invoices, and transactions
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleMakeAccount} variant="outline" className="px-3 sm:px-4">
            Make Account
          </Button>

          {/* View Old Sales */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                className="px-3 sm:px-4 bg-rose-200 text-black hover:bg-rose-300"
              >
                📜 View Old Sales
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Previous Account Sessions</DialogTitle>
              </DialogHeader>
              <OldSalesList />
            </DialogContent>
          </Dialog>

          {/* Add Sale */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 text-sm sm:text-base px-3 sm:px-4">
                <Plus className="h-4 w-4" /> Add Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg">
              <DialogHeader>
                <DialogTitle>Add New Sale</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedProduct || !quantity) {
                    toast.error("⚠️ Select a product and quantity.");
                    return;
                  }
                  addSaleMutation.mutate({
                    product_id: selectedProduct.id,
                    quantity_sold: Number(quantity),
                    total_price: Number(total),
                  });
                }}
                className="space-y-4 py-2"
              >
                <div>
                  <Label>Product</Label>
                  <Select
                    onValueChange={(val) => {
                      const selected = products.find((p) => p.id === val);
                      setSelectedProduct(selected);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) =>
                        p.status === "Out of Stock" || p.quantity <= 0 ? (
                          <SelectItem key={p.id} value={p.id} disabled>
                            {p.product_name} — Out of Stock
                          </SelectItem>
                        ) : (
                          <SelectItem key={p.id} value={p.id}>
                            {p.product_name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Input
                    disabled
                    value={selectedProduct?.categories?.name || ""}
                    placeholder="Auto-filled"
                  />
                </div>

                <div>
                  <Label>Quantity Sold</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <Label>Price per unit</Label>
                  <Input
                    disabled
                    value={selectedProduct ? selectedProduct.unit_price : ""}
                    placeholder="Auto-filled"
                  />
                </div>

                <div>
                  <Label>Total Price</Label>
                  <Input
                    disabled
                    value={total || ""}
                    placeholder="Auto calculated"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full py-3 text-base"
                    disabled={addSaleMutation.isPending}
                  >
                    {addSaleMutation.isPending ? "Saving..." : "Save Sale"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4 text-center shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">{totalSales} sales total</p>
          </CardContent>
        </Card>

        <Card className="p-4 text-center shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{totalSales}</p>
            <p className="text-xs text-muted-foreground">Recorded sales</p>
          </CardContent>
        </Card>

        <Card className="p-4 text-center shadow-sm rounded-xl col-span-2 sm:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Average Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatCurrency(averageSale)}</p>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Sales Records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          {sales.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="p-3">Date</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Total</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100">
                    <td className="p-3">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </td>
                    <td className="p-3">{sale.products?.product_name}</td>
                    <td className="p-3">
                      {sale.products?.categories?.name || "—"}
                    </td>
                    <td className="p-3">{sale.quantity_sold}</td>
                    <td className="p-3">
                      {formatCurrency(sale.total_price)}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSaleMutation.mutate(sale.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-muted-foreground py-6 text-sm">
              No sales recorded yet for this session.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ✅ Old Sales List
const OldSalesList = () => {
  const [sessionsWithSales, setSessionsWithSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessionsWithSales();
  }, []);

  const fetchSessionsWithSales = async () => {
    setLoading(true);

    const { data: sessions, error: sessionError } = await supabase
      .from("account_sessions")
      .select("id, accounted_date")
      .order("accounted_date", { ascending: false });

    if (sessionError || !sessions) {
      console.error(sessionError);
      setSessionsWithSales([]);
      setLoading(false);
      return;
    }

    const sessionsData = await Promise.all(
      sessions.map(async (s) => {
        const { data: sales, error: salesError } = await supabase
          .from("sales")
          .select("*, products(product_name, categories:category_id(name))")
          .eq("session_id", s.id)
          .order("sale_date", { ascending: false });

        if (salesError) console.error(salesError);

        const totalRevenue = (sales || []).reduce(
          (sum, sale) => sum + Number(sale.total_price || 0),
          0
        );

        return { ...s, sales: sales || [], totalRevenue };
      })
    );

    setSessionsWithSales(sessionsData);
    setLoading(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-center text-sm text-muted-foreground">
          Loading previous sessions...
        </p>
      ) : sessionsWithSales.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No previous sales sessions found.
        </p>
      ) : (
        sessionsWithSales.map((session) => (
          <div
            key={session.id}
            className="border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <h3 className="font-semibold text-base mb-3">
              Session — {new Date(session.accounted_date).toLocaleString()}
            </h3>

            {session.sales.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="p-2">Date</th>
                        <th className="p-2">Product</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Quantity</th>
                        <th className="p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.sales.map((sale: any) => (
                        <tr key={sale.id} className="border-b border-gray-100">
                          <td className="p-2">
                            {new Date(sale.sale_date).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            {sale.products?.product_name || "N/A"}
                          </td>
                          <td className="p-2">
                            {sale.products?.categories?.name || "—"}
                          </td>
                          <td className="p-2">{sale.quantity_sold}</td>
                          <td className="p-2">
                            {formatCurrency(sale.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right font-semibold mt-2">
                  Total Revenue: {formatCurrency(session.totalRevenue)}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No sales recorded for this session.
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Sales;
