import { NextResponse } from "next/server";
import { bucket } from "@/app/lib/firebase";
const filePath = "pled.json";


export async function GET() {
  try {
    const file = bucket.file(filePath);
    const [fileContents] = await file.download();
    const data = JSON.parse(fileContents.toString());
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching data from Firebase Storage:", error);
    return NextResponse.json(
      { error: "Failed to read the file from Firebase Storage." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { newEvent } = await request.json();

    if (!newEvent || !newEvent.date || !newEvent.title || !newEvent.content) {
      return NextResponse.json(
        { error: "Invalid event data" },
        { status: 400 }
      );
    }

    // Reference the file in Firebase Storage
    const file = bucket.file(filePath);

    const [fileContents] = await file.download();
    let data = JSON.parse(fileContents.toString());

    const tagsIndex = data.findIndex((item: any) => item.id === "tags");
    const tagsObject = data[tagsIndex];
    data = data.filter((item: any) => item.id !== "tags");
    const parseDate = (dateStr: string, timeStr: string | null) => {
      const time = timeStr ? timeStr : "00:00:00";
      return new Date(`${dateStr} ${time}`);
    };
    const newEventDate = parseDate(newEvent.date, newEvent.time);
    let inserted = false;
    for (let i = 0; i < data.length; i++) {
      const existingEventDate = parseDate(data[i].date, data[i].time);
      if (newEventDate < existingEventDate) {
        data.splice(i, 0, newEvent); // Insert at the correct position
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      data.push(newEvent);
    }

    data.forEach((event: any, index: number) => {
      event.id = index + 1; // IDs start from 1 and increase sequentially
    });

    data.push(tagsObject);

    await file.save(JSON.stringify(data, null, 2), {
      contentType: "application/json",
    });

    return NextResponse.json({
      message: "New event added and IDs reassigned successfully!",
      newEvent,
    });
  } catch (error) {
    console.error("Error updating file in Firebase Storage:", error);
    return NextResponse.json(
      { error: "Failed to update the file in Firebase Storage." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json();

    if (action !== 'update') {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get the current file
    const file = bucket.file(filePath);
    
    // Save the updated data
    await file.save(JSON.stringify(data, null, 2), {
      contentType: "application/json",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating file in Firebase Storage:", error);
    return NextResponse.json(
      { error: "Failed to update the file in Firebase Storage." },
      { status: 500 }
    );
  }
}
