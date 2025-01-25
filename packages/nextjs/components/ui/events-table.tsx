// Add these helper functions at the top
const getSourceBadgeStyle = (source: string) => {
  switch (source) {
    case 'manual':
      return 'bg-blue-100 text-blue-800';
    case 'action':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getSourceLabel = (event: any) => {
  // For events in the events list/table
  if (event.template?.source) return event.template.source;
  
  // For events in history
  if (event.source) return event.source;
  
  return 'received';
};

// In the expanded row content:
{isExpanded && (
  <tr>
    <td colSpan={4}>
      <div className="p-4 bg-gray-50">
        {/* Source Badge */}
        <div className="mb-3 flex items-center">
          <span className="text-sm font-medium mr-2">Source:</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${getSourceBadgeStyle(getSourceLabel(event))}`}>
            {getSourceLabel(event)}
          </span>
        </div>

        {/* Event Data */}
        <div className="mb-3">
          <span className="text-sm font-medium">Data:</span>
          <pre className="mt-1 text-sm bg-white p-2 rounded border">
            {JSON.stringify(event.template?.data || event.data, null, 2)}
          </pre>
        </div>

        {/* Show History for automated events */}
        {event.template?.source === 'action' && event.template.history && (
          <div className="mt-4">
            <span className="text-sm font-medium">Event History:</span>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs">Time</th>
                    <th className="px-2 py-1 text-left text-xs">Type</th>
                    <th className="px-2 py-1 text-left text-xs">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {event.template.history.events.map((historyEvent: any) => (
                    <tr key={historyEvent.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1 text-xs">
                        {new Date(historyEvent.timestamp).toLocaleString()}
                      </td>
                      <td className="px-2 py-1 text-xs">
                        {historyEvent.type}
                      </td>
                      <td className="px-2 py-1 text-xs">
                        {JSON.stringify(historyEvent.data)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </td>
  </tr>
)} 