import React, { useState, useEffect } from 'react';
import { FaFilePdf, FaFileExcel, FaPrint, FaChartBar, FaChartPie, FaSync, FaShieldAlt, FaClock, FaCheckCircle } from 'react-icons/fa';
import api from '../../../services/api';
import '../AdminStyles.css';

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reports');
      if (res.data && res.data.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const exportCSV = () => {
    if (!reportData) return;
    const rows = [
      ['Department / Metric', 'Total Issues', 'Resolved', 'Active', 'Efficiency %'],
      ...(reportData.departments || []).map(d => [d.name, d.totalIssues, d.resolvedIssues, d.activeIssues, `${d.efficiencyScore}%`]),
      [],
      ['Ward', 'Ward Name', 'Total Issues', 'Open Issues', 'Resolved Issues', 'Efficiency %'],
      ...(reportData.wards || []).map(w => [w.wardId, w.wardName, w.totalIssues, w.openIssues, w.resolvedIssues, `${w.efficiencyScore}%`])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `municipal_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printSummary = () => {
    window.print();
  };

  const summary = reportData?.summary || {
    resolutionRate: 0,
    avgResolutionDays: 0,
    today: { newIssues: 0, resolved: 0 },
    weekly: { newIssues: 0, resolved: 0 },
    monthly: { newIssues: 0, resolved: 0 },
    yearly: { newIssues: 0, resolved: 0 }
  };

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="admin-top-header">
        <div className="admin-header-title">
          <h1>Civic Reports & Performance Analytics</h1>
          <p>Real-time municipal performance analytics, department turnaround times, and resolution summaries.</p>
        </div>
        <div className="admin-header-actions">
          <button className="admin-btn-secondary" onClick={exportCSV}>
            <FaFileExcel style={{ color: '#10B981' }} /> Export CSV
          </button>
          <button className="admin-btn-primary" onClick={printSummary}>
            <FaPrint /> Print Summary
          </button>
          <button className="admin-refresh-btn" onClick={loadReports}>
            <FaSync className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="admin-grid-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Today's Volume</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', margin: '6px 0' }}>
            {summary.today.newIssues} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748B' }}>New</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            ✓ {summary.today.resolved} Resolved today
          </div>
        </div>

        <div className="admin-grid-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Weekly Volume</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', margin: '6px 0' }}>
            {summary.weekly.newIssues} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748B' }}>New</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            ✓ {summary.weekly.resolved} Resolved this week
          </div>
        </div>

        <div className="admin-grid-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Monthly Volume</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', margin: '6px 0' }}>
            {summary.monthly.newIssues} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748B' }}>New</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            ✓ {summary.monthly.resolved} Resolved this month
          </div>
        </div>

        <div className="admin-grid-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Avg Resolution Speed</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#EA580C', margin: '6px 0' }}>
            {summary.avgResolutionDays} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748B' }}>Days</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#EA580C', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FaClock /> Platform turnaround time
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Department Performance */}
        <div className="admin-grid-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Department Resolution Efficiency</h3>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FFF7ED', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FED7AA' }}>
              <FaChartBar />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(reportData?.departments || []).map((dept, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 700, marginBottom: '4px' }}>
                  <span>{dept.name}</span> <span style={{ color: '#EA580C' }}>{dept.efficiencyScore}%</span>
                </div>
                <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${dept.efficiencyScore}%`, height: '100%', background: 'linear-gradient(90deg, #FB923C, #EA580C)', borderRadius: '10px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ward Resolution Breakdown */}
        <div className="admin-grid-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Ward Performance Rankings</h3>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #BBF7D0' }}>
              <FaChartPie />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(reportData?.wards || []).map((ward, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 700, marginBottom: '4px' }}>
                  <span>{ward.wardName}</span> <span style={{ color: '#16A34A' }}>{ward.efficiencyScore}%</span>
                </div>
                <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${ward.efficiencyScore}%`, height: '100%', background: 'linear-gradient(90deg, #86EFAC, #16A34A)', borderRadius: '10px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
