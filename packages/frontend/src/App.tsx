import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import { ItemIconDemo } from './components/ItemIconDemo';

function HomePage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#111827', 
          marginBottom: '1rem' 
        }}>
          ALB Market
        </h1>
        <p style={{ 
          color: '#4b5563', 
          marginBottom: '2rem' 
        }}>
          Graph-based marketplace platform - Coming Soon!
        </p>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem', 
          fontSize: '0.875rem', 
          color: '#6b7280',
          marginBottom: '2rem'
        }}>
          <p>🚀 Frontend: React + Vite</p>
          <p>⚡ Backend: Node.js + Express</p>
          <p>🔗 Database: Neo4j Graph Database</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            to="/admin"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            🔧 Admin Panel
          </Link>
          <Link
            to="/icons"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#059669',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#047857';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
            }}
          >
            🎨 Item Icons
          </Link>
        </div>
      </div>
    </div>
  );
}

function Navigation() {
  const location = useLocation();
  
  if (location.pathname === '/') {
    return null; // Don't show nav on homepage
  }

  return (
    <nav style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '1rem 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link 
          to="/"
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#1f2937',
            textDecoration: 'none'
          }}
        >
          ALB Market
        </Link>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Link
            to="/"
            style={{
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div>
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/icons" element={<ItemIconDemo />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;