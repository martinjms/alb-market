import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseStats, RandomItem, ApiResponse } from '@alb-market/shared';

interface AdminPanelProps {}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [randomItem, setRandomItem] = useState<RandomItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // seconds
  const [autoRotate, setAutoRotate] = useState(true);
  const [itemRotateInterval, setItemRotateInterval] = useState<number>(10); // seconds
  const [isRefreshing, setIsRefreshing] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const fetchStats = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`);
      const data: ApiResponse<DatabaseStats> = await response.json();
      
      if (data.success && data.data) {
        setStats(data.data);
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

  const fetchRandomItem = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/random-item`);
      const data: ApiResponse<RandomItem> = await response.json();
      
      if (data.success && data.data) {
        setRandomItem(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch random item:', err);
    }
  }, [API_BASE_URL]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchStats(), fetchRandomItem()]);
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

  useEffect(() => {
    if (autoRotate && itemRotateInterval > 0) {
      const interval = setInterval(fetchRandomItem, itemRotateInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRotate, itemRotateInterval, fetchRandomItem]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getHealthLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'needs-improvement': return 'Needs Work';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  };

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
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid #333',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p>Loading admin panel...</p>
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
        minHeight: '100vh'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '30px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '15px' }}>Error Loading Dashboard</h2>
          <p style={{ color: '#999', marginBottom: '20px' }}>{error}</p>
          <button
            onClick={refreshAll}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Retry
          </button>
        </div>
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
      {/* Header */}
      <div style={{ 
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #333',
        padding: '20px 40px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: '#fff',
            margin: 0
          }}>
            ALB Market Admin Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {isRefreshing && (
              <span style={{ 
                color: '#3b82f6',
                fontSize: '14px',
                animation: 'pulse 2s infinite'
              }}>
                Refreshing...
              </span>
            )}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
            <span style={{ color: '#666', fontSize: '14px' }}>
              Last updated: {stats ? new Date(stats.lastUpdated).toLocaleTimeString() : '-'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '0 40px 40px'
      }}>
        {/* Controls */}
        <div style={{ 
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#fff' }}>Settings</h3>
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontSize: '14px',
                color: '#999'
              }}>
                Stats Refresh Interval
              </label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#0a0a0a',
                  color: '#e5e5e5',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  cursor: 'pointer'
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
                marginBottom: '5px', 
                fontSize: '14px',
                color: '#999'
              }}>
                Item Rotation
              </label>
              <select
                value={itemRotateInterval}
                onChange={(e) => setItemRotateInterval(Number(e.target.value))}
                disabled={!autoRotate}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#0a0a0a',
                  color: autoRotate ? '#e5e5e5' : '#666',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  cursor: autoRotate ? 'pointer' : 'not-allowed'
                }}
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ color: '#999' }}>Auto-rotate items</span>
              </label>
            </div>
            <div style={{ paddingTop: '20px' }}>
              <button
                onClick={refreshAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                Refresh Now
              </button>
            </div>
          </div>
        </div>

        {stats && (
          <>
            {/* Key Metrics */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{ 
                padding: '20px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                <h3 style={{ 
                  fontSize: '14px', 
                  color: '#999',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Items
                </h3>
                <p style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold',
                  color: '#3b82f6',
                  margin: 0
                }}>
                  {stats.totalItems.toLocaleString()}
                </p>
              </div>

              <div style={{ 
                padding: '20px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                <h3 style={{ 
                  fontSize: '14px', 
                  color: '#999',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Data Health
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <p style={{ 
                    fontSize: '32px', 
                    fontWeight: 'bold',
                    color: getHealthColor(stats.dataHealth.score),
                    margin: 0
                  }}>
                    {stats.dataHealth.score}%
                  </p>
                  <span style={{ 
                    color: getHealthColor(stats.dataHealth.score),
                    fontSize: '16px'
                  }}>
                    {getHealthLabel(stats.dataHealth.status)}
                  </span>
                </div>
              </div>

              <div style={{ 
                padding: '20px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                <h3 style={{ 
                  fontSize: '14px', 
                  color: '#999',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Missing Icons
                </h3>
                <p style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold',
                  color: stats.itemsWithoutIcon > 0 ? '#f97316' : '#10b981',
                  margin: 0
                }}>
                  {stats.itemsWithoutIcon.toLocaleString()}
                </p>
              </div>

              <div style={{ 
                padding: '20px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                <h3 style={{ 
                  fontSize: '14px', 
                  color: '#999',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Missing Prices
                </h3>
                <p style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold',
                  color: stats.itemsWithoutPrices > 0 ? '#ef4444' : '#10b981',
                  margin: 0
                }}>
                  {stats.itemsWithoutPrices.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}>
              {/* Categories */}
              <div style={{ 
                padding: '20px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                <h2 style={{ 
                  fontSize: '20px', 
                  marginBottom: '20px',
                  color: '#fff'
                }}>
                  Items by Category
                </h2>
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  paddingRight: '10px'
                }}>
                  {stats.itemsByCategory.map((cat) => (
                    <div
                      key={cat.category}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '12px',
                        marginBottom: '8px',
                        backgroundColor: '#0a0a0a',
                        borderRadius: '6px',
                        border: '1px solid #222'
                      }}
                    >
                      <span style={{ 
                        fontWeight: '500',
                        color: '#e5e5e5'
                      }}>
                        {cat.category}
                      </span>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: '#3b82f6'
                      }}>
                        {cat.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Random Item Showcase */}
              <div style={{ 
                padding: '20px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                <h2 style={{ 
                  fontSize: '20px', 
                  marginBottom: '20px',
                  color: '#fff'
                }}>
                  Random Item Showcase
                </h2>
                {randomItem ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px',
                    backgroundColor: '#0a0a0a',
                    borderRadius: '8px',
                    border: '1px solid #222'
                  }}>
                    {randomItem.iconUrl && (
                      <img
                        src={randomItem.iconUrl}
                        alt={randomItem.name}
                        style={{
                          width: '128px',
                          height: '128px',
                          marginBottom: '20px',
                          imageRendering: 'pixelated',
                          backgroundColor: '#222',
                          padding: '10px',
                          borderRadius: '8px'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <h3 style={{ 
                      fontSize: '18px', 
                      marginBottom: '10px',
                      color: '#fff',
                      textAlign: 'center'
                    }}>
                      {randomItem.name}
                    </h3>
                    <div style={{ 
                      fontSize: '14px',
                      color: '#999',
                      textAlign: 'center'
                    }}>
                      <p style={{ margin: '5px 0' }}>
                        <span style={{ color: '#666' }}>ID:</span>{' '}
                        <span style={{ color: '#e5e5e5' }}>{randomItem.itemId}</span>
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        <span style={{ color: '#666' }}>Tier:</span>{' '}
                        <span style={{ 
                          color: '#3b82f6',
                          fontWeight: 'bold'
                        }}>
                          T{randomItem.tier}
                        </span>
                        {randomItem.enchantmentLevel > 0 && (
                          <span style={{ color: '#10b981' }}>
                            .{randomItem.enchantmentLevel}
                          </span>
                        )}
                      </p>
                      {randomItem.category && (
                        <p style={{ margin: '5px 0' }}>
                          <span style={{ color: '#666' }}>Category:</span>{' '}
                          <span style={{ color: '#e5e5e5' }}>{randomItem.category}</span>
                        </p>
                      )}
                      {randomItem.subcategory && (
                        <p style={{ margin: '5px 0' }}>
                          <span style={{ color: '#666' }}>Subcategory:</span>{' '}
                          <span style={{ color: '#e5e5e5' }}>{randomItem.subcategory}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={fetchRandomItem}
                      style={{
                        marginTop: '15px',
                        padding: '8px 16px',
                        backgroundColor: '#333',
                        color: '#e5e5e5',
                        border: '1px solid #444',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#444'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#333'}
                    >
                      Next Item
                    </button>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    color: '#666'
                  }}>
                    Loading item...
                  </div>
                )}
              </div>
            </div>

            {/* Data Quality Summary */}
            <div style={{ 
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                marginBottom: '20px',
                color: '#fff'
              }}>
                Data Quality Summary
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                <div style={{ 
                  padding: '15px',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '6px',
                  border: '1px solid #222'
                }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                    Items with Categories
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                    {((stats.totalItems - stats.itemsWithoutCategory) / stats.totalItems * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ 
                  padding: '15px',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '6px',
                  border: '1px solid #222'
                }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                    Items with Icons
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316' }}>
                    {((stats.totalItems - stats.itemsWithoutIcon) / stats.totalItems * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ 
                  padding: '15px',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '6px',
                  border: '1px solid #222'
                }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                    Items with Prices
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                    {((stats.totalItems - stats.itemsWithoutPrices) / stats.totalItems * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;