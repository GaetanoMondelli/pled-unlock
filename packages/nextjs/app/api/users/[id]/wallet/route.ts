import { NextRequest, NextResponse } from "next/server";
import { options } from "@/app/api/configAuth";
import { PledDataService } from "@/lib/pled-data-service";
import { getServerSession } from "next-auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(options);

    // For now, let's use session.user?.email as the identifier since id might not be available
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    await PledDataService.updateUserWallet(params.id, walletAddress);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving wallet address:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(options);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await PledDataService.updateUserWallet(params.id, null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing wallet address:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
