import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import { useFinancial } from '../context/FinancialContext';
import { generateForecast } from '../lib/forecast';

interface ForecastData {
  name: string;
  income: number;
  expense: number;
  predicted?: boolean;
}

const CashFlowForecast: React.FC = () => {
  const { chartData, rawData } = useFinancial();
  const [forecastData, setForecastData] = React.useState<ForecastData[]>([]);
  const [viewMode, setViewMode] = React.useState<'line' | 'area' | 'bar'>('area');
  const [showNet, setShowNet] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (chartData.length > 0) {
      const forecast = generateForecast(chartData, 3);
      setForecastData(forecast);
    }
  }, [chartData]);

  // Calculate net cash flow for each month
  const dataWithNet = forecastData.map(item => ({
    ...item,
    net: item.income - item.expense
  }));

  // Calculate totals for the summary
  const totalIncome = rawData.filter(d => d.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = Math.abs(rawData.filter(d => d.type === 'expense').reduce((sum, item) => sum + item.amount, 0));
  const netProfit = totalIncome - totalExpense;

  // Calculate forecast totals (last 3 months if they are predictions)
  const forecastMonths = forecastData.filter(d => d.predicted);
  const forecastIncome = forecastMonths.reduce((sum, item) => sum + item.income, 0);
  const forecastExpense = forecastMonths.reduce((sum, item) => sum + item.expense, 0);
  const forecastNet = forecastIncome - forecastExpense;

  const renderChart = () => {
    switch (viewMode) {
      case 'line':
        return (
          <LineChart data={dataWithNet}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={renderTooltip} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="income" 
              name="Income"
              stroke="#22c55e" 
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              strokeDasharray={forecastData.some(d => d.predicted) ? '5 5' : undefined}
              animationDuration={1000}
            />
            <Line 
              type="monotone" 
              dataKey="expense" 
              name="Expense"
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              strokeDasharray={forecastData.some(d => d.predicted) ? '5 5' : undefined}
              animationDuration={1000}
            />
            {showNet && (
              <Line 
                type="monotone" 
                dataKey="net" 
                name="Net Cash Flow"
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                strokeDasharray={forecastData.some(d => d.predicted) ? '5 5' : undefined}
                animationDuration={1000}
              />
            )}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={dataWithNet}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={renderTooltip} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="income" 
              name="Income"
              stroke="#22c55e" 
              fill="url(#incomeGradient)" 
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              strokeDasharray={forecastData.some(d => d.predicted) ? '5 5' : undefined}
              animationDuration={1000}
            />
            <Area 
              type="monotone" 
              dataKey="expense" 
              name="Expense"
              stroke="#ef4444" 
              fill="url(#expenseGradient)" 
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              strokeDasharray={forecastData.some(d => d.predicted) ? '5 5' : undefined}
              animationDuration={1000}
            />
            {showNet && (
              <Area 
                type="monotone" 
                dataKey="net" 
                name="Net Cash Flow"
                stroke="#3b82f6" 
                fill="url(#netGradient)" 
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                strokeDasharray={forecastData.some(d => d.predicted) ? '5 5' : undefined}
                animationDuration={1000}
              />
            )}
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart data={dataWithNet}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={renderTooltip} />
            <Legend />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Bar 
              dataKey="income" 
              name="Income"
              fill="#22c55e" 
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            >
              {dataWithNet.map((entry, index) => (
                <Cell 
                  key={`income-${index}`} 
                  fillOpacity={entry.predicted ? 0.6 : 1} 
                  strokeDasharray={entry.predicted ? '3 3' : undefined}
                />
              ))}
            </Bar>
            <Bar 
              dataKey="expense" 
              name="Expense"
              fill="#ef4444" 
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            >
              {dataWithNet.map((entry, index) => (
                <Cell 
                  key={`expense-${index}`} 
                  fillOpacity={entry.predicted ? 0.6 : 1} 
                  strokeDasharray={entry.predicted ? '3 3' : undefined}
                />
              ))}
            </Bar>
            {showNet && (
              <Bar 
                dataKey="net" 
                name="Net Cash Flow"
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              >
                {dataWithNet.map((entry, index) => (
                  <Cell 
                    key={`net-${index}`} 
                    fillOpacity={entry.predicted ? 0.6 : 1} 
                    strokeDasharray={entry.predicted ? '3 3' : undefined}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        );
      default:
        return <div></div>; // Return empty div instead of null
    }
  };

  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">
            {data.name} {data.predicted ? '(Forecast)' : ''}
          </p>
          <div className="space-y-1">
            <p className="text-success-600 flex justify-between">
              <span>Income:</span>
              <span className="font-medium ml-4">${data.income.toLocaleString()}</span>
            </p>
            <p className="text-danger-600 flex justify-between">
              <span>Expense:</span>
              <span className="font-medium ml-4">${data.expense.toLocaleString()}</span>
            </p>
            <div className="border-t border-gray-100 mt-2 pt-2">
              <p className="text-primary-600 flex justify-between font-medium">
                <span>Net:</span>
                <span>${(data.income - data.expense).toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-4 md:p-6 border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Cash Flow with 3-Month Forecast</h2>
        <div className="flex items-center mt-3 md:mt-0 space-x-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('line')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'line' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Line
            </button>
            <button
              onClick={() => setViewMode('area')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'area' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Area
            </button>
            <button
              onClick={() => setViewMode('bar')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'bar' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Bar
            </button>
          </div>
          <button
            onClick={() => setShowNet(!showNet)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${showNet ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:text-gray-800'}`}
          >
            {showNet ? 'Hide Net' : 'Show Net'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">YTD Income</h3>
          <p className="text-2xl font-semibold text-success-600">${totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">YTD Expenses</h3>
          <p className="text-2xl font-semibold text-danger-600">${totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">YTD Net Profit</h3>
          <p className={`text-2xl font-semibold ${netProfit >= 0 ? 'text-primary-600' : 'text-danger-600'}`}>
            ${netProfit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Forecast Summary */}
      {forecastMonths.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-6">
          <h3 className="text-sm font-medium text-blue-700 mb-2">3-Month Forecast Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-success-500 mr-2"></div>
              <span className="text-gray-600 mr-2">Projected Income:</span>
              <span className="font-medium text-success-600">${forecastIncome.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-danger-500 mr-2"></div>
              <span className="text-gray-600 mr-2">Projected Expenses:</span>
              <span className="font-medium text-danger-600">${forecastExpense.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-primary-500 mr-2"></div>
              <span className="text-gray-600 mr-2">Projected Net:</span>
              <span className={`font-medium ${forecastNet >= 0 ? 'text-primary-600' : 'text-danger-600'}`}>
                ${forecastNet.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-[300px] sm:h-[350px] md:h-[400px]">
        {forecastData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {/* Render only one chart based on viewMode */}
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">No data available. Please upload financial data.</p>
          </div>
        )}
      </div>

      {/* Legend for forecast */}
      {forecastData.some(d => d.predicted) && (
        <div className="mt-4 flex items-center justify-end">
          <div className="flex items-center text-xs text-gray-500">
            <span className="inline-block w-8 h-0.5 bg-gray-400 mr-2 border-0 border-dashed border-gray-400"></span>
            <span>Forecast data</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowForecast;