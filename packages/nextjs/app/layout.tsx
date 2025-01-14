import "@rainbow-me/rainbowkit/styles.css";
import { RowanEthAppWithProviders } from "~~/components/RowanEthProviders";
import { Sidebar } from "~~/components/sidebar";
import { Navbar } from "@/components/navbar"
import { Inter } from 'next/font/google'
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Smart Miner Dashboard",
  description: "Monitor and manage your smart miners",
});
const inter = Inter({ subsets: ["latin"] })

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      {/* <body>
        <ThemeProvider enableSystem>
          <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body> */}
      <body className={inter.className}>
        <CustomEthAppWithProviders>{children}</CustomEthAppWithProviders>
        {/* <div className="flex flex-col h-screen">
          <Navbar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">
            <RowanEthAppWithProviders>{children}</RowanEthAppWithProviders>
            </main>
          </div>
        </div> */}
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
