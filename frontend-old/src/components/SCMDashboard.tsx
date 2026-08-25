import { Package, Truck, CheckSquare, AlertCircle, Inbox, ArrowRight } from 'lucide-react';
import { Card, StatCard } from './SharedUI';

export const SCMDashboard = () => {
  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Supply Chain Management</h2>
          <p className="text-sm text-gray-500 mt-1">Overview of logistics, procurements, and inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard title="Active Procurements" value="14" icon={Package} colorClass="bg-blue-50 text-blue-600" subtitle="Materials currently in transit" />
        <StatCard title="Delayed Shipments" value="2" icon={Truck} colorClass="bg-red-50 text-red-600" subtitle="Requires immediate attention" />
        <StatCard title="Pending Approvals" value="5" icon={CheckSquare} colorClass="bg-amber-50 text-amber-600" subtitle="Purchase Requests" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-3">Recent Logistics Alerts</h3>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-0 hover:border-amber-200 transition-colors group cursor-pointer">
                <div className="p-5 flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-500 rounded-xl group-hover:bg-amber-100 transition-colors border border-amber-100/50">
                    <AlertCircle className="w-5 h-5"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-bold text-gray-900 group-hover:text-amber-700 transition-colors">Vendor Shipment Delayed (API-{i}00)</h4>
                    <p className="text-[13px] text-gray-500 mt-1">Expected 2 days ago. Vendor contacted for expedited shipping.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors mt-1" />
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        <div>
           <h3 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-3">R&D Material Requests</h3>
           <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center bg-gray-50/50">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 border border-gray-200">
               <Inbox className="w-8 h-8 text-gray-400"/>
             </div>
             <h4 className="font-bold text-gray-900 mb-1">Inbox Empty</h4>
             <p className="text-sm text-gray-500">No urgent material requests from R&D.</p>
           </Card>
        </div>
      </div>
    </div>
  );
};
