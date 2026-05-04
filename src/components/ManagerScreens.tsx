'use client';

import { useState } from 'react';
import Icon from './Icon';
import { PageHeader, Stat, StageBadge, InvoiceBadge, Avatar, Stepper } from './chrome';
import { SEED_ORDERS, SEED_SITES, SEED_INVOICES, STAGES } from '@/lib/data';

export function ManagerHome({ setPage, openOrder }: { setPage: (p: string) => void; openOrder: (id: string) => void }) {
  const cols = STAGES.map(st => ({ ...st, orders: SEED_ORDERS.filter(o => o.stage === st.id) }));
  return (
    <div className="page">
      <PageHeader
        title="Operations dashboard"
        sub="All active orders across your team."
        actions={<>
          <button className="btn"><Icon name="filter" size={14} />Filters</button>
          <button className="btn btn-primary"><Icon name="plus" size={14} />New order</button>
        </>}
      />
      <div className="stats">
        <Stat label="In flight" value="6" meta="across 4 clients" />
        <Stat label="Need attention" value="2" meta="overdue or stalled" metaTone="down" />
        <Stat label="Published this week" value="9" meta="+2 vs last week" metaTone="up" />
        <Stat label="Team utilization" value="78%" meta="3 writers active" />
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div className="kanban">
          {cols.map(col => (
            <div key={col.id} className="kcol">
              <div className="kcol-h">
                <div className="kcol-title">{col.label}</div>
                <div className="kcol-count">{col.orders.length}</div>
              </div>
              <div className="kcol-body">
                {col.orders.map(o => (
                  <div key={o.id} className="kcard" onClick={() => openOrder(o.id)}>
                    <div className="kcard-id">{o.id}</div>
                    <div className="kcard-title">{o.target}</div>
                    <div className="kcard-meta">
                      <span>{o.client}</span>
                      <span className="hstack" style={{ gap: 4 }}>
                        <span className="mono faint">{o.sites.length}×</span>
                        <span className="avatar-xs">{o.copywriter ? o.copywriter.slice(-1) : '?'}</span>
                      </span>
                    </div>
                    <div className="kcard-meta" style={{ marginTop: 6 }}>
                      <span className="faint mono text-xs">Due {o.due}</span>
                      <span className="mono text-xs">${o.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ManagerPipeline({ openOrder }: { openOrder: (id: string) => void }) {
  return <ManagerHome setPage={() => {}} openOrder={openOrder} />;
}

export function ManagerOrders({ openOrder }: { openOrder: (id: string) => void }) {
  return (
    <div className="page">
      <PageHeader title="All orders" sub="Every order across all clients." actions={<button className="btn btn-primary"><Icon name="plus" size={14} />New order</button>} />
      <div className="filterbar">
        <input className="input" placeholder="Search by ID, client, anchor…" style={{ width: 320 }} />
        <button className="btn btn-sm"><Icon name="filter" size={12} />Stage</button>
        <button className="btn btn-sm"><Icon name="filter" size={12} />Client</button>
        <button className="btn btn-sm"><Icon name="filter" size={12} />Writer</button>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Order</th><th>Client</th><th>Target</th><th>Sites</th><th>Writer</th><th>Stage</th><th>Due</th><th>Amount</th></tr></thead>
          <tbody>
            {SEED_ORDERS.map(o => (
              <tr key={o.id} className="clickable" onClick={() => openOrder(o.id)}>
                <td className="mono">{o.id}</td>
                <td>{o.client}</td>
                <td>{o.target}</td>
                <td className="mono">{o.sites.length}</td>
                <td>{o.copywriter
                  ? <span className="hstack"><Avatar name={o.copywriter} /><span>{o.copywriter}</span></span>
                  : <span className="faint">unassigned</span>}
                </td>
                <td><StageBadge stage={o.stage} /></td>
                <td className="mono muted">{o.due}</td>
                <td className="mono">${o.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ManagerOrderDetail({ orderId, back }: { orderId: string; back: () => void }) {
  const order = SEED_ORDERS.find(o => o.id === orderId) ?? SEED_ORDERS[0];
  const sites = order.sites.map(id => SEED_SITES.find(s => s.id === id)!).filter(Boolean);
  const [showAssign, setShowAssign] = useState(false);

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={back}><Icon name="chev" size={12} />Back</button>
      </div>
      <PageHeader
        title={<><span className="mono" style={{ fontSize: 15, color: 'var(--text-muted)', marginRight: 10 }}>{order.id}</span>{order.target}</>}
        sub={<>{order.client} · Anchor &ldquo;{order.anchor}&rdquo; · Created {order.created}</>}
        actions={<>
          <button className="btn" onClick={() => setShowAssign(true)}>Assign writer</button>
          <button className="btn btn-primary">Advance stage <Icon name="arrow" size={14} /></button>
        </>}
      />
      <Stepper currentStage={order.stage} />
      <div className="split">
        <div className="vstack">
          <div className="card">
            <div className="card-h">
              <div className="card-h-title">Tasks</div>
              <button className="btn btn-sm"><Icon name="plus" size={12} />Add task</button>
            </div>
            <table className="table">
              <thead><tr><th>Task</th><th>Site</th><th>Writer</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {sites.map((s, i) => (
                  <tr key={s.id}>
                    <td><span className="mono faint">T-{200 + i}</span> · Write article</td>
                    <td className="mono">{s.domain}</td>
                    <td>{order.copywriter
                      ? <span className="hstack"><Avatar name={order.copywriter} /><span>{order.copywriter}</span></span>
                      : <span className="faint">unassigned</span>}
                    </td>
                    <td>{i === 0
                      ? <span className="badge b-write"><span className="dot" />Drafting</span>
                      : <span className="badge b-neutral"><span className="dot" />To do</span>}
                    </td>
                    <td className="mono muted">{order.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-h"><div className="card-h-title">Activity</div></div>
            <ul className="activity">
              <li><span className="when">10:24</span><span><span className="who">Writer A</span> submitted draft for site-alpha.com</span></li>
              <li><span className="when">09:12</span><span><span className="who">You</span> assigned Writer A to site-gamma.com</span></li>
              <li><span className="when">Apr 28</span><span><span className="who">You</span> assigned Writer A to site-alpha.com</span></li>
              <li><span className="when">Apr 28</span><span><span className="who">Client A</span> created order with 2 sites</span></li>
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="side-section">
            <div className="side-label">Order</div>
            <div className="side-row"><span className="k">Client</span><span className="v">{order.client}</span></div>
            <div className="side-row"><span className="k">Manager</span><span className="v">{order.manager}</span></div>
            <div className="side-row"><span className="k">Writer</span><span className="v">{order.copywriter ?? <span className="faint">unassigned</span>}</span></div>
          </div>
          <div className="side-section">
            <div className="side-label">Brief</div>
            <div className="side-row"><span className="k">Target</span><span className="v mono">{order.target}</span></div>
            <div className="side-row"><span className="k">Anchor</span><span className="v">&ldquo;{order.anchor}&rdquo;</span></div>
          </div>
          <div className="side-section">
            <div className="side-label">Schedule</div>
            <div className="side-row"><span className="k">Created</span><span className="v mono">{order.created}</span></div>
            <div className="side-row"><span className="k">Due</span><span className="v mono">{order.due}</span></div>
          </div>
          <div className="side-section">
            <div className="side-label">Billing</div>
            <div className="side-row"><span className="k">Amount</span><span className="v mono">${order.amount}</span></div>
            <div className="side-row"><span className="k">Invoice</span><span className="v"><InvoiceBadge status={order.invoiceStatus} /></span></div>
          </div>
        </div>
      </div>

      {showAssign && (
        <div className="modal-bd" onClick={() => setShowAssign(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <div className="modal-h-title">Assign tasks</div>
              <button className="icon-btn" onClick={() => setShowAssign(false)}><Icon name="close" size={14} /></button>
            </div>
            <div className="modal-b">
              <div className="field">
                <label className="field-label">Writer</label>
                <select className="select">
                  <option>Writer A — 2 active tasks</option>
                  <option>Writer B — 1 active task</option>
                  <option>Writer C — 0 active tasks</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Apply to</label>
                <div className="vstack">
                  {sites.map(s => (
                    <label key={s.id} className="check-row selected">
                      <div className="check-box">✓</div>
                      <span className="mono">{s.domain}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Internal note (optional)</label>
                <textarea className="textarea" placeholder="Special instructions…" />
              </div>
            </div>
            <div className="modal-f">
              <button className="btn" onClick={() => setShowAssign(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setShowAssign(false)}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ManagerTeam() {
  return (
    <div className="page">
      <PageHeader title="Team" sub="Workload and recent activity." actions={<button className="btn"><Icon name="plus" size={14} />Invite</button>} />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat label="Active writers" value="3" meta="of 4 total" />
        <Stat label="Avg. tasks / writer" value="2.0" meta="balanced" />
        <Stat label="Pending writer pickup" value="2" meta="2 unassigned tasks" metaTone="down" />
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Member</th><th>Role</th><th>Active tasks</th><th>This week</th><th>Avg. turnaround</th><th /></tr></thead>
          <tbody>
            {([
              ['Writer A', 'Copywriter', 2, 4, '2.1d'],
              ['Writer B', 'Copywriter', 1, 3, '1.8d'],
              ['Writer C', 'Copywriter', 1, 2, '2.5d'],
              ['Sourcer A', 'Sourcer', '—', 3, '—'],
              ['Sourcer B', 'Sourcer', '—', 2, '—'],
            ] as const).map(([n, r, a, w, t]) => (
              <tr key={n} className="clickable">
                <td className="hstack"><Avatar name={n} /><span style={{ fontWeight: 500 }}>{n}</span></td>
                <td className="muted">{r}</td>
                <td className="mono">{a}</td>
                <td className="mono">{w}</td>
                <td className="mono muted">{t}</td>
                <td><button className="btn btn-sm btn-ghost"><Icon name="more" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ManagerSites() {
  return (
    <div className="page">
      <PageHeader title="Sites" sub="All approved sites in the catalog." />
      <div className="card">
        <table className="table">
          <thead><tr><th>Domain</th><th>Category</th><th>DR</th><th>Traffic</th><th>Price</th><th>Sourcer</th><th>Status</th></tr></thead>
          <tbody>
            {SEED_SITES.map(s => (
              <tr key={s.id} className="clickable">
                <td className="mono">{s.domain}</td>
                <td className="muted">{s.category}</td>
                <td className="mono">{s.dr}</td>
                <td className="mono muted">{s.traffic}</td>
                <td className="mono">${s.price}</td>
                <td className="muted">{s.sourcer}</td>
                <td>
                  <span className={`badge ${s.status === 'approved' ? 'b-live' : s.status === 'pending' ? 'b-write' : 'b-rejected'}`}>
                    <span className="dot" />{s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminFinance() {
  return (
    <div className="page">
      <PageHeader title="Finance" sub="Invoices and payouts across the system." />
      <div className="stats">
        <Stat label="Outstanding (all)" value="$1,640" meta="3 invoices" />
        <Stat label="Paid (90d)" value="$8,420" meta="+18%" metaTone="up" />
        <Stat label="Overdue" value="$700" meta="1 invoice" metaTone="down" />
        <Stat label="Sourcer payouts (mo)" value="$540" meta="due May 15" />
      </div>
      <div className="card">
        <div className="card-h"><div className="card-h-title">All invoices</div></div>
        <table className="table">
          <thead><tr><th>Invoice</th><th>Client</th><th>Order</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {SEED_INVOICES.map(inv => (
              <tr key={inv.id} className="clickable">
                <td className="mono">{inv.id}</td>
                <td>{inv.client}</td>
                <td className="mono muted">{inv.order}</td>
                <td className="mono muted">{inv.issued}</td>
                <td className="mono muted">{inv.due}</td>
                <td className="mono">${inv.amount}</td>
                <td><InvoiceBadge status={inv.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
