import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "BuildMate AI",
    template: "%s | BuildMate AI",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
