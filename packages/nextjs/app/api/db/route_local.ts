import { NextResponse } from "next/server";
import { bucket } from "@/app/lib/firebase";
const filePath = "pled.json";
import fs from "fs";

export async function GET() {
  try {
    // Reference the file in Firebase Storage
    //   const file = bucket.file(filePath);

    //   // Download the file contents as a string
    //   const [fileContents] = await file.download();
    //   const data = JSON.parse(fileContents.toString());

    //   return NextResponse.json(data);
    // } catch (error) {
    //   console.error('Error fetching data from Firebase Storage:', error);
    //   return NextResponse.json({ error: 'Failed to read the file from Firebase Storage.' }, { status: 500 });
    // }
    const file = await fs.readFileSync("data/timeline.json");
    const text = file.toString("utf-8");
    const data = await JSON.parse(text);
    return NextResponse.json(data);
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "error reading timeline" });
  }
}

export async function POST(request: Request) {
  try {
    const { index, item } = await request.json();
    const file = await fs.readFileSync("data/timeline.json");
    const text = file.toString("utf-8");
    const data = await JSON.parse(text);
    data[index] = { ...data[index], ...item };
    fs.writeFileSync("data/timeline.json", JSON.stringify(data, null, 2));
    NextResponse.json(item, index);
  } catch (error) {
    NextResponse.json({ error });
  }

  // try {
  //   const { index, item } = await request.json();

  //   // Reference the file in Firebase Storage
  //   const file = bucket.file(filePath);

  //   // Download the current data from the file
  //   const [fileContents] = await file.download();
  //   let data = JSON.parse(fileContents.toString());

  //   // Validate the input index
  //   if (typeof index !== "number" || index < 0 || index >= data.length) {
  //     return NextResponse.json({ error: "Invalid index" }, { status: 400 });
  //   }

  //   // Update the specific item in the array
  //   data[index] = { ...data[index], ...item };

  //   // Write the updated JSON back to the file in Firebase Storage
  //   await file.save(JSON.stringify(data, null, 2), {
  //     contentType: "application/json",
  //   });

  //   return NextResponse.json({ message: "Item updated successfully!" });
  // } catch (error) {
  //   console.error("Error updating file in Firebase Storage:", error);
  //   return NextResponse.json(
  //     { error: "Failed to update the file in Firebase Storage." },
  //     { status: 500 }
  //   );
  // }
}
