import { NextResponse } from "next/server";
import { bucket } from "@/app/lib/firebase";
const filePath = "pled.json";
import { options, allowedUsernamesPasswords } from "@/app/api/configAuth";
import { getServerSession } from "next-auth";

export async function GET() {
  try {

    //  Uncomment this to authenticate with username and password
    
    // const session = await getServerSession(options);

    // // Check if there is a valid session (user is logged in)
    // if (!session) {
    //   console.log("Unauthorized");
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // const username = session.user?.name; // Assuming you store the username in the session
    // if (!username || !allowedUsernamesPasswords.has(username)) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Reference the file in Firebase Storage
    const file = bucket.file(filePath);

    // Download the file contents as a string
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
    let { index, item } = await request.json();

    // if id === tags, then update the description of the tag
    if (item.id === "tags") {
      console.log("Updating tag description");
      const file = bucket.file(filePath);
      const [fileContents] = await file.download();
      let data = JSON.parse(fileContents.toString());

      // update only the description of the tag

      const indexTagsId = data.findIndex(
        (tagsItem: any) => tagsItem.id === "tags"
      );

      // if item.name is not in the content object, add it
      if (indexTagsId === -1) {
        data.push({
          id: "tags",
          content: {
            [item.name]: item.content[item.description],
          },
        });
      } else {
        data[indexTagsId].content = {
          ...data[indexTagsId].content,
          ...item.content,
        };
      }

      await file.save(JSON.stringify(data, null, 2), {
        contentType: "application/json",
      });
      console.log("Tag description updated successfully3");

      return NextResponse.json({ message: "Item updated successfully!" });
    }

    if (!item.id) {
      return NextResponse.json({ error: "Invalid item" }, { status: 400 });
    }

    if (index) {
      // Reference the file in Firebase Storage
      const file = bucket.file(filePath);

      // Download the current data from the file
      const [fileContents] = await file.download();
      let data = JSON.parse(fileContents.toString());

      // Validate the input index
      if (typeof index !== "number" || index < 0 || index >= data.length) {
        return NextResponse.json({ error: "Invalid index" }, { status: 400 });
      }

      // Update the specific item in the array
      data[index] = { ...data[index], ...item };

      // Write the updated JSON back to the file in Firebase Storage
      await file.save(JSON.stringify(data, null, 2), {
        contentType: "application/json",
      });
      return NextResponse.json({ message: "Item updated successfully!" });
    } else {
      //  find the index of the item in the array with the same id

      const file = bucket.file(filePath);
      const [fileContents] = await file.download();
      let data = JSON.parse(fileContents.toString());

      const index = data.findIndex((newItem: any) => item.id === newItem.id);

      if (index === -1) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      // Update the specific item in the array
      data[index] = { ...data[index], ...item };

      // Write the updated JSON back to the file in Firebase Storage
      await file.save(JSON.stringify(data, null, 2), {
        contentType: "application/json",
      });
      return NextResponse.json({ message: "Item updated successfully!" });
    }
  } catch (error) {
    console.error("Error updating file in Firebase Storage:", error);
    return NextResponse.json(
      { error: "Failed to update the file in Firebase Storage." },
      { status: 500 }
    );
  }
}
