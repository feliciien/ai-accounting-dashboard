import React, { createContext, useContext, useState } from 'react';

export interface CashflowData {
  date: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}

interface ChartData {
  name: string;
  income: number;
  expense: number;
}

interface FinancialContextType {
  rawData: CashflowData[];
  chartData: ChartData[];
  setFinancialData: (data: CashflowData[]) => void;
  updateRawData: (data: CashflowData[]) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawData, setRawData] = useState<CashflowData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const processData = (data: CashflowData[]) => {
    setRawData(data);
    
    // Group data by month and aggregate income/expenses
    const monthlyData = data.reduce((acc: { [key: string]: ChartData }, curr) => {
      const month = new Date(curr.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      
      if (!acc[month]) {
        acc[month] = { name: month, income: 0, expense: 0 };
      }
      
      if (curr.type === 'income') {
        acc[month].income += curr.amount;
      } else {
        acc[month].expense += curr.amount;
      }
      
      return acc;
    }, {});

    // Convert to array and sort by date
    const processedData = Object.values(monthlyData)
      .sort((a, b) => {
        const [aMonth, aYear] = a.name.split(' ');
        const [bMonth, bYear] = b.name.split(' ');
        const aDate = new Date(`${aMonth} 1, ${aYear}`);
        const bDate = new Date(`${bMonth} 1, ${bYear}`);
        return aDate.getTime() - bDate.getTime();
      });

    setChartData(processedData);
  };

  // Function to update raw data without processing
  const updateRawData = (data: CashflowData[]) => {
    setRawData(data);
  };

  return (
    <FinancialContext.Provider
      value={{
        rawData,
        chartData,
        setFinancialData: processData,
        updateRawData,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};