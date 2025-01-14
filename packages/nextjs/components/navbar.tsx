import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          {/* <Image src="/placeholder.svg" alt="PLED Logo" height={30} width={30} className="h-6 w-6" /> */}
          {/* <img src="/placeholder.svg?height=30&width=30" alt="PLED Logo" className="h-6 w-6" /> */}
          <span className="hidden font-bold sm:inline-block">PLED</span>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
        </nav>
      </div>
      <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
        <div className="w-full flex-1 md:w-auto md:flex-none">{/* Add search functionality here if needed */}</div>
        <nav className="flex items-center">
          <Button variant="ghost" className="mr-2">
            Sign In
          </Button>
          <Button>Get Started</Button>
        </nav>
      </div>
    </header>
  );
}
