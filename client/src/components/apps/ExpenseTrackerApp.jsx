import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Tag,
  PieChart,
  Repeat,
  Trash2,
  Download,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ImageIcon,
  Loader2,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertCircle,
  Mail,
  Globe,
  Server,
  Building2,
  Coins,
  AtSign,
  ExternalLink
} from 'lucide-react';
import { apiUploadImage } from '../../api.js';

// Supported Currencies: India, US, EU, Japan, China, Russia
export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', locale: 'en-US', decimals: 2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', locale: 'en-IN', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', locale: 'de-DE', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', locale: 'ja-JP', decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳', locale: 'zh-CN', decimals: 2 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', locale: 'ru-RU', decimals: 2 }
};

const PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316'  // Orange
];

const DEFAULT_BUDGETS = {
  groceries: 400,
  food: 250,
  dining: 200,
  domains: 100,
  tech: 150,
  hosting: 100,
  transport: 150,
  utilities: 200,
  entertainment: 100,
  shopping: 150
};

const POPULAR_PROVIDERS = [
  'Cloudflare',
  'Namecheap',
  'AWS',
  'Vercel',
  'GoDaddy',
  'Porkbun',
  'DigitalOcean',
  'Hetzner',
  'Google Cloud',
  'GitHub',
  'Stripe'
];

