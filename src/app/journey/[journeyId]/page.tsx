import { JourneyScreen } from "@/components/screens/JourneyScreen";

export default async function JourneyPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = await params;
  return <JourneyScreen journeyId={journeyId} />;
}
