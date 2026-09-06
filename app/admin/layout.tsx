import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | TradeFoot",
  description: "Manage TradeFoot users and module access.",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
