import { useState, useRef } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // form states
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(5);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(*), suppliers(*)")
        .order("product_name");
      if (error) throw error;
      return data;
    },
  });

  // add product
  const addProductMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase
          .storage
          .from("product-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase
          .storage
          .from("product-images")
          .getPublicUrl(fileName);

        imageUrl = publicData.publicUrl;
      }

      const { error } = await supabase.from("products").insert([
        {
          product_name: productName,
          quantity,
          unit_price: unitPrice,
          reorder_level: reorderLevel,
          image_url: imageUrl,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product added successfully!");
      setOpen(false);
      setProductName("");
      setQuantity(0);
      setUnitPrice(0);
      setReorderLevel(5);
      setImageFile(null);
    },
    onError: () => {
      toast.error("Failed to add product");
    },
  });

  // delete product
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

  // filter
  const filteredProducts = products?.filter((product) =>
    product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.categories?.category_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    product.suppliers?.supplier_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product inventory with pictures
          </p>
        </div>

        {/* Add Product Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label>Product Name</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />

              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />

              <Label>Unit Price</Label>
              <Input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
              />

              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={reorderLevel}
                onChange={(e) =>
                  setReorderLevel(Number(e.target.value))
                }
              />

              <Label>Upload Image</Label>
              <Input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) =>
                  setImageFile(e.target.files?.[0] || null)
                }
              />

              <Button
                className="w-full mt-2"
                onClick={() => addProductMutation.mutate()}
              >
                Save Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name, category, or supplier..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading products...
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell className="font-medium">
                      {product.product_name}
                    </TableCell>
                    <TableCell>
                      {product.categories?.category_name || "—"}
                    </TableCell>
                    <TableCell>
                      {product.suppliers?.supplier_name || "—"}
                    </TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      ${Number(product.unit_price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {product.quantity <= product.reorder_level ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge className="bg-accent text-accent-foreground">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No products found. Add your first product to get started!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              the product from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteId && deleteMutation.mutate(deleteId)
              }
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
