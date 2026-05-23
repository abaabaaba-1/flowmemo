import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateCapsule, deleteCapsule } from "@/lib/db/queries/capsules";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ capsuleId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const { capsuleId } = await params;

  const body = await request.json();
  const updated = await updateCapsule(capsuleId, userId, body);

  if (!updated) {
    return NextResponse.json({ error: "胶囊不存在或无权限" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ capsuleId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const { capsuleId } = await params;

  const deleted = await deleteCapsule(capsuleId, userId);

  if (!deleted) {
    return NextResponse.json({ error: "胶囊不存在或无权限" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
