import React from 'react';

const PayPalAnalyticsSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Volume and Cash Flow Chart Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="h-4 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-[300px] bg-gray-100 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Type Distribution Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-[300px] bg-gray-100 rounded-lg" />
        </div>

        {/* Hourly Transaction Pattern Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="h-4 w-56 bg-gray-200 rounded mb-4" />
          <div className="h-[300px] bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default PayPalAnalyticsSkeleton;