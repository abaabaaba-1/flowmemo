import { HomeScreen } from "@/components/screens/home-screen";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  return <HomeScreen skipCover={start === "1"} />;
}
