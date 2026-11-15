import React, { useState, useEffect } from 'react';
import { FaBuilding, FaEye, FaSync, FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import '../AdminStyles.css';

export default function ManageDepartments() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  const loadDepartmentStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/departments');
      if (res.data && Array.isArray(res.data)) {
        setDepartments(res.data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setNotification('Failed to load departments from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartmentStats();
  }, []);

  const handleViewDeptIssues = (deptName) => {
    const keyword = deptName.split(' ')[0];
    navigate(`/admin/manage-issues?search=${encodeURIComponent(keyword)}`);
  };

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="admin-top-header">
        <div className="admin-header-title">
          <h1>Department Administration</h1>
          <p>Monitor civic departments, track active field dispatches, and review real-time resolution rates.</p>
        </div>
        <div className="admin-header-actions">
          <div className="admin-pill-badge">
            <FaShieldAlt /> Civic Divisions
          </div>
          <button onClick={loadDepartmentStats} className="admin-refresh-btn">
            <FaSync className={loading ? 'animate-spin' : ''} /> Refresh Departments
          </button>
        </div>
      </div>

      {notification && (
        <div className="admin-toast-banner">
          {notification}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading municipal departments...</div>
      ) : departments.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          No departments configured.
        </div>
      ) : (
        <div className="admin-grid-cards">
          {departments.map((dept, idx) => (
            <div key={dept.id || idx} className="admin-grid-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div className="admin-card-icon-box">
                    <FaBuilding />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{dept.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '3px', fontWeight: 600 }}>
                      {dept.officerCount} Registered Department Staff
                    </div>
                  </div>
                </div>
                <span style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem' }}>
                  {dept.completionPercentage}% Resolved
                </span>
              </div>

              {/* Resolution Progress Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
                  <span>Resolution Efficiency</span>
                  <span style={{ color: '#EA580C' }}>{dept.completionPercentage}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, dept.completionPercentage)}%`, height: '100%', background: 'linear-gradient(90deg, #FB923C, #EA580C)', borderRadius: '10px' }}></div>
                </div>
              </div>

              <div style={{ padding: '12px 16px', background: '#FFFBF7', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #FED7AA' }}>
                <span style={{ fontSize: '0.85rem', color: '#78350F', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaExclamationTriangle style={{ color: '#EA580C' }} /> Active Work Dispatches:
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#EA580C' }}>
                  {dept.openIssues} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9A3412' }}>Tickets</span>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                <button 
                  className="admin-btn-primary" 
                  style={{ flex: 1, padding: '8px', fontSize: '0.825rem' }} 
                  onClick={() => handleViewDeptIssues(dept.name)}
                >
                  <FaEye /> View Department Work Orders
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
