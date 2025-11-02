import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

const Reports = () => {
  const [activeTab, setActiveTab] = useState<"mothercare" | "kitchen">("mothercare");
  const [lastUpdated, setLastUpdated] = useState("");
  const [user, setUser] = useState<any>(null);
  const [mothercareSessions, setMothercareSessions] = useState<any[]>([]);
  const [kitchenSessions, setKitchenSessions] = useState<any[]>([]);
  const navigate = useNavigate();
  const APPROVED_USER = "jadidianyamekyekorsah@gmail.com";

  // ✅ Restrict access
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user;
      setUser(currentUser);
      if (!currentUser || currentUser.email !== APPROVED_USER) navigate("/");
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleString());
    if (activeTab === "mothercare") fetchMothercareReports();
    else fetchKitchenReports();
  }, [activeTab]);

  // 🍼 Fetch Mothercare Reports
  const fetchMothercareReports = async () => {
    try {
      const { data: sales, error } = await supabase
        .from("sales")
        .select("*, products(product_name, unit_price)");
      if (error) throw error;

      if (!sales?.length) return setMothercareSessions([]);

      const grouped: Record<string, any[]> = {};
      sales.forEach((s: any) => {
        const date = new Date(s.created_at).toLocaleDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(s);
      });

      const sessions = Object.entries(grouped).map(([date, items]) => ({
        date,
        items,
        totalRevenue: (items as any[]).reduce((sum, i) => sum + (i.total_price || 0), 0),
        totalSales: (items as any[]).length,
      }));

      sessions.sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setMothercareSessions(sessions);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load Mothercare reports");
    }
  };

  // 🍳 Fetch Kitchen Reports
  const fetchKitchenReports = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from("kitchen_sessions")
        .select("*")
        .order("accounted_date", { ascending: false });
      if (error) throw error;

      const { data: reports } = await supabase.from("kitchen_reports").select("*");
      const { data: sales } = await supabase.from("food_sales").select("*");

      const combined = sessions.map((s: any) => {
        const report = reports?.find((r: any) => r.session_id === s.id);
        const sessionSales = sales?.filter((f: any) => f.session_id === s.id) || [];
        const totalRevenue =
          sessionSales.reduce((sum, f: any) => sum + f.price * f.quantity, 0) || 0;
        return { ...s, totalRevenue, totalSales: sessionSales.length, report, sales: sessionSales };
      });

      setKitchenSessions(combined);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load kitchen reports");
    }
  };

  // 📄 Export PDF (Fixed logo + Ghana cedi formatting)
  const exportToPDF = (title: string, data: any[], type: "mothercare" | "kitchen") => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // ✅ Working base64 PNG logo (replace with your uploaded one if preferred)
      const base64Logo =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAYAAAA6S3XhAAABRUlEQVR4nO3RMQ0AAAwCoNm/9F2hgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwCUMAAQAB7m7lHQAAAABJRU5ErkJggg==";

      // 🖼 Safely add logo
      const imgWidth = 35;
      const imgX = (pageWidth - imgWidth) / 2;
      try {
        doc.addImage(base64Logo, "PNG", imgX, 10, imgWidth, 30);
      } catch (e) {
        console.warn("Logo skipped:", e);
      }

      // 🏷 Header text
      doc.setFontSize(16);
      doc.text("Mount Carmel Mothercare & Kitchen", pageWidth / 2, 48, { align: "center" });
      doc.setFontSize(11);
      doc.text(
        `Report Type: ${type === "mothercare" ? "Mothercare 🍼" : "Kitchen 🍳"}`,
        pageWidth / 2,
        56,
        { align: "center" }
      );
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 62, {
        align: "center",
      });

      // 🧾 Table setup
      const headers =
        type === "mothercare"
          ? [["#", "Product", "Qty", "Unit Price (₵)", "Total (₵)"]]
          : [["#", "Food Name", "Qty", "Price (₵)", "Total (₵)"]];

      const tableData =
        type === "mothercare"
          ? data.map((i, index) => [
              index + 1,
              i.products?.product_name || "Unknown",
              i.quantity,
              `₵${i.products?.unit_price?.toFixed(2) || "0.00"}`,
              `₵${i.total_price?.toFixed(2) || "0.00"}`,
            ])
          : data.map((i, index) => [
              index + 1,
              i.food_name,
              i.quantity,
              `₵${i.price.toFixed(2)}`,
              `₵${(i.price * i.quantity).toFixed(2)}`,
            ]);

      autoTable(doc, {
        startY: 70,
        head: headers,
        body: tableData,
        theme: "grid",
        styles: { fontSize: 10 },
        headStyles: {
          fillColor: type === "mothercare" ? [241, 90, 36] : [53, 162, 235],
        },
        didDrawPage: () => {
          doc.setFontSize(9);
          doc.text(
            `© ${new Date().getFullYear()} Mount Carmel Inventory System`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" }
          );
        },
      });

      const total =
        type === "mothercare"
          ? data.reduce((sum, i) => sum + (i.total_price || 0), 0)
          : data.reduce((sum, i) => sum + i.price * i.quantity, 0);

      doc.text(`Total Revenue: ₵${total.toFixed(2)}`, 14, (doc as any).lastAutoTable.finalY + 10);

      doc.save(`${title.replace(/\s/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      toast.error("Error generating PDF. Check console for details.");
    }
  };

  if (!user || user.email !== APPROVED_USER) return null;

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Performance overview across Mothercare 🍼 and Kitchen 🍳
          </p>
          <p className="text-xs italic text-gray-400">Last updated: {lastUpdated}</p>
        </div>
        <div className="flex gap-2">
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

      {/* 🍼 Mothercare Section */}
      {activeTab === "mothercare" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Mothercare Reports</h2>
          {mothercareSessions.length ? (
            mothercareSessions.map((session) => {
              const date = new Date(session.date);
              const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
              const formattedDate = date.toLocaleDateString();
              return (
                <Card key={session.date}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>
                          {dayName} {formattedDate}
                        </CardTitle>
                        <p className="text-xs text-gray-500">
                          {session.totalSales} product sale(s)
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          exportToPDF(
                            `Mothercare_Report_${dayName}_${formattedDate.replace(/\//g, "-")}`,
                            session.items,
                            "mothercare"
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-1" /> Export PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <strong>Total Revenue:</strong> ₵{session.totalRevenue.toFixed(2)}
                      </div>
                      <div>
                        <strong>Total Sales:</strong> {session.totalSales}
                      </div>
                    </div>
                    {session.items.length ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Price (₵)</TableHead>
                            <TableHead>Total (₵)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {session.items.map((s: any) => (
                            <TableRow key={s.id}>
                              <TableCell>{s.products?.product_name || "Unknown"}</TableCell>
                              <TableCell>{s.quantity}</TableCell>
                              <TableCell>
                                ₵{s.products?.unit_price?.toFixed(2) || "0.00"}
                              </TableCell>
                              <TableCell>
                                ₵{s.total_price?.toFixed(2) || "0.00"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-2">
                        No sales recorded for this date.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center">No Mothercare sales found.</p>
          )}
        </div>
      )}

      {/* 🍳 Kitchen Section */}
      {activeTab === "kitchen" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Kitchen Reports</h2>
          {kitchenSessions.length ? (
            kitchenSessions
              .filter((s) => s.sales?.length)
              .map((session) => {
                const date = new Date(session.accounted_date);
                const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
                const formattedDate = date.toLocaleDateString();
                return (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>
                            {dayName} {formattedDate}
                          </CardTitle>
                          <p className="text-xs text-gray-500">
                            {session.sales.length} food sale(s)
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() =>
                            exportToPDF(
                              `Kitchen_Report_${dayName}_${formattedDate.replace(/\//g, "-")}`,
                              session.sales,
                              "kitchen"
                            )
                          }
                        >
                          <Download className="h-4 w-4 mr-1" /> Export PDF
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <strong>Total Revenue:</strong> ₵{session.totalRevenue.toFixed(2)}
                        </div>
                        <div>
                          <strong>Total Sales:</strong> {session.totalSales}
                        </div>
                      </div>
                      {session.sales.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Food Name</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>Price (₵)</TableHead>
                              <TableHead>Total (₵)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {session.sales.map((s: any) => (
                              <TableRow key={s.id}>
                                <TableCell>{s.food_name}</TableCell>
                                <TableCell>{s.quantity}</TableCell>
                                <TableCell>₵{s.price.toFixed(2)}</TableCell>
                                <TableCell>₵{(s.price * s.quantity).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-2">
                          No food sales recorded for this session.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
          ) : (
            <p className="text-sm text-gray-500 text-center">No kitchen sessions found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
