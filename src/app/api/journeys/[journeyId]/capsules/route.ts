import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCapsulesByJourney, createCapsule } from "@/lib/db/queries/capsules";
import { nanoid } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const { journeyId } = await params;

  const capsules = await getCapsulesByJourney(journeyId, userId);
  return NextResponse.json(capsules);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const { journeyId } = await params;

  const body = await request.json();
  const { title, location, userRawText, aiContent, keywords, photoUrls } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const capsule = await createCapsule({
    id: nanoid(),
    journeyId,
    userId,
    title: title.trim(),
    location,
    userRawText,
    aiContent,
    keywords,
    photoUrls,
  });

  return NextResponse.json(capsule, { status: 201 });
}
