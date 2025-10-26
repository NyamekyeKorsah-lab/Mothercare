import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  }).format(amount);

const Sales = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState<number | "">("");
  const [total, setTotal] = useState<number | "">("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, product_name, unit_price");
      if (error) throw error;
      return data;
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(product_name, unit_price)")
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addSaleMutation = useMutation({
    mutationFn: async (newSale: any) => {
      const { error } = await supabase.from("sales").insert([newSale]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("✅ Sale added successfully!");
      setIsOpen(false);
      setSelectedProduct(null);
      setQuantity("");
      setTotal("");
    },
    onError: (err: any) => toast.error("❌ Failed to add sale: " + err.message),
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("🗑️ Sale deleted successfully");
    },
    onError: (err: any) => toast.error("❌ Failed to delete sale: " + err.message),
  });

  useEffect(() => {
    if (selectedProduct && quantity) {
      const totalValue = Number(selectedProduct.unit_price) * Number(quantity);
      setTotal(Number(totalValue.toFixed(2)));
    } else setTotal("");
  }, [selectedProduct, quantity]);

  const handleAddSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity) {
      toast.error("⚠️ Please select a product and enter quantity.");
      return;
    }
    addSaleMutation.mutate({
      product_id: selectedProduct.id,
      quantity_sold: Number(quantity),
      total_price: Number(total),
    });
  };

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  const totalSales = sales.length;
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  return (
    <div className="space-y-6 px-3 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 mb-6">
            Manage customer sales, invoices, and transactions
          </p>
        </div>

        {/* Add Sale Button */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 mt-1 sm:mt-0">
              <Plus className="h-4 w-4" /> Add Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg">
            <DialogHeader>
              <DialogTitle>Add New Sale</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddSale} className="space-y-4 py-2">
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
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  className="text-base py-3"
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
                <Input disabled value={total || ""} placeholder="Auto calculated" />
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full py-3 text-base">
                  Save Sale
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard-style Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="rounded-xl shadow-md text-center flex flex-col justify-center p-4 sm:p-5">
          <CardTitle className="text-sm text-muted-foreground mb-1">
            Total Revenue
          </CardTitle>
          <p className="text-xl sm:text-2xl font-semibold break-words leading-tight">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{totalSales} sales total</p>
        </Card>

        <Card className="rounded-xl shadow-md text-center flex flex-col justify-center p-4 sm:p-5">
          <CardTitle className="text-sm text-muted-foreground mb-1">Total Sales</CardTitle>
          <p className="text-xl sm:text-2xl font-semibold leading-tight">{totalSales}</p>
          <p className="text-xs text-muted-foreground mt-1">Recorded sales</p>
        </Card>

        <Card className="rounded-xl shadow-md text-center flex flex-col justify-center p-4 sm:p-5 col-span-2 sm:col-span-1">
          <CardTitle className="text-sm text-muted-foreground mb-1">Average Sale</CardTitle>
          <p className="text-xl sm:text-2xl font-semibold break-words leading-tight">
            {formatCurrency(averageSale)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
        </Card>
      </div>

      {/* Sales Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Sales Records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          {sales.length > 0 ? (
            <table className="w-full text-left border-collapse text-sm sm:text-base">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">{sale.products?.product_name || "N/A"}</td>
                    <td className="py-3 px-4">{sale.quantity_sold}</td>
                    <td className="py-3 px-4">{formatCurrency(sale.total_price)}</td>
                    <td className="py-3 px-4 text-right">
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
            <p className="text-center text-muted-foreground py-6 text-sm sm:text-base">
              No sales recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Sales;
