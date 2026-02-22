/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Plus, 
  Trash2, 
  Wallet, 
  TrendingDown, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { chartOptions } from './constants';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export default function App() {
  // Persistence: Load from localStorage
  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem('burn_rate_budget');
    return saved ? parseFloat(saved) : 3000;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('burn_rate_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('burn_rate_budget', budget.toString());
  }, [budget]);

  useEffect(() => {
    localStorage.setItem('burn_rate_expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Calculations
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
  const daysElapsed = differenceInDays(today, monthStart) + 1;
  const daysRemainingInMonth = daysInMonth - daysElapsed;

  const totalSpent = useMemo(() => {
    return expenses
      .filter(e => {
        const d = parseISO(e.date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, monthStart, monthEnd]);

  const remainingBudget = budget - totalSpent;
  
  const averageDailySpend = useMemo(() => {
    if (daysElapsed === 0) return 0;
    return totalSpent / daysElapsed;
  }, [totalSpent, daysElapsed]);

  const runwayDays = useMemo(() => {
    if (averageDailySpend <= 0) return Infinity;
    return remainingBudget / averageDailySpend;
  }, [remainingBudget, averageDailySpend]);

  const isOverspending = runwayDays < daysRemainingInMonth;
  const extraDays = runwayDays - daysRemainingInMonth;

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const labels = days.map(d => format(d, 'MMM d'));

    // Goal Line: Linear decline from budget to 0
    const goalLine = days.map((_, i) => {
      const val = budget * (1 - i / (daysInMonth - 1));
      return Math.max(0, val);
    });

    // Reality Line: Remaining budget day by day
    const realityLine: (number | null)[] = [];
    let cumulativeSpent = 0;
    
    for (let i = 0; i < daysInMonth; i++) {
      const currentDayInLoop = days[i];
      
      if (currentDayInLoop > today) {
        realityLine.push(null);
        continue;
      }

      const dayExpenses = expenses
        .filter(e => isSameDay(parseISO(e.date), currentDayInLoop))
        .reduce((sum, e) => sum + e.amount, 0);
      
      cumulativeSpent += dayExpenses;
      realityLine.push(Math.max(0, budget - cumulativeSpent));
    }

    return {
      labels,
      datasets: [
        {
          label: 'The Goal (Linear Pace)',
          data: goalLine,
          borderColor: 'rgba(148, 163, 184, 0.5)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'The Reality (Remaining)',
          data: realityLine,
          borderColor: isOverspending ? '#ef4444' : '#10b981',
          backgroundColor: isOverspending ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: isOverspending ? '#ef4444' : '#10b981',
          fill: true,
          tension: 0.2,
        },
      ],
    };
  }, [budget, expenses, monthStart, monthEnd, daysInMonth, today, isOverspending]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      description,
      amount: parseFloat(amount),
      date: expenseDate,
    };

    setExpenses([newExpense, ...expenses]);
    setDescription('');
    setAmount('');
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // Visual Feedback Logic
  const getRunwayColor = () => {
    if (runwayDays === Infinity) return 'bg-emerald-500';
    if (extraDays > 5) return 'bg-emerald-500';
    if (extraDays >= 0) return 'bg-amber-500';
    return 'bg-red-500 animate-pulse';
  };

  const getRunwayStatus = () => {
    if (runwayDays === Infinity) return 'No spending yet!';
    if (extraDays > 5) return 'Healthy Savings';
    if (extraDays >= 0) return 'On Track';
    return 'Critical Burn';
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-900 font-sans">
      {/* Header / Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <TrendingDown className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">BurnRate</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <Wallet className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Budget:</span>
              <input 
                type="number" 
                value={budget}
                onChange={(e) => setBudget(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 bg-transparent border-none focus:ring-0 text-sm font-bold p-0"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Chart */}
        <div className="lg:col-span-8 space-y-8">
          {/* Runway Indicator */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${getRunwayColor()} rounded-3xl p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden`}
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <span className="text-white/80 uppercase tracking-widest text-xs font-bold">Financial Runway</span>
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {getRunwayStatus()}
                </span>
              </div>
              
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-black tracking-tighter">
                  {runwayDays === Infinity ? '∞' : Math.max(0, Math.floor(runwayDays))}
                </span>
                <span className="text-2xl font-medium opacity-80">days remaining</span>
              </div>

              <p className="mt-4 text-white/90 font-medium max-w-md">
                {runwayDays === Infinity 
                  ? "Start adding expenses to see your burn rate."
                  : `At your current average of $${averageDailySpend.toFixed(2)}/day, your money will last ${Math.floor(runwayDays)} more days.`}
              </p>
            </div>
            
            {/* Decorative background element */}
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </motion.div>

          {/* Chart Section */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold">Burn Rate Visualization</h2>
                <p className="text-slate-500 text-sm">Comparing your pace against the monthly goal</p>
              </div>
              <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Saving</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Overspending</span>
                </div>
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Right Column: Inputs & List */}
        <div className="lg:col-span-4 space-y-6">
          {/* Add Expense Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Expense
            </h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Groceries"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount ($)</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                  <input 
                    type="date" 
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
              >
                Log Expense
              </button>
            </form>
          </div>

          {/* Expense History */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col max-h-[600px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Recent Activity</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                {expenses.length} Total
              </span>
            </div>
            
            <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {expenses.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No expenses logged yet</p>
                  </div>
                ) : (
                  expenses.map((expense) => (
                    <motion.div 
                      key={expense.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{expense.description}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            {format(parseISO(expense.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm">-${expense.amount.toFixed(2)}</span>
                        <button 
                          onClick={() => removeExpense(expense.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Monthly Summary Card */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white">
            <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Monthly Summary</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">Total Spent</span>
                <span className="font-bold">${totalSpent.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">Remaining</span>
                <span className="font-bold">${remainingBudget.toFixed(2)}</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm text-white/60">Daily Average</span>
                <span className="font-bold text-emerald-400">${averageDailySpend.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Local Persistence Active</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span>Real-time Burn Analysis</span>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
