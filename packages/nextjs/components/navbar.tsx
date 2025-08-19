import Link from "next/link";
import { SettingsMenu } from "./layout/SettingsMenu";
import { FaucetButton } from "./scaffold-eth/FaucetButton";
import { RainbowKitCustomConnectButton } from "./scaffold-eth/RainbowKitCustomConnectButton";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";

export function Navbar() {
  const { status } = useSession();
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">Pled</span>
          </Link>
        </div>
        <div className="flex items-center lg:order-2 gap-2">
          <Link href="/architecture">
            <Button variant="ghost" size="sm">
              Architecture
            </Button>
          </Link>

          {status === "authenticated" ? (
            <>
              <Link href="/procedures">
                <Button variant="ghost" size="sm">
                  Procedures
                </Button>
              </Link>
              <SettingsMenu />
              <RainbowKitCustomConnectButton />
              <FaucetButton />
              <button className="btn btn-sm btn-error ml-2" onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
                Logout
              </button>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button size="sm">Log in</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