export const ExpenseTrackerApp = ({ memos = [], onCreateMemo, onDeleteMemo }) => {
  // Currency State (Persisted in localStorage)
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(() => {
    try {
      const stored = localStorage.getItem('mesh_finance_currency');
      return stored && CURRENCIES[stored] ? stored : 'USD';
    } catch (_) {
      return 'USD';
    }
  });

  const currentCurrency = CURRENCIES[selectedCurrencyCode] || CURRENCIES.USD;

  const handleSelectCurrency = (code) => {
    setSelectedCurrencyCode(code);
    try {
      localStorage.setItem('mesh_finance_currency', code);
    } catch (_) {}
  };

  const formatMoney = (cents) => {
    const isNegative = cents < 0;
    const abs = Math.abs(cents) / 100;
    const decimals = currentCurrency.decimals ?? 2;
    const formatted = abs.toLocaleString(currentCurrency.locale || 'en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    const prefix = isNegative ? '-' : '';
    return `${prefix}${currentCurrency.symbol}${formatted}`;
  };

  // Navigation / View State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'transactions' | 'subscriptions'
  const [periodMode, setPeriodMode] = useState('month'); // 'month' | 'year' | 'all'
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [accountFilter, setAccountFilter] = useState('all'); // Filter by specific account email

  // Logger Form State
  const [txType, setTxType] = useState('expense'); // 'expense' | 'income'
  const [amountInput, setAmountInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('domains');
  const [isSubscription, setIsSubscription] = useState(false);
  const [subInterval, setSubInterval] = useState('year'); // 'month' | 'year'
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const fileInputRef = useRef(null);

  // Domain & Account Metadata Fields
  const [showAccountFields, setShowAccountFields] = useState(false);
  const [accountEmailInput, setAccountEmailInput] = useState('');
  const [providerInput, setProviderInput] = useState('');
  const [domainInput, setDomainInput] = useState('');

  // Category Budgets State (Persisted in localStorage)
  const [budgets, setBudgets] = useState(() => {
    try {
      const stored = localStorage.getItem('mesh_finance_category_budgets');
      return stored ? JSON.parse(stored) : DEFAULT_BUDGETS;
    } catch (_) {
      return DEFAULT_BUDGETS;
    }
  });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(budgets);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');

  const handleSaveBudgets = (updated) => {
    setBudgets(updated);
    try {
      localStorage.setItem('mesh_finance_category_budgets', JSON.stringify(updated));
    } catch (_) {}
  };

  // Parse transactions from all memos
  const allTransactions = useMemo(() => {
    const list = [];

    memos.forEach((memo) => {
      const content = memo.content || '';
      const lines = content.split('\n');

      lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Check for receipt image in the memo
        const imgMatch = content.match(/!\[.*?\]\((.*?)\)/);
        const attachedReceipt = imgMatch ? imgMatch[1] : null;

        // Extract Account Email (e.g. account:user@example.com, email:user@example.com, or raw email)
        const accountMatch = trimmed.match(/(?:account|email):([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
          trimmed.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
        const accountEmail = accountMatch ? accountMatch[1].toLowerCase() : null;

        // Extract Provider / Registrar (e.g. provider:Cloudflare or #namecheap / #cloudflare)
        const providerMatch = trimmed.match(/provider:([a-zA-Z0-9._-]+)/i) ||
          trimmed.match(/#(cloudflare|namecheap|godaddy|aws|vercel|porkbun|ovh|digitalocean|hetzner|google|github|stripe|hostinger)\b/i);
        const provider = providerMatch ? providerMatch[1] : null;

        // Extract Domain (e.g. domain:example.com or example.com in text)
        const domainMatch = trimmed.match(/domain:([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
          trimmed.match(/\b([a-zA-Z0-9-]+\.(?:com|org|net|dev|io|app|in|co|ai|xyz|me|info|biz|ru|jp|cn|tech))\b/i);
        const domain = domainMatch ? domainMatch[1] : null;

        // Inflow regex: matches +, currency symbols ($ € £ ₹ ¥ ₽), or #income / #salary
        const incomeMatch = trimmed.match(/(?:\+[$€£₹¥₽]|[$€£₹¥₽]\+)\s*(\d+(?:\.\d{1,2})?)\s*(.*)/i) ||
          trimmed.match(/\+\s*(\d+(?:\.\d{1,2})?)\s*[$€£₹¥₽]\s*(.*)/i) ||
          (trimmed.match(/(?:[$€£₹¥₽])\s*(\d+(?:\.\d{1,2})?)\s*(.*)/i) && /#income\b|#salary\b|#freelance\b|#deposit\b|#inflow\b/i.test(trimmed));

        // Outflow regex: -$amount or $amount or #expense
        const expenseMatch = !incomeMatch && (
          trimmed.match(/(?:-[$€£₹¥₽]|[$€£₹¥₽]-)\s*(\d+(?:\.\d{1,2})?)\s*(.*)/i) ||
          trimmed.match(/-\s*(\d+(?:\.\d{1,2})?)\s*[$€£₹¥₽]\s*(.*)/i) ||
          trimmed.match(/(?:[$€£₹¥₽]|\bUSD\b|\bINR\b|\bEUR\b|\bJPY\b|\bCNY\b|\bRUB\b)\s*(\d+(?:\.\d{1,2})?)\s*(.*)/i) ||
          trimmed.match(/(\d+(?:\.\d{1,2})?)\s*[$€£₹¥₽]\s*(.*)/i)
        );

        if (incomeMatch) {
          const rawAmount = parseFloat(incomeMatch[1]);
          if (!isNaN(rawAmount) && rawAmount > 0) {
            const rest = incomeMatch[2] || trimmed;
            const tagMatch = rest.match(/#([a-zA-Z0-9_-]+)/);
            const category = tagMatch ? tagMatch[1].toLowerCase() : 'income';
            const cleanDesc = rest.replace(/#[a-zA-Z0-9_-]+/g, '').replace(/(?:account|email|provider|domain):[^\s]+/gi, '').replace(/[+\-$€£₹¥₽]/g, '').trim() || 'Income';

            list.push({
              id: `${memo.id}-${lineIdx}`,
              memoId: memo.id,
              type: 'income',
              cents: Math.round(rawAmount * 100),
              category: category,
              description: cleanDesc,
              accountEmail,
              provider,
              domain,
              isSubscription: false,
              receiptUrl: attachedReceipt,
              date: memo.created_at
            });
          }
        } else if (expenseMatch) {
          const rawAmount = parseFloat(expenseMatch[1]);
          if (!isNaN(rawAmount) && rawAmount > 0) {
            const rest = expenseMatch[2] || trimmed;
            const tagMatch = rest.match(/#([a-zA-Z0-9_-]+)/);
            const isSub = /#sub\b|#subscription\b|\/mo\b|\/month\b|\/yr\b|\/year\b/i.test(trimmed);
            const isYearly = /\/yr\b|\/year\b/i.test(trimmed);
            const category = tagMatch ? tagMatch[1].toLowerCase() : (domain ? 'domain' : 'misc');
            const cleanDesc = rest.replace(/#[a-zA-Z0-9_-]+/g, '').replace(/(?:account|email|provider|domain):[^\s]+/gi, '').replace(/[+\-$€£₹¥₽]/g, '').trim() || (domain || 'Expense');

            list.push({
              id: `${memo.id}-${lineIdx}`,
              memoId: memo.id,
              type: 'expense',
              cents: Math.round(rawAmount * 100),
              category: category,
              description: cleanDesc,
              accountEmail,
              provider,
              domain,
              isSubscription: isSub,
              subInterval: isYearly ? 'year' : 'month',
              receiptUrl: attachedReceipt,
              date: memo.created_at
            });
          }
        }
      });
    });

    return list.sort((a, b) => b.date - a.date);
  }, [memos]);

  // Unique Account Emails and Providers across all transactions
  const uniqueAccounts = useMemo(() => {
    const set = new Set();
    allTransactions.forEach(tx => {
      if (tx.accountEmail) set.add(tx.accountEmail);
    });
    return Array.from(set).sort();
  }, [allTransactions]);

  const uniqueProviders = useMemo(() => {
    const set = new Set();
    allTransactions.forEach(tx => {
      if (tx.provider) set.add(tx.provider);
    });
    return Array.from(set).sort();
  }, [allTransactions]);

  // Date & Account Filtering
  const targetYear = selectedMonthDate.getFullYear();
  const targetMonth = selectedMonthDate.getMonth();

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      // Account filter
      if (accountFilter !== 'all' && tx.accountEmail !== accountFilter) {
        return false;
      }

      if (periodMode === 'all') return true;

      const d = new Date(tx.date);
      if (periodMode === 'year') {
        return d.getFullYear() === targetYear;
      }
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
  }, [allTransactions, periodMode, targetYear, targetMonth, accountFilter]);

  // Previous Month Transactions for comparison
  const prevMonthTransactions = useMemo(() => {
    const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
    const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    return allTransactions.filter((tx) => {
      if (accountFilter !== 'all' && tx.accountEmail !== accountFilter) return false;
      const d = new Date(tx.date);
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });
  }, [allTransactions, targetYear, targetMonth, accountFilter]);

  // Aggregated Financial Metrics (computed in integer cents)
  const metrics = useMemo(() => {
    let incomeCents = 0;
    let expenseCents = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        incomeCents += tx.cents;
      } else {
        expenseCents += tx.cents;
      }
    });

    const netCents = incomeCents - expenseCents;
    const savingsRate = incomeCents > 0 ? Math.round((netCents / incomeCents) * 100) : 0;

    // Subscriptions in filtered scope
    const subs = (accountFilter === 'all' ? allTransactions : filteredTransactions)
      .filter(tx => tx.isSubscription && tx.type === 'expense');

    let monthlySubsCents = 0;
    subs.forEach(s => {
      if (s.subInterval === 'year') {
        monthlySubsCents += Math.round(s.cents / 12);
      } else {
        monthlySubsCents += s.cents;
      }
    });

    let prevExpenseCents = 0;
    prevMonthTransactions.forEach(tx => {
      if (tx.type === 'expense') prevExpenseCents += tx.cents;
    });

    let expenseDeltaPct = 0;
    if (prevExpenseCents > 0) {
      expenseDeltaPct = Math.round(((expenseCents - prevExpenseCents) / prevExpenseCents) * 100);
    }

    return {
      incomeCents,
      expenseCents,
      netCents,
      savingsRate,
      monthlySubsCents,
      annualSubsCents: monthlySubsCents * 12,
      expenseDeltaPct,
      prevExpenseCents
    };
  }, [filteredTransactions, prevMonthTransactions, allTransactions, accountFilter]);

  // Category breakdown for current filtered period
  const categoryStats = useMemo(() => {
    const map = {};
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'expense') {
        map[tx.category] = (map[tx.category] || 0) + tx.cents;
      }
    });

    return Object.entries(map)
      .map(([cat, cents], idx) => ({
        category: cat,
        cents,
        color: PALETTE[idx % PALETTE.length],
        percentage: metrics.expenseCents > 0 ? Math.round((cents / metrics.expenseCents) * 100) : 0,
        budgetLimit: budgets[cat] ? budgets[cat] * 100 : null
      }))
      .sort((a, b) => b.cents - a.cents);
  }, [filteredTransactions, metrics.expenseCents, budgets]);

  // Active Recurring Subscriptions & Domains unique list
  const activeSubscriptions = useMemo(() => {
    const subMap = new Map();
    allTransactions
      .filter(tx => tx.isSubscription && tx.type === 'expense')
      .forEach(tx => {
        if (accountFilter !== 'all' && tx.accountEmail !== accountFilter) return;
        const key = `${tx.category}-${tx.description.toLowerCase()}-${tx.domain || ''}-${tx.accountEmail || ''}`;
        if (!subMap.has(key)) {
          subMap.set(key, tx);
        }
      });
    return Array.from(subMap.values());
  }, [allTransactions, accountFilter]);

  // 6-Month Historical Cashflow Data for Bar Chart
  const sixMonthTrends = useMemo(() => {
    const months = [];
    const now = new Date(selectedMonthDate);

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = d.toLocaleString('en-US', { month: 'short' });

      let inc = 0;
      let exp = 0;

      allTransactions.forEach((tx) => {
        if (accountFilter !== 'all' && tx.accountEmail !== accountFilter) return;
        const txDate = new Date(tx.date);
        if (txDate.getFullYear() === y && txDate.getMonth() === m) {
          if (tx.type === 'income') inc += tx.cents;
          else exp += tx.cents;
        }
      });

      months.push({
        label,
        year: y,
        month: m,
        incomeCents: inc,
        expenseCents: exp
      });
    }

    const maxVal = Math.max(...months.map(m => Math.max(m.incomeCents, m.expenseCents)), 10000);

    return { months, maxVal };
  }, [allTransactions, selectedMonthDate, accountFilter]);

  const shiftMonth = (delta) => {
    const next = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + delta, 1);
    setSelectedMonthDate(next);
  };

  const handleUploadReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    try {
      const res = await apiUploadImage(file);
      if (res.url) {
        setReceiptUrl(res.url);
      }
    } catch (err) {
      console.error('Failed to upload receipt:', err);
    } finally {
      setIsUploadingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Quick Log Transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0 || isLogging) return;

    setIsLogging(true);
    try {
      const prefix = txType === 'income' ? '+' : '-';
      const subFlag = isSubscription ? ` #subscription /${subInterval}` : '';
      const cleanCat = categoryInput.toLowerCase().trim().replace(/^#/, '');
      const typeTag = txType === 'income' ? '#income' : '#expense';
      const receiptMd = receiptUrl ? `\n\n![Receipt Attachment](${receiptUrl})` : '';

      // Account, Provider, and Domain tags
      const accountTag = accountEmailInput.trim() ? ` account:${accountEmailInput.trim().toLowerCase()}` : '';
      const provTag = providerInput.trim() ? ` provider:${providerInput.trim()}` : '';
      const domTag = domainInput.trim() ? ` domain:${domainInput.trim().toLowerCase()}` : '';

      const content = `${prefix}${currentCurrency.symbol}${val.toFixed(currentCurrency.decimals)} #${cleanCat}${subFlag}${accountTag}${provTag}${domTag} ${descInput.trim()} ${typeTag}${receiptMd}`;

      const tags = [txType, cleanCat, ...(isSubscription ? ['subscription'] : [])];
      if (providerInput.trim()) tags.push(providerInput.trim().toLowerCase());
      if (domainInput.trim()) tags.push('domain');

      await onCreateMemo({
        content,
        tags,
        visibility: 'private'
      });

      setAmountInput('');
      setDescInput('');
      setIsSubscription(false);
      setReceiptUrl('');
      setDomainInput('');
    } catch (err) {
      console.error('Failed to log transaction:', err);
    } finally {
      setIsLogging(false);
    }
  };

  // CSV Export with Account, Provider, and Domain columns
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Date', 'Type', 'Currency', 'Amount', 'Category', 'Description', 'Account Email', 'Provider', 'Domain', 'Is Subscription', 'Memo ID'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toISOString().slice(0, 10),
      tx.type,
      currentCurrency.code,
      (tx.cents / 100).toFixed(currentCurrency.decimals),
      `#${tx.category}`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.accountEmail || '',
      tx.provider || '',
      tx.domain || '',
      tx.isSubscription ? 'Yes' : 'No',
      tx.memoId
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const periodName = periodMode === 'month'
      ? selectedMonthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(/\s+/g, '-')
      : periodMode;
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mesh-finance-${currentCurrency.code}-${periodName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Donut Chart Calculation
  const donutSlices = useMemo(() => {
    let cumulativePercent = 0;
    return categoryStats.map((item) => {
      const start = cumulativePercent;
      cumulativePercent += item.percentage;
      return {
        ...item,
        startPercent: start,
        endPercent: cumulativePercent
      };
    });
  }, [categoryStats]);

  const monthLabel = selectedMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 animate-fadeIn text-base-content">
      {/* Hidden file input for receipt uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadReceipt}
      />

      {/* Datalist for Account Email suggestions */}
      <datalist id="finance-known-accounts">
        {uniqueAccounts.map(acc => (
          <option key={acc} value={acc} />
        ))}
      </datalist>

      {/* Datalist for Provider suggestions */}
      <datalist id="finance-known-providers">
        {POPULAR_PROVIDERS.map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {/* App Header & Controls */}
      <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-success/15 text-success flex items-center justify-center font-bold shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg leading-tight flex items-center gap-2">
                <span>Finances, Domains & Subs</span>
                <span className="badge badge-sm badge-ghost font-mono text-[11px]">
                  {filteredTransactions.length} txns
                </span>
              </h2>
              <span className="text-xs text-base-content/50">
                Track income, budgets, domains, and subscriptions mapped to account emails
              </span>
            </div>
          </div>

          {/* Action Tools & Currency Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Currency Selector Dropdown */}
            <div className="dropdown dropdown-end">
              <label
                tabIndex={0}
                className="btn btn-xs btn-ghost gap-1.5 border border-base-content/15 font-mono text-xs hover:bg-base-200"
                title="Select Currency (India, US, EU, Japan, China, Russia)"
              >
                <span>{currentCurrency.flag}</span>
                <span className="font-bold text-primary">{currentCurrency.symbol}</span>
                <span>{currentCurrency.code}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-50 menu p-1.5 shadow-2xl bg-base-200 border border-base-content/15 rounded-box w-52 text-xs mt-1"
              >
                <li className="menu-title text-[10px] text-base-content/50 px-2 py-0.5">
                  Select Currency
                </li>
                {Object.values(CURRENCIES).map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => handleSelectCurrency(c.code)}
                      className={`flex items-center justify-between ${
                        selectedCurrencyCode === c.code ? 'active font-bold text-primary' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="font-mono font-bold">{c.symbol}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setBudgetDraft({ ...budgets });
                setShowBudgetModal(true);
              }}
              className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
              title="Set Monthly Category Budgets"
            >
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>Budgets</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-base-content"
              title="Export filtered transactions to CSV"
            >
              <Download className="w-3.5 h-3.5 text-secondary" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Date & Account Filter Bar */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-base-content/10 flex-wrap gap-2">
          {/* Month Navigator */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={periodMode !== 'month'}
              onClick={() => shiftMonth(-1)}
              className="btn btn-xs btn-ghost btn-square"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold px-2 min-w-[130px] text-center font-mono">
              {periodMode === 'month'
                ? monthLabel
                : periodMode === 'year'
                ? `Year ${targetYear}`
                : 'All-Time Records'}
            </span>

            <button
              type="button"
              disabled={periodMode !== 'month'}
              onClick={() => shiftMonth(1)}
              className="btn btn-xs btn-ghost btn-square"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {periodMode === 'month' && (
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setSelectedMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                className="btn btn-xs btn-ghost text-[10px] ml-1"
              >
                Current
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Account Email Filter Dropdown */}
            {uniqueAccounts.length > 0 && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-base-content/50" />
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="select select-bordered select-xs text-[11px] h-6 min-h-0 font-mono"
                  title="Filter transactions and subscriptions by account login email"
                >
                  <option value="all">All Accounts ({uniqueAccounts.length})</option>
                  {uniqueAccounts.map(acc => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Period Mode Selector */}
            <div className="join bg-base-200/80 p-0.5 rounded-lg border border-base-content/10 text-xs">
              <button
                type="button"
                onClick={() => setPeriodMode('month')}
                className={`btn btn-xs join-item h-6 min-h-0 px-2.5 ${
                  periodMode === 'month' ? 'btn-primary btn-active font-semibold shadow-xs' : 'btn-ghost'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('year')}
                className={`btn btn-xs join-item h-6 min-h-0 px-2.5 ${
                  periodMode === 'year' ? 'btn-primary btn-active font-semibold shadow-xs' : 'btn-ghost'
                }`}
              >
                Year
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('all')}
                className={`btn btn-xs join-item h-6 min-h-0 px-2.5 ${
                  periodMode === 'all' ? 'btn-primary btn-active font-semibold shadow-xs' : 'btn-ghost'
                }`}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Financial Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
          {/* Inflow Card */}
          <div className="bg-success/5 border border-success/20 p-3 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-success mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Inflow / Income</span>
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
            <span className="text-lg sm:text-xl font-bold font-mono text-success">
              {formatMoney(metrics.incomeCents)}
            </span>
            <span className="text-[10px] text-base-content/50 mt-0.5">Total deposits</span>
          </div>

          {/* Outflow Card */}
          <div className="bg-error/5 border border-error/20 p-3 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-error mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Outflow / Spent</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <span className="text-lg sm:text-xl font-bold font-mono text-error">
              {formatMoney(-metrics.expenseCents)}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-base-content/50 mt-0.5">
              {metrics.prevExpenseCents > 0 ? (
                <span className={metrics.expenseDeltaPct > 0 ? 'text-error font-medium' : 'text-success font-medium'}>
                  {metrics.expenseDeltaPct > 0 ? `+${metrics.expenseDeltaPct}%` : `${metrics.expenseDeltaPct}%`} vs prev
                </span>
              ) : (
                <span>All logged expenses</span>
              )}
            </div>
          </div>

          {/* Net Cash Flow Card */}
          <div className="bg-base-200/60 border border-base-content/10 p-3 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-base-content/60 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Net Cashflow</span>
              {metrics.netCents >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-success" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-error" />
              )}
            </div>
            <span className={`text-lg sm:text-xl font-bold font-mono ${metrics.netCents >= 0 ? 'text-success' : 'text-error'}`}>
              {formatMoney(metrics.netCents)}
            </span>
            <span className="text-[10px] text-base-content/50 mt-0.5">
              Savings: <strong className="text-base-content/80 font-mono">{metrics.savingsRate}%</strong>
            </span>
          </div>

          {/* Subscriptions Card */}
          <div className="bg-primary/5 border border-primary/20 p-3 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-primary mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Recurring & Subs</span>
              <Repeat className="w-3.5 h-3.5" />
            </div>
            <span className="text-lg sm:text-xl font-bold font-mono text-primary flex items-baseline gap-1">
              {formatMoney(metrics.monthlySubsCents)}
              <span className="text-[10px] font-normal text-base-content/50">/mo</span>
            </span>
            <span className="text-[10px] text-base-content/50 mt-0.5">
              Projected: <strong className="text-base-content/70 font-mono">{formatMoney(metrics.annualSubsCents)}/yr</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main View Tabs (Overview & Analytics / Transactions / Subscriptions) */}
      <div className="flex items-center justify-between border-b border-base-content/10 px-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Overview & Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'transactions'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Transactions ({filteredTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'subscriptions'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Domains & Subscriptions ({activeSubscriptions.length})</span>
          </button>
        </div>

        {accountFilter !== 'all' && (
          <span className="badge badge-sm badge-outline gap-1 font-mono text-xs">
            <Mail className="w-3 h-3 text-primary" />
            <span>{accountFilter}</span>
            <button
              type="button"
              onClick={() => setAccountFilter('all')}
              className="hover:text-error ml-1"
            >
              ✕
            </button>
          </span>
        )}
      </div>

      {/* Tab 1: Overview & Analytics */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Left Column: Quick Log Form */}
          <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-base-content/70 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Quick Log</span>
              </span>
              <div className="join bg-base-200 p-0.5 rounded-lg border border-base-content/10">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`btn btn-xs join-item h-5 min-h-0 px-2 text-[10px] ${
                    txType === 'expense' ? 'btn-error btn-active text-white' : 'btn-ghost'
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`btn btn-xs join-item h-5 min-h-0 px-2 text-[10px] ${
                    txType === 'income' ? 'btn-success btn-active text-white' : 'btn-ghost'
                  }`}
                >
                  Income (+)
                </button>
              </div>
            </h3>

            <form onSubmit={handleAddTransaction} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[11px] text-base-content/60 block mb-1">
                  Amount ({currentCurrency.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-base-content/50 font-mono font-bold">
                    {currentCurrency.symbol}
                  </span>
                  <input
                    type="number"
                    step={currentCurrency.decimals === 0 ? '1' : '0.01'}
                    placeholder={currentCurrency.decimals === 0 ? '1500' : '24.50'}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="input input-xs input-bordered w-full font-mono text-xs pl-6"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-base-content/60 block mb-1">Category / Tag</label>
                <input
                  type="text"
                  placeholder="domains, hosting, tech, groceries, salary..."
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="input input-xs input-bordered w-full text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-base-content/60 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Domain renewal, VPS server, Coffee..."
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="input input-xs input-bordered w-full text-xs"
                />
              </div>

              {/* Recurring Switch */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-base-200/50 border border-base-content/5">
                <label htmlFor="subCheck" className="text-xs text-base-content/70 cursor-pointer flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-primary" />
                  <span>Recurring Service</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="subCheck"
                    checked={isSubscription}
                    onChange={(e) => setIsSubscription(e.target.checked)}
                    className="checkbox checkbox-xs checkbox-primary"
                  />
                  {isSubscription && (
                    <select
                      value={subInterval}
                      onChange={(e) => setSubInterval(e.target.value)}
                      className="select select-bordered select-xs text-[10px] h-6 min-h-0"
                    >
                      <option value="year">/yr (Yearly)</option>
                      <option value="month">/mo (Monthly)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Domain & Account Email Section Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAccountFields(!showAccountFields)}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Building2 className="w-3 h-3" />
                  <span>{showAccountFields ? 'Hide Account & Domain info' : '+ Add Account Login & Provider info'}</span>
                </button>

                {showAccountFields && (
                  <div className="mt-2 p-2.5 bg-base-200/60 rounded-xl space-y-2 border border-base-content/10 animate-fadeIn">
                    <div>
                      <label className="text-[10px] text-base-content/70 font-semibold block mb-0.5 flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5 text-primary" />
                        <span>Account Login Email</span>
                      </label>
                      <input
                        type="email"
                        list="finance-known-accounts"
                        placeholder="e.g. personal@gmail.com, work@company.com"
                        value={accountEmailInput}
                        onChange={(e) => setAccountEmailInput(e.target.value)}
                        className="input input-xs input-bordered w-full text-xs font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-base-content/70 font-semibold block mb-0.5 flex items-center gap-1">
                          <Server className="w-2.5 h-2.5 text-secondary" />
                          <span>Provider / Registrar</span>
                        </label>
                        <input
                          type="text"
                          list="finance-known-providers"
                          placeholder="Cloudflare, Namecheap..."
                          value={providerInput}
                          onChange={(e) => setProviderInput(e.target.value)}
                          className="input input-xs input-bordered w-full text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-base-content/70 font-semibold block mb-0.5 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5 text-info" />
                          <span>Domain Name</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. mycoolapp.dev"
                          value={domainInput}
                          onChange={(e) => setDomainInput(e.target.value)}
                          className="input input-xs input-bordered w-full text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Receipt Snapshot Attachment */}
              <div>
                {receiptUrl ? (
                  <div className="flex items-center justify-between p-2 bg-base-200 rounded-xl text-xs">
                    <span className="text-success flex items-center gap-1 truncate max-w-[180px]">
                      <Check className="w-3 h-3" /> Receipt Attached
                    </span>
                    <button
                      type="button"
                      onClick={() => setReceiptUrl('')}
                      className="btn btn-ghost btn-xs btn-square text-error"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploadingReceipt}
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-xs btn-outline btn-block gap-1 font-normal text-xs"
                  >
                    {isUploadingReceipt ? (
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    ) : (
                      <ImageIcon className="w-3 h-3 text-secondary" />
                    )}
                    <span>Attach Invoice / Receipt Photo</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!amountInput || isLogging}
                className="btn btn-xs btn-primary w-full mt-1 font-medium"
              >
                {isLogging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Log {txType === 'income' ? 'Income' : 'Expense'}</span>
              </button>
            </form>
          </div>

          {/* Center & Right Column: Analytics, Donut Chart & 6-Month Trends */}
          <div className="lg:col-span-2 space-y-4">
            {/* Category Breakdown & Donut Chart */}
            <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-base-content/70 mb-3 flex items-center justify-between">
                <span>Category Distribution ({periodMode})</span>
                <span className="font-mono text-base-content/50 text-[11px]">
                  Total Outflow: {formatMoney(metrics.expenseCents)}
                </span>
              </h3>

              {categoryStats.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Native SVG Donut Chart */}
                  <div className="flex flex-col items-center justify-center p-2 relative">
                    <svg viewBox="0 0 100 100" className="w-40 h-40 transform -rotate-90">
                      {donutSlices.map((slice) => {
                        const circumference = 2 * Math.PI * 38;
                        const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((slice.startPercent / 100) * circumference);

                        return (
                          <circle
                            key={slice.category}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="16"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-300 hover:opacity-80"
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[10px] text-base-content/50 uppercase font-bold">Spent</span>
                      <span className="text-sm font-bold font-mono">{formatMoney(metrics.expenseCents)}</span>
                    </div>
                  </div>

                  {/* Category Legend & Progress Bars */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {categoryStats.map((item) => {
                      const hasBudget = item.budgetLimit !== null;
                      const budgetRatio = hasBudget ? (item.cents / item.budgetLimit) * 100 : item.percentage;
                      const isOverBudget = hasBudget && item.cents > item.budgetLimit;

                      return (
                        <div key={item.category} className="text-xs">
                          <div className="flex items-center justify-between text-[11px] mb-0.5">
                            <span className="font-medium flex items-center gap-1.5 truncate">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span>#{item.category}</span>
                            </span>
                            <div className="flex items-center gap-1 font-mono text-base-content/70">
                              <span>{formatMoney(item.cents)}</span>
                              {hasBudget ? (
                                <span className={`text-[10px] ${isOverBudget ? 'text-error font-bold' : 'text-base-content/40'}`}>
                                  / {currentCurrency.symbol}{item.budgetLimit / 100} ({Math.round(budgetRatio)}%)
                                </span>
                              ) : (
                                <span className="text-[10px] text-base-content/40 font-normal">
                                  ({item.percentage}%)
                                </span>
                              )}
                            </div>
                          </div>
                          <progress
                            className={`progress w-full h-1.5 ${
                              isOverBudget
                                ? 'progress-error'
                                : budgetRatio > 75
                                ? 'progress-warning'
                                : 'progress-primary'
                            }`}
                            value={Math.min(100, Math.round(budgetRatio))}
                            max="100"
                          />
                          {isOverBudget && (
                            <span className="text-[10px] text-error flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3 h-3" />
                              <span>Over monthly budget by {formatMoney(item.cents - item.budgetLimit)}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-base-content/50 italic">
                  No expense records logged in this period.
                </div>
              )}
            </div>

            {/* 6-Month Cash Flow Bar Chart */}
            <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-base-content/70 mb-3 flex items-center justify-between">
                <span>6-Month Cashflow Trend ({currentCurrency.code})</span>
                <div className="flex items-center gap-3 text-[10px] font-normal">
                  <span className="flex items-center gap-1 text-success font-medium">
                    <span className="w-2 h-2 rounded-xs bg-success" /> Inflow
                  </span>
                  <span className="flex items-center gap-1 text-error font-medium">
                    <span className="w-2 h-2 rounded-xs bg-error" /> Outflow
                  </span>
                </div>
              </h3>

              <div className="grid grid-cols-6 gap-2 pt-4 items-end h-36 border-b border-base-content/10">
                {sixMonthTrends.months.map((m) => {
                  const incHeight = Math.round((m.incomeCents / sixMonthTrends.maxVal) * 100);
                  const expHeight = Math.round((m.expenseCents / sixMonthTrends.maxVal) * 100);

                  return (
                    <div key={`${m.year}-${m.month}`} className="flex flex-col items-center gap-1 h-full justify-end group">
                      <div className="flex items-end gap-1 w-full max-w-[40px] justify-center h-full">
                        <div
                          style={{ height: `${Math.max(4, incHeight)}%` }}
                          className="w-1/2 bg-success/80 rounded-t-sm hover:bg-success transition-all cursor-pointer"
                          title={`${m.label}: Inflow ${formatMoney(m.incomeCents)}`}
                        />
                        <div
                          style={{ height: `${Math.max(4, expHeight)}%` }}
                          className="w-1/2 bg-error/80 rounded-t-sm hover:bg-error transition-all cursor-pointer"
                          title={`${m.label}: Outflow ${formatMoney(m.expenseCents)}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-base-content/60 truncate">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Transactions Stream List */}
      {activeTab === 'transactions' && (
        <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-base-content/10 flex-wrap gap-2 text-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-base-content/70 flex items-center gap-2">
              <span>Transactions ({filteredTransactions.length})</span>
              {accountFilter !== 'all' && (
                <span className="badge badge-xs badge-primary font-mono">{accountFilter}</span>
              )}
            </h3>
            <span className="font-mono text-base-content/60">
              Net: <strong className={metrics.netCents >= 0 ? 'text-success' : 'text-error'}>{formatMoney(metrics.netCents)}</strong>
            </span>
          </div>

          {filteredTransactions.length > 0 ? (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredTransactions.map((tx) => {
                const isInc = tx.type === 'income';
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-base-200/50 border border-base-content/5 text-xs hover:bg-base-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isInc ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
                      }`}>
                        {isInc ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-base-content truncate">{tx.description}</span>
                          <span className="badge badge-xs badge-outline text-[10px] font-mono">#{tx.category}</span>

                          {/* Domain Badge */}
                          {tx.domain && (
                            <span className="badge badge-xs badge-info text-[9px] gap-0.5 font-mono">
                              <Globe className="w-2.5 h-2.5" /> {tx.domain}
                            </span>
                          )}

                          {/* Provider Badge */}
                          {tx.provider && (
                            <span className="badge badge-xs badge-neutral text-[9px] gap-0.5">
                              <Server className="w-2.5 h-2.5" /> {tx.provider}
                            </span>
                          )}

                          {/* Account Email Badge */}
                          {tx.accountEmail && (
                            <span
                              onClick={() => setAccountFilter(tx.accountEmail)}
                              className="badge badge-xs badge-warning text-[9px] gap-0.5 font-mono cursor-pointer hover:opacity-80"
                              title={`Filter by account: ${tx.accountEmail}`}
                            >
                              <Mail className="w-2.5 h-2.5" /> {tx.accountEmail}
                            </span>
                          )}

                          {tx.isSubscription && (
                            <span className="badge badge-xs badge-primary text-[9px] gap-0.5">
                              <Repeat className="w-2.5 h-2.5" /> Sub
                            </span>
                          )}

                          {tx.receiptUrl && (
                            <a
                              href={tx.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="badge badge-xs badge-secondary text-[9px] gap-0.5"
                            >
                              <ImageIcon className="w-2.5 h-2.5" /> Receipt
                            </a>
                          )}
                        </div>

                        <span className="text-[10px] text-base-content/40 block mt-0.5 font-mono">
                          {new Date(tx.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className={`font-mono font-bold text-sm ${isInc ? 'text-success' : 'text-error'}`}>
                        {isInc ? `+${formatMoney(tx.cents)}` : `-${formatMoney(tx.cents)}`}
                      </span>

                      {onDeleteMemo && (
                        <button
                          type="button"
                          onClick={() => onDeleteMemo(tx.memoId)}
                          className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-error"
                          title="Delete source memo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-base-content/50 italic">
              No transactions logged for this period.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Domains & Subscriptions Auditor */}
      {activeTab === 'subscriptions' && (
        <div className="card bg-base-100 border border-base-content/10 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-base-content/10 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span>Domains & Recurring Subscriptions</span>
                {accountFilter !== 'all' && (
                  <span className="badge badge-sm badge-warning font-mono">{accountFilter}</span>
                )}
              </h3>
              <span className="text-xs text-base-content/50">
                Audit domains and SaaS services mapped to their registrar and account login emails
              </span>
            </div>

            <div className="text-right font-mono">
              <span className="text-xs text-base-content/60 block">Annual Projected Cost</span>
              <span className="text-base font-bold text-primary">{formatMoney(metrics.annualSubsCents)}/year</span>
            </div>
          </div>

          {activeSubscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-xs w-full">
                <thead>
                  <tr className="text-base-content/60 border-b border-base-content/10 text-[11px]">
                    <th>Service / Domain</th>
                    <th>Provider / Registrar</th>
                    <th>Account Login Email</th>
                    <th>Billing Cycle</th>
                    <th className="text-right">Monthly Equivalent</th>
                    <th className="text-right">Annual Cost</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSubscriptions.map((sub) => {
                    const isYearly = sub.subInterval === 'year';
                    const monthlyCents = isYearly ? Math.round(sub.cents / 12) : sub.cents;
                    const annualCents = monthlyCents * 12;

                    return (
                      <tr key={sub.id} className="hover:bg-base-200/50">
                        <td>
                          <div className="font-semibold text-xs flex items-center gap-1.5">
                            {sub.domain ? (
                              <span className="flex items-center gap-1 text-primary font-mono">
                                <Globe className="w-3 h-3" />
                                <strong>{sub.domain}</strong>
                              </span>
                            ) : (
                              <span>{sub.description}</span>
                            )}
                          </div>
                          {sub.domain && sub.description && sub.description !== sub.domain && (
                            <span className="text-[10px] text-base-content/60">{sub.description}</span>
                          )}
                          <span className="badge badge-xs badge-ghost text-[9px] font-mono ml-1">#{sub.category}</span>
                        </td>

                        {/* Provider / Registrar Column */}
                        <td>
                          {sub.provider ? (
                            <span className="badge badge-xs badge-neutral text-[10px] font-medium gap-1">
                              <Server className="w-2.5 h-2.5 text-secondary" />
                              <span>{sub.provider}</span>
                            </span>
                          ) : (
                            <span className="text-base-content/30 text-[10px] italic">Not set</span>
                          )}
                        </td>

                        {/* Account Login Email Column */}
                        <td>
                          {sub.accountEmail ? (
                            <button
                              type="button"
                              onClick={() => setAccountFilter(sub.accountEmail)}
                              className="badge badge-xs badge-warning text-[10px] font-mono gap-1 hover:opacity-80 cursor-pointer"
                              title="Filter all services for this account"
                            >
                              <Mail className="w-2.5 h-2.5" />
                              <span>{sub.accountEmail}</span>
                            </button>
                          ) : (
                            <span className="text-base-content/30 text-[10px] italic">No email linked</span>
                          )}
                        </td>

                        <td>
                          <span className="badge badge-xs badge-outline capitalize">{isYearly ? 'Yearly' : 'Monthly'}</span>
                        </td>

                        <td className="text-right font-mono font-bold text-xs">
                          {formatMoney(monthlyCents)}/mo
                        </td>

                        <td className="text-right font-mono text-base-content/70 text-xs">
                          {formatMoney(annualCents)}/yr
                        </td>

                        <td className="text-center">
                          {onDeleteMemo && (
                            <button
                              type="button"
                              onClick={() => onDeleteMemo(sub.memoId)}
                              className="btn btn-ghost btn-xs btn-square text-error"
                              title="Delete subscription"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-base-content/50 italic">
              No domains or subscriptions detected. Log a service with the &quot;Recurring Service&quot; checkbox or include `#subscription /yr account:email@provider.com`.
            </div>
          )}
        </div>
      )}

      {/* Category Budgets Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="card bg-base-100 border border-base-content/15 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Monthly Category Budgets ({currentCurrency.code})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBudgetModal(false)}
                className="btn btn-xs btn-ghost btn-square"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-base-content/60">
                Set target monthly spending caps in {currentCurrency.name}. Categories exceeding 100% alert you in red.
              </p>

              {/* Add New Category Budget */}
              <div className="flex items-center gap-2 pt-1 pb-2 border-b border-base-content/10">
                <input
                  type="text"
                  placeholder="Category (e.g. domains)"
                  value={newBudgetCategory}
                  onChange={(e) => setNewBudgetCategory(e.target.value)}
                  className="input input-xs input-bordered flex-1 text-xs"
                />
                <div className="relative w-32">
                  <span className="absolute left-2 top-1.5 text-base-content/50 font-mono text-[10px]">
                    {currentCurrency.symbol}
                  </span>
                  <input
                    type="number"
                    placeholder="Limit"
                    value={newBudgetLimit}
                    onChange={(e) => setNewBudgetLimit(e.target.value)}
                    className="input input-xs input-bordered w-full text-xs font-mono pl-5"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const clean = newBudgetCategory.toLowerCase().trim().replace(/^#/, '');
                    const val = parseFloat(newBudgetLimit);
                    if (clean && !isNaN(val) && val > 0) {
                      setBudgetDraft({ ...budgetDraft, [clean]: val });
                      setNewBudgetCategory('');
                      setNewBudgetLimit('');
                    }
                  }}
                  className="btn btn-xs btn-primary"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* List of current limits */}
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {Object.entries(budgetDraft).map(([cat, limit]) => (
                  <div key={cat} className="flex items-center justify-between text-xs p-2 rounded-xl bg-base-200/50">
                    <span className="font-mono font-medium">#{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-base-content/50">{currentCurrency.symbol}</span>
                      <input
                        type="number"
                        value={limit}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setBudgetDraft({ ...budgetDraft, [cat]: val });
                        }}
                        className="input input-xs input-bordered w-20 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const copy = { ...budgetDraft };
                          delete copy[cat];
                          setBudgetDraft(copy);
                        }}
                        className="btn btn-ghost btn-xs btn-square text-error"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-base-content/10">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="btn btn-xs btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveBudgets(budgetDraft);
                    setShowBudgetModal(false);
                  }}
                  className="btn btn-xs btn-primary gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Budgets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
