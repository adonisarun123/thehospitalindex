import type { Metadata } from "next";
import { PendingPage } from "@/components/pending-page";

export const metadata: Metadata = { title: "Suggest a correction", robots: { index: false, follow: true } };

export default function Page() {
  return (
    <PendingPage title="Suggest a correction">
      <p>The correction and “Suggest a hospital” forms open before public launch. Each submission will get a case reference and be reviewed by an editor before any public detail changes.</p>
    </PendingPage>
  );
}
