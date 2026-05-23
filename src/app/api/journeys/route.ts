import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getActiveJourney, getJourneysByUser, getJourneyById, createJourney } from "@/lib/db/queries/journeys";
import { standardizeDestinationLocal } from "@/lib/destination";
import { nanoid } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;

  const searchParams = request.nextUrl.searchParams;
  const all = searchParams.get("all") === "true";
  const id = searchParams.get("id");

  if (id) {
    const journey = await getJourneyById(id, userId);
    return NextResponse.json(journey);
  }

  if (all) {
    const journeys = await getJourneysByUser(userId);
    return NextResponse.json(journeys);
  }

  const active = await getActiveJourney(userId);
  return NextResponse.json(active);
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;

  const body = await request.json();
  const { description, startDate, endDate } = body;
  const standardizedDestination = standardizeDestinationLocal(body);

  if (!standardizedDestination.destination) {
    return NextResponse.json({ error: "目的地不能为空" }, { status: 400 });
  }

  const parsedStartDate = startDate ? new Date(startDate) : new Date();
  const parsedEndDate = endDate ? new Date(endDate) : null;

  if (Number.isNaN(parsedStartDate.getTime())) {
    return NextResponse.json({ error: "出发日期无效" }, { status: 400 });
  }

  if (parsedEndDate && Number.isNaN(parsedEndDate.getTime())) {
    return NextResponse.json({ error: "返程日期无效" }, { status: 400 });
  }

  if (parsedEndDate && parsedEndDate.getTime() < parsedStartDate.getTime()) {
    return NextResponse.json({ error: "返程日期不能早于出发日期" }, { status: 400 });
  }

  const journey = await createJourney({
    id: nanoid(),
    userId,
    destination: standardizedDestination.destination,
    destinationCountryRegion: standardizedDestination.destinationCountryRegion,
    destinationCity: standardizedDestination.destinationCity,
    destinationPlace: standardizedDestination.destinationPlace,
    destinationNote: standardizedDestination.destinationNote,
    description: typeof description === "string" ? description.trim() : undefined,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
  });

  return NextResponse.json(journey, { status: 201 });
}
