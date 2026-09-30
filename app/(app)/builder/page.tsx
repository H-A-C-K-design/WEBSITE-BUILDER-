import { Suspense } from "react";
import BuilderPageInner from "./BuilderInner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Builder",
};

export default function BuilderPage() {
  return (
    <Suspense>
      <BuilderPageInner />
    </Suspense>
  );
}
