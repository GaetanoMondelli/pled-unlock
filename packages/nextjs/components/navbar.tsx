import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RainbowKitCustomConnectButton } from "./scaffold-eth/RainbowKitCustomConnectButton"
import { FaucetButton } from "./scaffold-eth/FaucetButton"
import { SettingsMenu } from "./layout/SettingsMenu"
import { signOut } from "next-auth/react";

export function Navbar() {
    return (
        <nav className="bg-white border-b border-gray-200 px-4 py-2.5 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex flex-wrap justify-between items-center">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center">
                        <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">Pled</span>
                    </Link>
                </div>
                <div className="flex items-center lg:order-2 gap-2">
                    {/* <Button variant="ghost" size="sm">
                        Log in
                    </Button>
                    <Button size="sm" className="ml-2">
                        Sign up
                    </Button> */}
                    <SettingsMenu />
                    <RainbowKitCustomConnectButton />
                    <FaucetButton />
                    <button
                        className="btn btn-sm btn-error ml-2"
                        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    )
}

