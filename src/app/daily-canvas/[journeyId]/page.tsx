import { DailyCanvasScreen } from "@/components/screens/DailyCanvasScreen";

export default async function DailyCanvasPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = await params;
  return <DailyCanvasScreen journeyId={journeyId} />;
}
