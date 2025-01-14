import "@rainbow-me/rainbowkit/styles.css";
import { RowanEthAppWithProviders } from "~~/components/RowanEthProviders";
import { Sidebar } from "~~/components/sidebar";
import { Navbar } from "@/components/navbar"
import { Inter } from 'next/font/google'
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";
import { CustomEthAppWithProviders } from "~~/components/CustomEthProvider";

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
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
