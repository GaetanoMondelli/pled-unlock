import "@rainbow-me/rainbowkit/styles.css";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";
import './globals.css'
import { Inter } from 'next/font/google'
import { Navbar } from './components/navbar'
import { AppSidebar } from './components/sidebar'
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Contract State Machine',
  description: 'A PDF contract template with state machine visualization',
}
const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>

      <SidebarProvider>
          <div className="flex h-screen overflow-hidden">
            <AppSidebar />
            <div className="flex-1 overflow-auto">
              <Navbar />
              <SidebarInset>
              <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>

              </SidebarInset>
            </div>
          </div>
        </SidebarProvider>
      
      </body>
    </html>
  );
};

export default ScaffoldEthApp;



