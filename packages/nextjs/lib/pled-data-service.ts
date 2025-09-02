import { promises as fs } from "fs";
import path from "path";

interface UserData {
  firstName: string;
  lastName: string;
  walletAddress?: string;
  updatedAt: string;
}

interface PledData {
  procedureTemplates: any[];
  procedures?: any;
  users?: Record<string, UserData>;
}

const PLED_FILE_PATH = path.join(process.cwd(), "public", "pled.json");

export class PledDataService {
  private static async readPledData(): Promise<PledData> {
    try {
      const fileContent = await fs.readFile(PLED_FILE_PATH, "utf-8");
      return JSON.parse(fileContent);
    } catch (error) {
      console.error("Error reading pled.json:", error);
      throw new Error("Failed to read data file");
    }
  }

  private static async writePledData(data: PledData): Promise<void> {
    try {
      await fs.writeFile(PLED_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing pled.json:", error);
      throw new Error("Failed to write data file");
    }
  }

  static async getUser(userId: string): Promise<UserData | null> {
    const data = await this.readPledData();

    if (!data.users) {
      return null;
    }

    return data.users[userId] || null;
  }

  static async saveUser(userId: string, userData: Partial<UserData>): Promise<UserData> {
    const data = await this.readPledData();

    // Initialize users section if it doesn't exist
    if (!data.users) {
      data.users = {};
    }

    // Get existing user data or create new
    const existingUser = data.users[userId] || {
      firstName: "",
      lastName: "",
      updatedAt: new Date().toISOString(),
    };

    // Update user data
    const updatedUser: UserData = {
      ...existingUser,
      ...userData,
      updatedAt: new Date().toISOString(),
    };

    data.users[userId] = updatedUser;

    await this.writePledData(data);

    return updatedUser;
  }

  static async updateUserWallet(userId: string, walletAddress: string | null): Promise<void> {
    const data = await this.readPledData();

    if (!data.users) {
      data.users = {};
    }

    if (!data.users[userId]) {
      data.users[userId] = {
        firstName: "",
        lastName: "",
        updatedAt: new Date().toISOString(),
      };
    }

    if (walletAddress) {
      data.users[userId].walletAddress = walletAddress;
    } else {
      delete data.users[userId].walletAddress;
    }

    data.users[userId].updatedAt = new Date().toISOString();

    await this.writePledData(data);
  }
}
