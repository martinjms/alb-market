import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import {
  Database,
  RefreshCw,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Image,
  DollarSign,
  Activity,
  Settings,
  Shuffle,
  Clock,
  ChevronRight,
  Layers,
  Heart,
  Play,
  Pause,
  Timer
} from 'lucide-react';
import { ItemIcon } from './ItemIcon';
import { RandomItem as SharedRandomItem } from '@alb-market/shared';

interface DatabaseStats {
  totalItems: number;
  itemsByCategory: { category: string; count: number }[];
  itemsWithoutCategory: number;
  itemsWithoutIcon: number;
  itemsWithoutPrices?: number;
  itemsWithoutPriceData?: number; // Support both names
  dataHealth?: {
    score: number;
    status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  };
  dataHealthScore?: number; // Support old format
  lastUpdated: string;
}

interface RandomItem {
  id: string;
  itemId?: string;
  name: string;
  tier: number;
  enchantmentLevel?: number;
  enchantment?: number; // Support both names
  category?: string;
  subcategory?: string;
  iconUrl?: string;
  createdAt?: string;
}

type RefreshFrequency = {
  label: string;
  value: number; // seconds, 0 = manual
  description: string;
};

const REFRESH_FREQUENCIES: RefreshFrequency[] = [
  { label: 'Very Fast', value: 1, description: '1 second' },
  { label: 'Fast', value: 2, description: '2 seconds' },
  { label: 'Normal', value: 5, description: '5 seconds' },
  { label: 'Slow', value: 10, description: '10 seconds' },
  { label: 'Very Slow', value: 30, description: '30 seconds' },
  { label: 'Manual', value: 0, description: 'No auto-refresh' }
];

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Custom styled components using inline styles for dark theme
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div style={{
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    ...className as any
  }}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, trend, color = '#3b82f6' }: any) => (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
      <div>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </p>
        <p style={{ fontSize: '32px', fontWeight: 'bold', color, margin: '0' }}>
          {value}
        </p>
        {trend && (
          <p style={{ fontSize: '14px', color: trend > 0 ? '#10b981' : '#ef4444', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={16} />
            {trend > 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
      <div style={{
        width: '48px',
        height: '48px',
        backgroundColor: `${color}20`,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={24} color={color} />
      </div>
    </div>
  </Card>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [randomItem, setRandomItem] = useState<RandomItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [autoRotate, setAutoRotate] = useState(true);
  const [itemRotateInterval, setItemRotateInterval] = useState<number>(5); // Default to 5 seconds
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isItemRefreshing, setIsItemRefreshing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const fetchStats = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`);
      const data: ApiResponse<DatabaseStats> = await response.json();
      
      if (data.success && data.data) {
        // Normalize the data to handle both old and new formats
        const normalizedStats = {
          ...data.data,
          itemsWithoutPrices: data.data.itemsWithoutPrices ?? data.data.itemsWithoutPriceData ?? 0,
          dataHealth: data.data.dataHealth ?? {
            score: data.data.dataHealthScore ?? 0,
            status: (data.data.dataHealthScore ?? 0) >= 80 ? 'excellent' as const :
                    (data.data.dataHealthScore ?? 0) >= 60 ? 'good' as const :
                    (data.data.dataHealthScore ?? 0) >= 40 ? 'needs-improvement' as const : 'poor' as const
          }
        };
        setStats(normalizedStats);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsRefreshing(false);
    }
  }, [API_BASE_URL]);

  const fetchRandomItem = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsItemRefreshing(true);
      }
      const response = await fetch(`${API_BASE_URL}/api/admin/random-item`);
      const data: ApiResponse<RandomItem> = await response.json();
      
      if (data.success && data.data) {
        // Normalize the data
        const normalizedItem = {
          ...data.data,
          itemId: data.data.itemId ?? data.data.id,
          enchantmentLevel: data.data.enchantmentLevel ?? data.data.enchantment ?? 0,
          createdAt: data.data.createdAt ?? new Date().toISOString()
        };
        setRandomItem(normalizedItem);
      }
    } catch (err) {
      console.error('Failed to fetch random item:', err);
    } finally {
      if (showLoading) {
        setIsItemRefreshing(false);
      }
    }
  }, [API_BASE_URL]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchStats(), fetchRandomItem(true)]);
  }, [fetchStats, fetchRandomItem]);

  useEffect(() => {
    refreshAll().finally(() => setLoading(false));
  }, [refreshAll]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchStats]);

  // Enhanced auto-refresh effect with countdown
  useEffect(() => {
    // Clear existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (itemRotateInterval > 0 && !isPaused) {
      // Set initial countdown
      setCountdown(itemRotateInterval);
      
      // Start countdown timer
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return itemRotateInterval; // Reset countdown
          }
          return prev - 1;
        });
      }, 1000);

      // Start item rotation timer
      intervalRef.current = setInterval(() => {
        fetchRandomItem(false); // Don't show loading for auto-refresh
      }, itemRotateInterval * 1000);
    } else {
      setCountdown(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [itemRotateInterval, isPaused, fetchRandomItem]);

  // Pause/Resume functionality
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Manual refresh with loading indicator
  const manualRefreshItem = useCallback(() => {
    fetchRandomItem(true);
  }, [fetchRandomItem]);

  // Get current frequency config
  const currentFrequency = REFRESH_FREQUENCIES.find(f => f.value === itemRotateInterval) || REFRESH_FREQUENCIES[2];

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  // Prepare chart data
  const categoryData = stats?.itemsByCategory.slice(0, 8).map((cat, index) => ({
    name: cat.category,
    value: cat.count,
    fill: COLORS[index % COLORS.length]
  })) || [];

  const healthScore = stats?.dataHealth?.score ?? 0;
  const healthData = [
    { name: 'Health Score', value: healthScore, fill: '#3b82f6' },
    { name: 'Remaining', value: 100 - healthScore, fill: '#1a1a1a' }
  ];

  const qualityData = stats ? [
    { 
      name: 'Categorized', 
      value: ((stats.totalItems - stats.itemsWithoutCategory) / stats.totalItems * 100),
      count: stats.totalItems - stats.itemsWithoutCategory
    },
    { 
      name: 'With Price Data', 
      value: ((stats.totalItems - (stats.itemsWithoutPrices ?? 0)) / stats.totalItems * 100),
      count: stats.totalItems - (stats.itemsWithoutPrices ?? 0)
    },
    { 
      name: 'With Icons', 
      value: 100, // Icons are generated programmatically
      count: stats.totalItems
    }
  ] : [];

  const radialData = [{
    name: 'Score',
    value: healthScore,
    fill: healthScore >= 80 ? '#10b981' : 
          healthScore >= 60 ? '#f59e0b' : 
          healthScore >= 40 ? '#f97316' : '#ef4444'
  }];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#e5e5e5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Database size={48} color="#3b82f6" style={{ marginBottom: '20px', animation: 'pulse 2s infinite' }} />
          <style>{`
            @keyframes pulse { 
              0%, 100% { opacity: 1; transform: scale(1); } 
              50% { opacity: 0.5; transform: scale(0.95); } 
            }
            @keyframes spin { 
              to { transform: rotate(360deg); } 
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #1a1a1a; }
            ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #444; }
          `}</style>
          <p style={{ fontSize: '18px', color: '#888' }}>Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '40px',
        backgroundColor: '#0a0a0a',
        color: '#e5e5e5',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Card>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
            <h2 style={{ color: '#ef4444', marginBottom: '15px' }}>Connection Error</h2>
            <p style={{ color: '#999', marginBottom: '25px' }}>{error}</p>
            <button
              onClick={refreshAll}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <RefreshCw size={18} />
              Retry Connection
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#e5e5e5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Modern Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        borderBottom: '1px solid #333',
        padding: '24px 40px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(26, 26, 26, 0.95)'
      }}>
        <div style={{ 
          maxWidth: '1600px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={28} color="white" />
            </div>
            <div>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: '600',
                color: '#fff',
                margin: 0,
                letterSpacing: '-0.5px'
              }}>
                ALB Market Analytics
              </h1>
              <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
                Real-time Database Monitoring
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {isRefreshing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#3b82f6', fontSize: '14px' }}>Syncing...</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
              <Clock size={16} />
              <span style={{ fontSize: '14px' }}>
                {stats ? new Date(stats.lastUpdated).toLocaleTimeString() : '-'}
              </span>
            </div>
            <button
              onClick={refreshAll}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#3b82f6';
              }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ 
        maxWidth: '1600px', 
        margin: '0 auto', 
        padding: '32px 40px'
      }}>
        {/* Key Metrics Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <StatCard
            title="Total Items"
            value={stats?.totalItems.toLocaleString()}
            icon={Package}
            color="#3b82f6"
            trend={12}
          />
          <StatCard
            title="Data Health"
            value={`${healthScore}%`}
            icon={Heart}
            color={
              healthScore >= 80 ? '#10b981' :
              healthScore >= 60 ? '#f59e0b' :
              healthScore >= 40 ? '#f97316' : '#ef4444'
            }
          />
          <StatCard
            title="Missing Categories"
            value={stats?.itemsWithoutCategory.toLocaleString()}
            icon={AlertCircle}
            color="#f97316"
          />
          <StatCard
            title="Missing Prices"
            value={(stats?.itemsWithoutPrices ?? 0).toLocaleString()}
            icon={DollarSign}
            color="#ef4444"
          />
        </div>

        {/* Top Panels Section - Data Health and Random Item */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 400px',
          gap: '24px'
        }}>
          {/* Health Score and Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Health Score Visual */}
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '32px', alignItems: 'center' }}>
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={radialData}>
                      <RadialBar dataKey="value" cornerRadius={10} fill={radialData[0]?.fill || '#3b82f6'} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                        <tspan style={{ fontSize: '32px', fontWeight: 'bold', fill: radialData[0]?.fill || '#3b82f6' }}>
                          {healthScore}%
                        </tspan>
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>
                    Database Health Analysis
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {stats && stats.itemsWithoutCategory === 0 ? (
                        <CheckCircle size={20} color="#10b981" />
                      ) : (
                        <AlertCircle size={20} color="#f97316" />
                      )}
                      <span style={{ color: '#e5e5e5' }}>
                        {stats && stats.itemsWithoutCategory === 0 ? 'All items categorized' : `${stats?.itemsWithoutCategory.toLocaleString()} items missing categories`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {stats && (stats?.itemsWithoutPrices ?? 0) === 0 ? (
                        <CheckCircle size={20} color="#10b981" />
                      ) : (
                        <XCircle size={20} color="#ef4444" />
                      )}
                      <span style={{ color: '#e5e5e5' }}>
                        {stats && (stats?.itemsWithoutPrices ?? 0) === 0 ? 'All items have price data' : `${(stats?.itemsWithoutPrices ?? 0).toLocaleString()} items without prices`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle size={20} color="#10b981" />
                      <span style={{ color: '#e5e5e5' }}>Icons generated programmatically</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Category Distribution Pie Chart */}
            <Card>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                  Category Distribution
                </h3>
                <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
                  Item categories by count
                </p>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                    formatter={(value: any) => [value, 'Items']}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#e5e5e5' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Enhanced Item Showcase */}
          <Card>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Shuffle size={20} color="#3b82f6" />
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                    Random Item Display
                  </h3>
                </div>
                <button
                  onClick={manualRefreshItem}
                  disabled={isItemRefreshing}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: isItemRefreshing ? '#333' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isItemRefreshing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    opacity: isItemRefreshing ? 0.6 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!isItemRefreshing) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isItemRefreshing) {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }
                  }}
                >
                  <RefreshCw size={14} style={{ animation: isItemRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                  {isItemRefreshing ? 'Loading...' : 'Manual Refresh'}
                </button>
              </div>
              
              {/* Refresh Controls */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                backgroundColor: '#0a0a0a',
                borderRadius: '8px',
                border: '1px solid #2a2a2a',
                fontSize: '12px'
              }}>
                <span style={{ color: '#888', fontWeight: '500' }}>Refresh:</span>
                <select
                  value={itemRotateInterval}
                  onChange={(e) => setItemRotateInterval(Number(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#1a1a1a',
                    color: '#e5e5e5',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {REFRESH_FREQUENCIES.map(freq => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
                
                {itemRotateInterval > 0 && (
                  <>
                    <button
                      onClick={togglePause}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: isPaused ? '#f59e0b' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {isPaused ? <Play size={12} /> : <Pause size={12} />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    
                    <span style={{ color: '#666', marginLeft: 'auto' }}>
                      {isPaused ? 'Paused' : `Next in: ${countdown}s`}
                    </span>
                  </>
                )}
              </div>
            </div>
            {/* Enhanced Item Display using ItemIcon */}
            {randomItem ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                padding: '20px'
              }}>
                {/* Item Icon Display - Clean, no borders */}
                <ItemIcon
                  itemId={randomItem.itemId ?? randomItem.id}
                  enchantment={randomItem.enchantmentLevel ?? randomItem.enchantment ?? 0}
                  quality={2} // Good quality for demo
                  size="large" // 128px
                  alt={randomItem.name}
                />
                
                {/* Item Details */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <h4 style={{ 
                    fontSize: '20px', 
                    fontWeight: '600',
                    color: '#fff',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.3px'
                  }}>
                    {randomItem.name}
                  </h4>
                  
                  <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#888',
                    fontFamily: 'monospace',
                    marginBottom: '20px',
                    border: '1px solid #2a2a2a'
                  }}>
                    <Package size={12} />
                    {randomItem.itemId ?? randomItem.id}
                  </div>
                  
                  {/* Properties Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '12px 24px',
                    textAlign: 'left',
                    padding: '20px',
                    backgroundColor: '#0a0a0a',
                    borderRadius: '12px',
                    border: '1px solid #1a1a1a',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: '#888', fontWeight: '500' }}>Item ID:</span>
                    <span style={{ color: '#e5e5e5', fontFamily: 'monospace' }}>{randomItem.itemId ?? randomItem.id}</span>
                    
                    <span style={{ color: '#888', fontWeight: '500' }}>Tier:</span>
                    <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>T{randomItem.tier}</span>
                    
                    <span style={{ color: '#888', fontWeight: '500' }}>Enchantment:</span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{randomItem.enchantmentLevel ?? randomItem.enchantment ?? 0}</span>
                    
                    {randomItem.category && (
                      <>
                        <span style={{ color: '#888', fontWeight: '500' }}>Category:</span>
                        <span style={{ color: '#e5e5e5' }}>{randomItem.category}</span>
                      </>
                    )}
                    
                    {randomItem.subcategory && (
                      <>
                        <span style={{ color: '#888', fontWeight: '500' }}>Subcategory:</span>
                        <span style={{ color: '#e5e5e5' }}>{randomItem.subcategory}</span>
                      </>
                    )}
                    
                    <span style={{ color: '#888', fontWeight: '500' }}>Added:</span>
                    <span style={{ color: '#e5e5e5' }}>
                      {randomItem.createdAt ? new Date(randomItem.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                color: '#666',
                backgroundColor: '#111',
                borderRadius: '12px',
                border: '1px solid #2a2a2a'
              }}>
                <Package size={48} color="#333" />
                <p style={{ fontSize: '16px', color: '#666' }}>No item loaded</p>
                <button
                  onClick={manualRefreshItem}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Load Random Item
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Auto-Refresh Settings Panel - Full Width */}
        <div style={{ marginTop: '32px' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Settings size={20} color="#3b82f6" />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                Auto-Refresh Settings
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px',
                  color: '#999'
                }}>
                  Dashboard Refresh
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0a0a0a',
                    color: '#e5e5e5',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <option value={0}>Disabled</option>
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                </select>
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px',
                  color: '#999'
                }}>
                  Item Showcase Rotation
                </label>
                <select
                  value={itemRotateInterval}
                  onChange={(e) => setItemRotateInterval(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0a0a0a',
                    color: '#e5e5e5',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {REFRESH_FREQUENCIES.map(freq => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label} - {freq.description}
                    </option>
                  ))}
                </select>
              </div>
              {itemRotateInterval > 0 && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  gridColumn: 'span 2'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Timer size={16} color={isPaused ? '#f59e0b' : '#10b981'} />
                    <span style={{ color: '#e5e5e5', fontSize: '14px' }}>
                      {isPaused ? 'Paused' : `Next refresh in: ${countdown}s`}
                    </span>
                  </div>
                  <button
                    onClick={togglePause}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: isPaused ? '#f59e0b' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isPaused ? <Play size={12} /> : <Pause size={12} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                </div>
              )}
            </div>
            <div style={{ marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
              Auto-refresh: {currentFrequency.label} ({currentFrequency.description})
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;