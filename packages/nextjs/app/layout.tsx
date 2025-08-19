import { Inter } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import { CustomEthAppWithProviders } from "~~/components/CustomEthProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "PLED — Practical Ledger Platform",
  description: "Model, automate, and audit business procedures on-chain.",
});
const inter = Inter({ subsets: ["latin"] });

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background`}>
        <CustomEthAppWithProviders>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <footer className="bg-black text-white py-6 text-center text-sm">PLED © 2024</footer>
          </div>
        </CustomEthAppWithProviders>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
