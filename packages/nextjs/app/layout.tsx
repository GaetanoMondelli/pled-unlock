import "@rainbow-me/rainbowkit/styles.css";
import { CustomEthAppWithProviders } from "~~/components/CustomEthProvider";
import Sidebar from "@/components/sidebar";
import { Navbar } from "@/components/navbar"
import { Inter } from 'next/font/google'
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Pled - Practical ledger platform",
  description: "Monitor and manage your procedures",
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
      <body className={`${inter.className} min-h-screen bg-background`}>
        <CustomEthAppWithProviders>{children}</CustomEthAppWithProviders>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
