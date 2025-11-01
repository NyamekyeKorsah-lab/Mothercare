import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const APPROVED_USERS = [
  "jadidianyamekyekorsah@gmail.com",
  "foodmanager@gmail.com",
  "staff@mountcarmel.com",
]; // ✅ Add as many approved emails as you want

const FoodSales = () => {
  const [open, setOpen] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [user, setUser] = useState<any>(null); // ✅ Track current user
  const queryClient = useQueryClient();

  // ✅ Fetch current logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    fetchUser();
  }, []);

  // ✅ Fetch all food sales
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["food_sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_sales")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ✅ Add a new sale
  const addSaleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("food_sales").insert([
        {
          food_name: foodName,
          quantity: Number(quantity),
          price: Number(price),
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ Food sale added successfully!");
      queryClient.invalidateQueries({ queryKey: ["food_sales"] });
      setOpen(false);
      setFoodName("");
      setQuantity("");
      setPrice("");
    },
    onError: (err: any) => toast.error("❌ Failed to add sale: " + err.message),
  });

  const isApproved = APPROVED_USERS.includes(user?.email || ""); // ✅ Check if current user is approved

  return (
    <div className="space-y-6 px-3 sm:px-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Food Sales</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-snug">
            Manage your restaurant daily food sales 🍛
          </p>
        </div>

        {/* ✅ Show Add Sale button only for approved users */}
        {isApproved && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base">
                <Plus className="h-4 w-4 mr-1" /> Add Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md sm:rounded-lg">
              <DialogHeader>
                <DialogTitle>Add New Food Sale</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Label>Food Name</Label>
                <Input value={foodName} onChange={(e) => setFoodName(e.target.value)} />

                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />

                <Label>Price (₵)</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />

                <Button
                  className="w-full mt-2"
                  onClick={() => addSaleMutation.mutate()}
                  disabled={addSaleMutation.isPending}
                >
                  {addSaleMutation.isPending ? "Saving..." : "Save Sale"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Recent Food Sales</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-center py-4 text-muted-foreground">Loading...</p>
          ) : sales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Food Name</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Price (₵)</TableHead>
                  <TableHead className="text-center">Total (₵)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale: any) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.food_name || "—"}</TableCell>
                    <TableCell className="text-center">{sale.quantity}</TableCell>
                    <TableCell className="text-center">{sale.price.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {(sale.quantity * sale.price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground text-sm sm:text-base">
              No food sales found. Add your first sale to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FoodSales;
