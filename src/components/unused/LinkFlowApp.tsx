'use client';

import { useState, useEffect, useRef } from 'react';
import { Sidebar, Topbar, PageHeader } from './chrome';
import { ROLES, NAV } from '@/lib/data';
import {
  ClientHome, ClientOrders, NewOrder, ClientOrderDetail,
  ApproveContent, ClientCatalog, ClientInvoices,
} from './ClientScreens';
import {
  ManagerHome, ManagerPipeline, ManagerOrders, ManagerOrderDetail,
  ManagerTeam, ManagerSites, AdminFinance,
} from './ManagerScreens';
import {
  CopywriterHome, CopywriterEditor,
  SourcerHome, SourcerSubmit, SourcerEarnings,
  AdminHome, AdminApprovals, AdminUsers,
} from './OtherRoleScreens';
import Icon from './Icon';

const ACCENT_HUES = [270, 240, 200, 145, 30, 350];

export default function LinkFlowApp() {
  const [role, setRole] = useState('manager');
  const [page, setPage] = useState('home');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [accentHue, setAccentHue] = useState(270);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const lastRole = useRef(role);
  useEffect(() => {
    if (lastRole.current !== role) {
      setPage('home');
      setOrderId(null);
      lastRole.current = role;
    }
  }, [role]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-h', String(accentHue));
  }, [accentHue]);

  const openOrder = (id: string) => { setOrderId(id); setPage('order-detail'); };
  const back = () => {
    setOrderId(null);
    setPage(role === 'client' ? 'orders' : role === 'manager' ? 'pipeline' : 'home');
  };

  const roleObj = ROLES.find(r => r.id === role)!;
  const navItem = (NAV[role] ?? []).find(n => n.id === page);
  const crumbs = ['LinkFlow', roleObj.label];
  if (navItem) crumbs.push(navItem.label);
  if (page === 'order-detail' && orderId) crumbs.push(orderId);
  if (page === 'editor') crumbs.push('Editor');
  if (page === 'submit') crumbs.push('Submit site');
  if (page === 'approve') crumbs.push('Review draft');

  const navigate = (p: string) => { setPage(p); setOrderId(null); };

  let body: React.ReactNode = null;

  if (role === 'client') {
    if (page === 'home')          body = <ClientHome setPage={navigate} openOrder={openOrder} />;
    else if (page === 'orders')   body = <ClientOrders openOrder={openOrder} />;
    else if (page === 'new')      body = <NewOrder setPage={navigate} />;
    else if (page === 'catalog')  body = <ClientCatalog />;
    else if (page === 'approve')  body = <ApproveContent back={() => navigate('home')} />;
    else if (page === 'invoices') body = <ClientInvoices />;
    else if (page === 'order-detail') body = <ClientOrderDetail orderId={orderId!} back={back} />;
    else body = <ClientHome setPage={navigate} openOrder={openOrder} />;
  } else if (role === 'manager') {
    if (page === 'home')              body = <ManagerHome setPage={navigate} openOrder={openOrder} />;
    else if (page === 'pipeline')     body = <ManagerPipeline openOrder={openOrder} />;
    else if (page === 'orders')       body = <ManagerOrders openOrder={openOrder} />;
    else if (page === 'team')         body = <ManagerTeam />;
    else if (page === 'sites')        body = <ManagerSites />;
    else if (page === 'invoices')     body = <AdminFinance />;
    else if (page === 'order-detail') body = <ManagerOrderDetail orderId={orderId!} back={back} />;
    else body = <ManagerHome setPage={navigate} openOrder={openOrder} />;
  } else if (role === 'copywriter') {
    if (page === 'home')        body = <CopywriterHome setPage={navigate} />;
    else if (page === 'editor') body = <CopywriterEditor back={() => navigate('home')} />;
    else if (page === 'archive') body = (
      <div className="page">
        <PageHeader title="Archive" sub="Completed tasks." />
        <div className="card empty">No archived tasks in this preview.</div>
      </div>
    );
    else body = <CopywriterHome setPage={navigate} />;
  } else if (role === 'sourcer') {
    if (page === 'home')          body = <SourcerHome setPage={navigate} />;
    else if (page === 'submit')   body = <SourcerSubmit back={() => navigate('home')} />;
    else if (page === 'earnings') body = <SourcerEarnings />;
    else body = <SourcerHome setPage={navigate} />;
  } else if (role === 'admin') {
    if (page === 'home')           body = <AdminHome setPage={navigate} />;
    else if (page === 'approvals') body = <AdminApprovals />;
    else if (page === 'users')     body = <AdminUsers />;
    else if (page === 'finance')   body = <AdminFinance />;
    else if (page === 'settings')  body = (
      <div className="page">
        <PageHeader title="Settings" sub="System configuration." />
        <div className="card empty">Settings — placeholder</div>
      </div>
    );
    else body = <AdminHome setPage={navigate} />;
  }

  return (
    <div className="app">
      <Sidebar role={role} page={page} setPage={navigate} />
      <div className="main">
        <Topbar crumbs={crumbs} />
        {body}
      </div>

      {/* Tweaks toggle button */}
      <button
        onClick={() => setTweaksOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 200,
          background: 'var(--accent)', color: 'white',
          border: 'none', borderRadius: 8, padding: '8px 14px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: tweaksOpen ? 'none' : 'flex',
          alignItems: 'center', gap: 6,
        }}
      >
        <Icon name="settings" size={13} /> Tweaks
      </button>

      {/* Tweaks panel */}
      {tweaksOpen && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 200,
          width: 280, background: 'rgba(250,249,247,0.92)',
          backdropFilter: 'blur(20px)',
          border: '0.5px solid rgba(255,255,255,0.6)',
          borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          fontFamily: 'var(--font-sans)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Tweaks</span>
            <button onClick={() => setTweaksOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(0,0,0,0.5)', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(41,38,27,0.45)', marginBottom: 8 }}>Active role</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 6, border: 'none',
                      background: role === r.id ? 'var(--accent-soft)' : 'transparent',
                      color: role === r.id ? 'var(--accent-text)' : 'inherit',
                      fontWeight: role === r.id ? 600 : 400,
                      cursor: 'pointer', fontSize: 13, textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: role === r.id ? 'var(--accent)' : 'var(--surface-3)',
                      color: role === r.id ? 'white' : 'var(--text-muted)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>{r.initial}</span>
                    {r.name} <span style={{ opacity: 0.5, fontWeight: 400 }}>({r.label})</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(41,38,27,0.45)', marginBottom: 8 }}>Accent color</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                {ACCENT_HUES.map(h => (
                  <button
                    key={h}
                    onClick={() => setAccentHue(h)}
                    title={`hue ${h}`}
                    style={{
                      aspectRatio: '1', borderRadius: 6,
                      background: `oklch(0.55 0.17 ${h})`,
                      border: accentHue === h ? '2px solid white' : '2px solid transparent',
                      outline: accentHue === h ? `2px solid oklch(0.55 0.17 ${h})` : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
