import { Suspense } from "react";
import BuilderInner from "../BuilderInner";

export default function BuilderProjectPage() {
  return (
    <Suspense>
      <BuilderInner />
    </Suspense>
  );
}
