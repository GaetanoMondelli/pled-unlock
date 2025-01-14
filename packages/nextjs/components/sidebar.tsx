import Link from "next/link"
import { Home, Wallet, BadgeIcon as Certificate } from 'lucide-react'

export function Sidebar() {
  return (
    <div className="w-64 bg-gray-100 p-4">
      <nav className="space-y-2">
        <Link href="/" className="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded">
          <Home size={20} />
          <span>Procedures</span>
        </Link>
        <Link href="/events" className="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded">
          <Wallet size={20} />
          <span>Events</span>
        </Link>
        <Link href="/messages" className="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded">
          <Certificate size={20} />
          <span>Messages</span>
        </Link>
        <Link href="/actions" className="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded">
          <Certificate size={20} />
          <span>Actions</span>
        </Link>
      </nav>
    </div>
  )
}

