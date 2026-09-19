import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { products } from "@/lib/repository/products";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false },
};

export default async function EditProductPage(props: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await props.params;
  const product = await products.findById(id);
  if (!product) notFound();

  return (
    <div className="shell py-10">
      <ProductForm product={product} />
    </div>
  );
}
