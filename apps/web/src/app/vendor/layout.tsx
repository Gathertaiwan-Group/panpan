import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireVendor } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "供應商後台", robots: { index: false, follow: false } };

export default async function VendorLayout({ children }: { children: ReactNode }) {
  await requireVendor();
  return <>{children}</>;
}
