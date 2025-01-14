// import Link from "next/link"
// import { Home, Wallet, BadgeIcon as Certificate } from 'lucide-react'

// export function Sidebar() {
//   return (
//     <div className="w-64 bg-gray-100 p-4">
//       <nav className="space-y-2">
//         <Link href="/" className="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded">
//           <Home size={20} />
//           <span>Procedures</span>
//         </Link>
//         <Link href="/events" className="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded">
//           <Wallet size={20} />
//           <span>Events</span>
//         </Link>
//         <Link href="/messages" className="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded">
//           <Certificate size={20} />
//           <span>Messages</span>
//         </Link>
//         <Link href="/actions" className="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded">
//           <Certificate size={20} />
//           <span>Actions</span>
//         </Link>
//       </nav>
//     </div>
//   )
// }


import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const procedures = [
  { id: 1, name: "Customer Onboarding" },
  { id: 2, name: "Order Fulfillment" },
  { id: 3, name: "Employee Hiring" },
]

export default function Sidebar() {
  return (
    <div className="w-64 border-r bg-background">
      <ScrollArea className="h-full py-2">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold">Procedures</h2>
          <div className="space-y-1">
            {procedures.map((procedure) => (
              <Button
                key={procedure.id}
                variant="ghost"
                className="w-full justify-start"
              >
                {procedure.name}
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

