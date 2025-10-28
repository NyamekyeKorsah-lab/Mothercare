import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const Features = () => {
  const features = [
    {
      title: "User-Friendly POS Interface",
      desc: "Smooth and intuitive point-of-sale system for faster transactions and minimal staff training.",
    },
    {
      title: "Service & Physical Product Management",
      desc: "Easily manage both tangible products and service-based entries under one dashboard.",
    },
    {
      title: "Inventory / Stock Management",
      desc: "Track product quantities, categories, and availability in real time — automatically updates after every sale.",
    },
    {
      title: "Purchase Management",
      desc: "Record, monitor, and analyze purchases to maintain optimal stock levels and vendor insights.",
    },
    {
      title: "Expense Management",
      desc: "Monitor business spending efficiently by categorizing and reviewing all outgoing expenses.",
    },
    {
      title: "Expiry Control",
      desc: "Automatically flag or alert products nearing expiry to reduce losses and maintain product quality.",
    },
    {
      title: "Sales Management",
      desc: "Comprehensive sales tracking with session-based reporting for transparency and accuracy.",
    },
    {
      title: "User Control & Access Levels",
      desc: "Manage different users with customizable roles and permissions to maintain security and accountability.",
    },
    {
      title: "Local Network Compatibility",
      desc: "Optimized to work seamlessly within local networks, ensuring smooth operation even in limited-internet environments.",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center">
        Key Features
      </h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Explore the powerful features that make the Mothercare Inventory System efficient and reliable.
      </p>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <Card
            key={i}
            className="border shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl"
          >
            <CardHeader className="flex items-center gap-3">
              <CheckCircle className="text-green-500 w-5 h-5 flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg font-semibold leading-tight">
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Features;
