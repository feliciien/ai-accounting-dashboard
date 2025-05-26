import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';

interface BusinessProfile {
  type: string;
  industry: string;
}

interface Benchmark {
  category: string;
  average: number;
  difference: number;
}

// Industry benchmarks based on real-world data
const INDUSTRY_BENCHMARKS: { [key: string]: { [key: string]: number } } = {
  'SaaS': {
    'software': 0.15,
    'marketing': 0.25,
    'r&d': 0.15,
    'sales': 0.20,
    'operations': 0.15,
    'infrastructure': 0.10
  },
  'Technology': {
    'software': 0.12,
    'marketing': 0.20,
    'r&d': 0.18,
    'sales': 0.22,
    'operations': 0.15,
    'infrastructure': 0.13
  }
};

const OptimizationRecommendations: React.FC = () => {
  const { rawData } = useFinancial();
  const [selectedTab, setSelectedTab] = useState<'benchmarks' | 'recommendations'>('benchmarks');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Business profile based on actual data patterns
  const businessProfile: BusinessProfile = {
    type: 'SaaS',
    industry: 'Technology'
  };

  // Track recurring expenses
  const findRecurringExpenses = () => {
    const monthlyExpenses = new Map<string, number[]>();
    
    // Group expenses by category and month
    rawData
      .filter(item => item.type === 'expense')
      .forEach(item => {
        const month = new Date(item.date).getMonth();
        if (!monthlyExpenses.has(item.category)) {
          monthlyExpenses.set(item.category, new Array(12).fill(0));
        }
        monthlyExpenses.get(item.category)![month] += Math.abs(item.amount);
      });

    // Find categories with consistent monthly spending
    const recurringExpenses: { category: string, monthlyAvg: number }[] = [];
    monthlyExpenses.forEach((amounts, category) => {
      const nonZeroMonths = amounts.filter(amount => amount > 0).length;
      if (nonZeroMonths >= 3) { // Consider it recurring if it appears in at least 3 months
        const monthlyAvg = amounts.reduce((sum, amount) => sum + amount, 0) / nonZeroMonths;
        recurringExpenses.push({ category, monthlyAvg });
      }
    });

    return recurringExpenses;
  };

  const calculateBenchmarks = (): Benchmark[] => {
    const totalIncome = rawData
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0);

    const categoryExpenses = rawData
      .filter(item => item.type === 'expense')
      .reduce((acc, item) => {
        const normalizedCategory = item.category.toLowerCase();
        acc[normalizedCategory] = (acc[normalizedCategory] || 0) + Math.abs(item.amount);
        return acc;
      }, {} as { [key: string]: number });
      
    const benchmarks: Benchmark[] = [];
    
    if (totalIncome > 0) {
      Object.entries(categoryExpenses).forEach(([category, amount]) => {
        const industryAvg = INDUSTRY_BENCHMARKS[businessProfile.type]?.[category] || 0.15;
        const actualPercentage = amount / totalIncome;
        const difference = ((actualPercentage - industryAvg) * 100);
        
        benchmarks.push({
          category,
          average: industryAvg * 100,
          difference
        });
      });

      // Sort benchmarks by difference (highest variance first)
      benchmarks.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
    }
    
    return benchmarks;
  };
  
  const generateRecommendations = (): string[] => {
    const benchmarks = calculateBenchmarks();
    const recurringExpenses = findRecurringExpenses();
    const recommendations: string[] = [];

    // Analyze benchmark variances
    benchmarks.forEach(benchmark => {
      if (benchmark.difference > 5) {
        recommendations.push(
          `Your ${benchmark.category} spend is ${benchmark.difference.toFixed(1)}% above industry average for ${businessProfile.type} companies. Consider optimizing this expense category.`
        );
      }
    });

    // Analyze recurring expenses
    const softwareSubscriptions = recurringExpenses
      .filter(exp => exp.category.toLowerCase().includes('software') || 
                     exp.category.toLowerCase().includes('subscription'));

    if (softwareSubscriptions.length > 0) {
      const totalMonthly = softwareSubscriptions
        .reduce((sum, exp) => sum + exp.monthlyAvg, 0);
      recommendations.push(
        `You have ${softwareSubscriptions.length} recurring software/subscription expenses totaling $${totalMonthly.toFixed(2)}/month. Review these subscriptions for unused or redundant services.`
      );
    }

    // Add actionable recommendations based on real data
    const highestBenchmarkDiff = benchmarks[0];
    if (highestBenchmarkDiff && highestBenchmarkDiff.difference > 10) {
      recommendations.push(
        `Priority Focus: ${highestBenchmarkDiff.category} spending shows the highest variance (${highestBenchmarkDiff.difference.toFixed(1)}% above average). Consider immediate cost optimization in this area.`
      );
    }

    // Add general optimization strategies
    recommendations.push(
      'Consider renegotiating vendor contracts for better terms, especially for high-spend categories.',
      'Implement automated expense tracking and regular reviews to identify ongoing cost-saving opportunities.',
      'Set up spend alerts for categories exceeding industry benchmarks to maintain better cost control.'
    );

    return recommendations;
  };

  const benchmarks = calculateBenchmarks();
  const recommendations = generateRecommendations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Industry Benchmarks & Optimization</h2>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">{businessProfile.type}</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{businessProfile.industry}</span>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setSelectedTab('benchmarks')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedTab === 'benchmarks' 
              ? 'border-primary-500 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Benchmarks
        </button>
        <button
          onClick={() => setSelectedTab('recommendations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedTab === 'recommendations' 
              ? 'border-primary-500 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Recommendations
        </button>
      </div>
      
      {calculateBenchmarks().length > 0 ? (
        <div className="pt-4">
          {selectedTab === 'benchmarks' && (
            <div className="space-y-6">
              {benchmarks.map((benchmark, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg transition-all duration-200 ${
                    selectedCategory === benchmark.category 
                      ? 'bg-gray-50 border-gray-200 shadow-sm' 
                      : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                  onClick={() => setSelectedCategory(
                    selectedCategory === benchmark.category ? null : benchmark.category
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium capitalize text-gray-900">{benchmark.category}</span>
                      {benchmark.difference > 5 && (
                        <span className="px-2 py-0.5 bg-danger-100 text-danger-700 rounded-full text-xs">High Spend</span>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      benchmark.difference < 0 
                        ? 'bg-success-100 text-success-800' 
                        : benchmark.difference > 10 
                          ? 'bg-danger-100 text-danger-800' 
                          : 'bg-warning-100 text-warning-800'
                    }`}>
                      {benchmark.difference < 0 ? 'Under' : 'Over'} by {Math.abs(benchmark.difference).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                        benchmark.difference < 0 
                          ? 'bg-success-500' 
                          : benchmark.difference > 10 
                            ? 'bg-danger-500' 
                            : 'bg-warning-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.abs(benchmark.difference))}%` }}
                    />
                  </div>
                  
                  {selectedCategory === benchmark.category && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Detailed Analysis</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>Industry Average: {benchmark.average.toFixed(1)}% of revenue</p>
                        <p>Your Spend: {(benchmark.average + benchmark.difference).toFixed(1)}% of revenue</p>
                        <p>Difference: {benchmark.difference > 0 ? '+' : ''}{benchmark.difference.toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {selectedTab === 'recommendations' && (
            <div className="space-y-4">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-200 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-primary-100 text-primary-600 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 px-4">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-4 text-gray-500 font-medium">Upload your financial data to see industry benchmarks</p>
          <p className="mt-2 text-sm text-gray-400">We'll analyze your data and provide personalized recommendations</p>
        </div>
      )}
    </div>
  );
};

export default OptimizationRecommendations;