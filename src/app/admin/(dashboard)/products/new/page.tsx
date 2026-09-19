import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = {
  title: "Add a product",
  robots: { index: false },
};

export default function NewProductPage() {
  return (
    <div className="shell py-10">
      <ProductForm />
    </div>
  );
}
