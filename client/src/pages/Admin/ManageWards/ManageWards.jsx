import React, { useState, useEffect } from 'react';
import { FaMapMarkedAlt, FaUserTie, FaEye, FaEdit, FaUserPlus, FaShieldAlt, FaSync, FaPhoneAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import '../AdminStyles.css';

export default function ManageWards() {
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  const loadWards = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/wards');
      if (res.data && Array.isArray(res.data)) {
        setWards(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin wards:', err);
      setNotification('Failed to load wards from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWards();
  }, []);

  const handleViewWardIssues = (wardId) => {
    navigate(`/admin/manage-issues?search=${encodeURIComponent(wardId)}`);
  };

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="admin-top-header">
        <div className="admin-header-title">
          <h1>Ward Administration & Jurisdictions</h1>
          <p>Monitor municipal wards, population density, assigned officers, and real-time civic efficiency scores.</p>
        </div>
        <div className="admin-header-actions">
          <div className="admin-pill-badge">
            <FaShieldAlt /> Municipal Jurisdictions
          </div>
          <button onClick={loadWards} className="admin-refresh-btn">
            <FaSync className={loading ? 'animate-spin' : ''} /> Refresh Wards
          </button>
        </div>
      </div>

      {notification && (
        <div className="admin-toast-banner">
          {notification}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading municipal wards...</div>
      ) : wards.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          No wards configured.
        </div>
      ) : (
        <div className="admin-grid-cards">
          {wards.map((ward, idx) => (
            <div key={ward.wardId || idx} className="admin-grid-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="admin-card-icon-box">
                    <FaMapMarkedAlt />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{ward.wardNumber}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                      ID: <span style={{ fontFamily: 'monospace', color: '#EA580C' }}>{ward.wardId}</span> • Pop: {ward.population?.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EA580C' }}>{ward.performanceScore}%</div>
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Resolution Rate</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', color: '#334155', background: '#FFFBF7', padding: '12px', borderRadius: '10px', border: '1px solid #FED7AA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaUserTie style={{ color: '#EA580C', fontSize: '1.1rem' }} />
                  <span>Ward Officer: <strong style={{ color: '#0F172A' }}>{ward.wardOfficer}</strong></span>
                </div>
                {ward.officerPhone && (
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaPhoneAlt style={{ fontSize: '0.7rem' }} /> {ward.officerPhone}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#FFFBEB', padding: '12px', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 700 }}>Open Issues</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#B45309', marginTop: '2px' }}>{ward.openIssues}</div>
                </div>
                <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>Resolved Issues</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>{ward.resolvedIssues}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                <button 
                  className="admin-btn-primary" 
                  style={{ flex: 1, padding: '8px', fontSize: '0.825rem' }} 
                  onClick={() => handleViewWardIssues(ward.wardId)}
                >
                  <FaEye /> View Ward Complaints ({ward.totalIssues})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
