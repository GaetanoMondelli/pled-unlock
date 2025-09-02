import { NextRequest, NextResponse } from "next/server";
import { options } from "@/app/api/configAuth";
import { PledDataService } from "@/lib/pled-data-service";
import { getServerSession } from "next-auth";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(options);

    if (!session || session.user?.id !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await PledDataService.getUser(params.id);

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(options);

    console.log("Session:", session);
    console.log("Params ID:", params.id);

    if (!session || session.user?.id !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Request body:", body);
    const { firstName, lastName, walletAddress } = body;

    // Allow empty strings but not undefined/null for names
    if (firstName === undefined || lastName === undefined) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    const updateData = {
      firstName: firstName || "",
      lastName: lastName || "",
      ...(walletAddress !== undefined && { walletAddress }),
    };

    console.log("Update data:", updateData);

    const savedUser = await PledDataService.saveUser(params.id, updateData);

    console.log("Successfully updated user");
    return NextResponse.json({ success: true, data: savedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
