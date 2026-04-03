import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ShieldCheck, Upload, Clock, BarChart2, LogOut, FlaskConical } from 'lucide-react';

export default function DashboardLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="app-container">
      <div className="sidebar glass-panel" style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
        <div className="sidebar-logo">
          <ShieldCheck size={32} color="var(--accent-color)" />
          GNSS Shield
        </div>
        
        <div className="nav-links">
          <NavLink to="/dashboard/upload" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Upload size={20} />
            Data Upload
          </NavLink>
          <NavLink to="/dashboard/history" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Clock size={20} />
            History Log
          </NavLink>
          <NavLink to="/dashboard/analytics" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <BarChart2 size={20} />
            Analytics
          </NavLink>
          <NavLink to="/dashboard/model-insights" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <FlaskConical size={20} />
            Model Insights
          </NavLink>
        </div>
        
        <div style={{ position: 'absolute', bottom: '2rem', width: 'calc(100% - 4rem)' }}>
          <button onClick={handleLogout} className="btn-outline" style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
      
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
