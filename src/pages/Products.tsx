import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Products = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const queryClient = useQueryClient();

  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [reorderLevel, setReorderLevel] = useState<string>("5");
  const [categoryId, setCategoryId] = useState<string>("");

  // ✅ Fetch products (join with categories)
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories:category_id(name)")
        .order("product_name");
      if (error) throw error;
      return data;
    },
  });

  // ✅ Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // ✅ Add Product
  const addProductMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert([
        {
          product_name: productName,
          quantity: Number(quantity) || 0,
          unit_price: Number(unitPrice) || 0,
          reorder_level: Number(reorderLevel) || 0,
          category_id: categoryId || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("✅ Product added successfully!");
      resetForm();
    },
    onError: (err: any) => toast.error("❌ Failed to add product: " + err.message),
  });

  // ✅ Edit Product
  const editProductMutation = useMutation({
    mutationFn: async () => {
      if (!editingProduct) return;
      const { error } = await supabase
        .from("products")
        .update({
          product_name: productName,
          quantity: Number(quantity),
          unit_price: Number(unitPrice),
          reorder_level: Number(reorderLevel),
          category_id: categoryId || null,
        })
        .eq("id", editingProduct.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("✏️ Product updated successfully!");
      resetForm();
    },
    onError: (err: any) => toast.error("❌ Failed to update product: " + err.message),
  });

  // ✅ Delete Product
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("🗑️ Product deleted successfully");
    },
    onError: () => toast.error("❌ Failed to delete product"),
  });

  const resetForm = () => {
    setOpen(false);
    setEditOpen(false);
    setEditingProduct(null);
    setProductName("");
    setQuantity("");
    setUnitPrice("");
    setReorderLevel("5");
    setCategoryId("");
  };

  const handleEditClick = (product: any) => {
    setEditingProduct(product);
    setProductName(product.product_name);
    setQuantity(String(product.quantity));
    setUnitPrice(String(product.unit_price));
    setReorderLevel(String(product.reorder_level));
    setCategoryId(product.category_id || "");
    setEditOpen(true);
  };

  const filteredProducts = products?.filter((p) =>
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Products</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Manage your product inventory 📦
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md sm:rounded-lg sm:max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Product Name</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} />

              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length ? (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No categories available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Label>Quantity</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />

              <Label>Unit Price (₵)</Label>
              <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />

              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />

              <Button
                className="w-full mt-2"
                onClick={() => addProductMutation.mutate()}
                disabled={addProductMutation.isPending}
              >
                {addProductMutation.isPending ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ✅ Products Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Product List</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-10 text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {filteredProducts?.length ? (
            <div className="min-w-[700px] sm:min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.product_name}</TableCell>
                      <TableCell>{product.categories?.name || "—"}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>₵{product.unit_price.toFixed(2)}</TableCell>
                      <TableCell>
                        {product.quantity <= product.reorder_level ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-white">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
              No products found. Add your first product to get started!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Products;
