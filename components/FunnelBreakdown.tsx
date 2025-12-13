'use client';

interface FunnelStep {
    clicks: number;
    locationSelection: number;
}

interface FunnelBreakdownProps {
    data: {
        rent: FunnelStep;
        ownerOccupier: FunnelStep;
        investor: FunnelStep;
    };
}

function FunnelCategory({ title, data }: { title: string; data: FunnelStep }) {
    const conversionRate = data.clicks > 0 
        ? ((data.locationSelection / data.clicks) * 100).toFixed(1)
        : '0.0';
    
    const conversionWidth = data.clicks > 0 
        ? (data.locationSelection / data.clicks) * 100 
        : 0;

    return (
        <div className="mb-6 last:mb-0">
            <h4 className="font-heading text-sm text-secondary-black mb-2">{title}</h4>
            <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                    <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-primary-red">
                            {conversionRate}% Conversion
                        </span>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    {/* Step 1: Type Selection (Initial Clicks) */}
                    <div className="relative">
                        <div className="flex justify-between text-xs mb-1 text-text-muted">
                            <span>Type Selection</span>
                            <span>{data.clicks}</span>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-red-100">
                            <div style={{ width: '100%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-300"></div>
                        </div>
                    </div>

                    {/* Step 2: Location Selection */}
                    <div className="relative pl-4">
                        <div className="flex justify-between text-xs mb-1 text-text-muted">
                            <span>Location Selection</span>
                            <span>{data.locationSelection}</span>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-red-100">
                            <div style={{ width: `${conversionWidth}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-red"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function FunnelBreakdown({ data }: FunnelBreakdownProps) {
    const totalClicks = data.rent.clicks + data.ownerOccupier.clicks + data.investor.clicks;

    if (totalClicks === 0) {
        return (
            <div className="card p-6">
                <h3 className="font-heading text-lg text-secondary-black mb-4">Funnel Breakdown</h3>
                <div className="flex items-center justify-center h-64 text-text-muted font-body">
                    No funnel data available for this period
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <h3 className="font-heading text-lg text-secondary-black mb-4">Funnel Breakdown</h3>
            <FunnelCategory title="Rent (Tenant Path)" data={data.rent} />
            <FunnelCategory title="Owner Occupier (Sales Path)" data={data.ownerOccupier} />
            <FunnelCategory title="Investor (Sales Path)" data={data.investor} />
        </div>
    );
}
