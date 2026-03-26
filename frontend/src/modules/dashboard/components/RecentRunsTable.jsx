import { formatDate } from '../../../utils/dateFormatter';
import { getStatusColor } from '../../../utils/statusColors';

export default function RecentRunsTable({ runs }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-400">No recent task runs</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Recent Task Runs</h2>
      </div>
      
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Scheduler
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Run At
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-900">
                {run.schedule?.name || 'Manual'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {run.task?.name || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDate(run.started_at)}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                  {run.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
