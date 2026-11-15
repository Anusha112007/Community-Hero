import React, { useState, useEffect } from 'react';
import { FiMenu, FiBell, FiLogOut, FiCheckCircle, FiAlertCircle, FiInfo, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import './TopHeader.css';

export default function TopHeader({ title, roleLabel, onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data && Array.isArray(res.data)) {
        setNotifications(res.data);
        const unread = res.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      // Graceful fallback if session expired
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const userInitials = (user?.name || 'CH')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle Sidebar">
          <FiMenu />
        </button>
        <div className="header-brand">
          <span className="brand-title">Community Hero</span>
          <span className="role-badge">{roleLabel || user?.role}</span>
        </div>
      </div>

      <div className="header-center">
        <h1 className="page-main-title">{title}</h1>
      </div>

      <div className="header-right">
        <button 
          className="header-icon-btn" 
          aria-label="Notifications" 
          onClick={() => setShowNotifications(!showNotifications)}
          style={{ position: 'relative' }}
        >
          <FiBell />
          {unreadCount > 0 && <span className="notification-dot"></span>}
        </button>

        {showNotifications && (
          <div className="notifications-dropdown" style={{ minWidth: '320px', maxWidth: '380px' }}>
            <div className="notifications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Notifications ({unreadCount} unread)</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  style={{ background: 'none', border: 'none', color: '#EA580C', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <ul className="notifications-list" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <li style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                  No notifications yet.
                </li>
              ) : (
                notifications.map(n => (
                  <li 
                    key={n._id} 
                    className="notification-item" 
                    onClick={() => handleMarkAsRead(n._id)}
                    style={{ background: n.isRead ? 'transparent' : '#FFF7ED', cursor: 'pointer' }}
                  >
                    <div className={`notification-icon-wrap ${n.type || 'info'}`}>
                      {n.type === 'success' ? <FiCheckCircle /> : n.type === 'alert' ? <FiAlertCircle /> : <FiInfo />}
                    </div>
                    <div className="notification-content">
                      <p style={{ fontWeight: n.isRead ? 400 : 700 }}>{n.title}: {n.message}</p>
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        <div className="user-profile-section" title={user?.name || 'User Profile'}>
          <div className="avatar-placeholder">{userInitials}</div>
        </div>

        <button className="logout-btn" onClick={logout} title="Logout">
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
