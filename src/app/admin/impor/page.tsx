import { ImportPreview } from "./import-preview";

export const metadata = { title: "Impor dari OLX" };

export default function ImportPage() {
  const sellers = (process.env.OLX_SELLER_IDS ?? "44649495").split(",").map((s) => s.trim());
  return <ImportPreview sellers={sellers} />;
}
