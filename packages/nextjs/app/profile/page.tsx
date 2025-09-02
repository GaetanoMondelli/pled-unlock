"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface UserProfile {
  firstName: string;
  lastName: string;
  walletAddress?: string;
}

interface ExtendedSession {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function ProfilePage() {
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Load user profile from Firebase
  const loadUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/users/${session.user.id}`);
      if (response.ok) {
        const userData = await response.json();
        const newProfile = {
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          walletAddress: userData.walletAddress || "",
        };
        setProfile(newProfile);

        // Auto-enable edit mode if profile is incomplete
        if (!newProfile.firstName || !newProfile.lastName) {
          setIsEditing(true);
        }
      } else if (response.status === 404) {
        // User doesn't exist yet, enable edit mode
        setIsEditing(true);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // On error, enable edit mode to allow profile creation
      setIsEditing(true);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      loadUserProfile();
    }
  }, [session?.user?.id, loadUserProfile]);

  // Save wallet address to Firebase
  const saveWalletAddress = useCallback(
    async (walletAddress: string) => {
      if (!session?.user?.id) return;

      try {
        await fetch(`/api/users/${session.user.id}/wallet`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ walletAddress }),
        });
      } catch (error) {
        console.error("Error saving wallet address:", error);
      }
    },
    [session?.user?.id],
  );

  // Update wallet address when wallet connection changes
  useEffect(() => {
    if (isConnected && address && address !== profile.walletAddress) {
      setProfile(prev => ({ ...prev, walletAddress: address }));
      saveWalletAddress(address);
    }
  }, [isConnected, address, profile.walletAddress, saveWalletAddress]);

  // Save individual field
  const saveField = async (field: string, value: string) => {
    if (!session?.user?.id) return;

    setIsSaving(true);
    try {
      const updatedProfile = { ...profile, [field]: value };
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProfile),
      });

      if (response.ok) {
        setProfile(updatedProfile);
        setEditingField(null);
        alert(`${field === "firstName" ? "First name" : "Last name"} updated successfully`);
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving field:", error);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!session?.user?.id) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        alert("Profile updated successfully");
        setIsEditing(false);
      } else {
        throw new Error("Failed to save profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectWallet = () => {
    disconnect();
    setProfile(prev => ({ ...prev, walletAddress: undefined }));
    // Also remove from Firebase
    if (session?.user?.id) {
      fetch(`/api/users/${session.user.id}/wallet`, {
        method: "DELETE",
      });
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      {/* Personal Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditing ? (
            // Display mode with inline editing
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  {editingField === "firstName" ? (
                    <div className="flex gap-2">
                      <Input
                        value={profile.firstName}
                        onChange={e => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter first name"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            saveField("firstName", profile.firstName);
                          } else if (e.key === "Escape") {
                            setEditingField(null);
                            loadUserProfile();
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => saveField("firstName", profile.firstName)} disabled={isSaving}>
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingField(null);
                          loadUserProfile();
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between group"
                      onClick={() => setEditingField("firstName")}
                    >
                      <span className={profile.firstName ? "text-gray-900" : "text-gray-400 italic"}>
                        {profile.firstName || "Click to add first name"}
                      </span>
                      <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                        ✏️ Edit
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Last Name</Label>
                  {editingField === "lastName" ? (
                    <div className="flex gap-2">
                      <Input
                        value={profile.lastName}
                        onChange={e => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter last name"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            saveField("lastName", profile.lastName);
                          } else if (e.key === "Escape") {
                            setEditingField(null);
                            loadUserProfile();
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => saveField("lastName", profile.lastName)} disabled={isSaving}>
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingField(null);
                          loadUserProfile();
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between group"
                      onClick={() => setEditingField("lastName")}
                    >
                      <span className={profile.lastName ? "text-gray-900" : "text-gray-400 italic"}>
                        {profile.lastName || "Click to add last name"}
                      </span>
                      <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                        ✏️ Edit
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Username</Label>
                <div className="p-3 border rounded-lg bg-gray-100">{session.user?.name || ""}</div>
              </div>

              <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                {!profile.firstName || !profile.lastName ? "Complete Profile" : "Edit All Fields"}
              </Button>
            </div>
          ) : (
            // Edit mode
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={e => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={e => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div>
                <Label>Username</Label>
                <Input value={session.user?.name || ""} disabled />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveProfile} disabled={isSaving} className="flex-1">
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Connection</CardTitle>
          <CardDescription>Connect your wallet to interact with blockchain features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected && address ? (
            <div className="space-y-4">
              <div>
                <Label>Connected Wallet</Label>
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="font-mono text-sm">{address}</span>
                  <span className="text-green-600 text-sm">✓ Connected</span>
                </div>
              </div>
              <Button onClick={handleDisconnectWallet} variant="outline" className="w-full">
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">No wallet connected</p>
              <div className="grid gap-2">
                {connectors.map(connector => (
                  <Button
                    key={connector.id}
                    onClick={() => connect({ connector })}
                    variant="outline"
                    className="w-full"
                  >
                    Connect {connector.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
