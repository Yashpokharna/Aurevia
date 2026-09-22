import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { formatBytes, MAX_VIDEO_BYTES } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Add a product",
  robots: { index: false },
};

export default function NewProductPage() {
  return (
    <div className="shell py-10">
      <ProductForm maxVideoLabel={formatBytes(MAX_VIDEO_BYTES).replace(" ", "")} />
    </div>
  );
}
