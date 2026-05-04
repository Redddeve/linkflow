'use client';

import { useState } from 'react';
import Icon from './Icon';
import { PageHeader, Stat, SiteStatusBadge, InvoiceBadge, Avatar } from './chrome';
import { SEED_SITES, SEED_TASKS, SEED_USERS, STAGES } from '@/lib/data';

// ── Copywriter ──────────────────────────────────────────────────────────────

export function CopywriterHome({ setPage }: { setPage: (p: string) => void }) {
  return (
    <div className="page">
      <PageHeader title="My tasks" sub="Briefs assigned to you." />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Stat label="In progress" value="1" />
        <Stat label="To do" value="2" />
        <Stat label="In review" value="1" />
        <Stat label="Completed (mo)" value="11" metaTone="up" meta="+3 vs last mo" />
      </div>
      <div className="card">
        <div className="card-h">
          <div className="card-h-title">Active tasks</div>
          <div className="tabs">
            <div className="tab active">All</div>
            <div className="tab">Mine</div>
            <div className="tab">Available</div>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Task</th><th>Order</th><th>Site</th><th>Brief</th><th>Status</th><th>Due</th><th /></tr></thead>
          <tbody>
            {SEED_TASKS.map(t => {
              const site = SEED_SITES.find(s => s.id === t.site);
              return (
                <tr key={t.id} className="clickable" onClick={() => setPage('editor')}>
                  <td className="mono">{t.id}</td>
                  <td className="mono muted">{t.orderId}</td>
                  <td className="mono">{site?.domain}</td>
                  <td className="muted" style={{ maxWidth: 320 }}>{t.brief}</td>
                  <td>
                    {t.status === 'in-progress'
                      ? <span className="badge b-write"><span className="dot" />Drafting</span>
                      : t.status === 'review'
                      ? <span className="badge b-review"><span className="dot" />In review</span>
                      : <span className="badge b-neutral"><span className="dot" />To do</span>}
                  </td>
                  <td className="mono muted">{t.due}</td>
                  <td><Icon name="chev" size={14} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CopywriterEditor({ back }: { back: () => void }) {
  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={back}><Icon name="chev" size={12} />Back to tasks</button>
      </div>
      <PageHeader
        title="Write article — site-alpha.com"
        sub={<><span className="mono">T-201</span> · ORD-1042 · Due May 06</>}
        actions={<>
          <button className="btn">Save draft</button>
          <button className="btn btn-primary">Submit for review</button>
        </>}
      />
      <div className="split">
        <div>
          <div className="card" style={{ marginBottom: 16, padding: 14 }}>
            <div className="hstack" style={{ marginBottom: 10 }}>
              <span className="badge b-assign"><span className="dot" />Brief</span>
              <span className="muted text-sm">800 words · informational tone</span>
            </div>
            <div className="text-sm">Write a 800-word informational article about <strong>&ldquo;best widgets&rdquo;</strong>, linking to <span className="mono">/landing-page-1</span> using the anchor &ldquo;best widgets&rdquo;. Avoid direct comparison; focus on buying considerations.</div>
          </div>
          <div className="editor-doc">
            <h1>How to choose the best widgets in 2026</h1>
            <p>Widgets have come a long way since the early days. What was once a single-axis decision — price vs. capability — is now a multidimensional choice that touches your team&rsquo;s workflow, your downstream tooling, and your long-term roadmap.</p>
            <h2>Three things to evaluate first</h2>
            <p>Before you start comparing brands, take a step back and ask three questions about your own context. The team&rsquo;s existing skills are the single biggest predictor of whether a widget will actually get adopted, regardless of its features on paper.</p>
            <p>For most teams, the right starting point is a short list of <span className="anchor">best widgets</span> that fit the way the team already works — then narrow from there based on price and integration support.</p>
            <p style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>[continue draft…]</p>
          </div>
          <div className="hstack" style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 12 }}>
            <span className="mono">312 / 800 words</span>
            <span style={{ marginLeft: 'auto' }}>Auto-saved 2 min ago</span>
          </div>
        </div>
        <div className="card">
          <div className="side-section">
            <div className="side-label">Brief at a glance</div>
            <div className="side-row"><span className="k">Target URL</span><span className="v mono">/landing-page-1</span></div>
            <div className="side-row"><span className="k">Anchor</span><span className="v">&ldquo;best widgets&rdquo;</span></div>
            <div className="side-row"><span className="k">Word count</span><span className="v mono">800</span></div>
            <div className="side-row"><span className="k">Tone</span><span className="v">Informational</span></div>
          </div>
          <div className="side-section">
            <div className="side-label">Site requirements</div>
            <div className="side-row"><span className="k">Domain</span><span className="v mono">site-alpha.com</span></div>
            <div className="side-row"><span className="k">Category</span><span className="v">Tech</span></div>
          </div>
          <div className="side-section">
            <div className="side-label">Comments</div>
            <div className="comment" style={{ padding: '8px 0', borderBottom: 'none' }}>
              <span className="avatar-xs">M</span>
              <div className="body">
                <div className="head"><span className="who">Manager A</span><span className="when">1d ago</span></div>
                <div className="text text-sm">Try to keep H2s under 60 chars for this domain.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sourcer ─────────────────────────────────────────────────────────────────

export function SourcerHome({ setPage }: { setPage: (p: string) => void }) {
  const mine = SEED_SITES.filter(s => s.sourcer === 'Sourcer A');
  return (
    <div className="page">
      <PageHeader
        title="My sites"
        sub="Sites you've submitted to LinkFlow."
        actions={<button className="btn btn-primary" onClick={() => setPage('submit')}><Icon name="plus" size={14} />Submit site</button>}
      />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Stat label="Approved" value="3" meta="earning commissions" metaTone="up" />
        <Stat label="Pending review" value="1" meta="avg. 2d to decision" />
        <Stat label="Rejected (90d)" value="0" />
        <Stat label="Earnings (mo)" value="$320" meta="3 placements" metaTone="up" />
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Domain</th><th>Category</th><th>DR</th><th>Traffic</th><th>Price</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>
            {mine.map(s => (
              <tr key={s.id} className="clickable">
                <td className="mono">{s.domain}</td>
                <td className="muted">{s.category}</td>
                <td className="mono">{s.dr}</td>
                <td className="mono muted">{s.traffic}</td>
                <td className="mono">${s.price}</td>
                <td><SiteStatusBadge status={s.status} /></td>
                <td className="mono muted">Apr 24</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SourcerSubmit({ back }: { back: () => void }) {
  const [domain, setDomain] = useState('');
  const dupe = SEED_SITES.some(s => s.domain.toLowerCase() === domain.toLowerCase());

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={back}><Icon name="chev" size={12} />Back</button>
      </div>
      <PageHeader title="Submit a new site" sub="If approved, you earn commission on every order placed on this site." />
      <div className="split">
        <div className="card card-pad">
          <div className="field">
            <label className="field-label">Domain</label>
            <input className="input" placeholder="example.com" value={domain} onChange={e => setDomain(e.target.value)} />
            {dupe && domain && (
              <div className="text-xs" style={{ color: 'var(--st-rejected-fg)', marginTop: 4 }}>
                This domain already exists in the system.
              </div>
            )}
            {domain && !dupe && (
              <div className="text-xs" style={{ color: 'var(--st-live-fg)', marginTop: 4 }}>
                Domain is unique.
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Category</label>
              <select className="select"><option>Tech</option><option>Finance</option><option>Health</option><option>Lifestyle</option><option>Travel</option></select>
            </div>
            <div className="field">
              <label className="field-label">Niche</label>
              <input className="input" placeholder="SaaS, B2B…" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="field"><label className="field-label">DR</label><input className="input" placeholder="0–100" /></div>
            <div className="field"><label className="field-label">Monthly traffic</label><input className="input" placeholder="e.g. 25K" /></div>
            <div className="field"><label className="field-label">Price (USD)</label><input className="input" placeholder="e.g. 250" /></div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Notes for admin</label>
            <textarea className="textarea" placeholder="Editorial guidelines, contact, anything reviewers should know…" />
          </div>
        </div>
        <div className="card">
          <div className="side-section">
            <div className="side-label">How approval works</div>
            <ol style={{ paddingLeft: 18, margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)' }}>
              <li>Admin verifies metrics &amp; ownership</li>
              <li>Decision typically within 2 days</li>
              <li>Approved sites enter the client catalog</li>
              <li>You earn commission on every placement</li>
            </ol>
          </div>
          <div className="side-section">
            <div className="side-label">Commission rate</div>
            <div className="side-row"><span className="k">Tier</span><span className="v">Sourcer A · Tier 2</span></div>
            <div className="side-row"><span className="k">Rate</span><span className="v mono">15%</span></div>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <button
              className="btn btn-primary"
              disabled={!domain || dupe}
              style={{ width: '100%', justifyContent: 'center', opacity: !domain || dupe ? 0.5 : 1, cursor: !domain || dupe ? 'not-allowed' : 'pointer' }}
              onClick={back}
            >
              Submit for review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SourcerEarnings() {
  return (
    <div className="page">
      <PageHeader title="Commissions" sub="Earnings from approved sites." actions={<button className="btn"><Icon name="ext" size={14} />Export</button>} />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat label="This month" value="$320" meta="+$80 vs last month" metaTone="up" />
        <Stat label="Pending payout" value="$140" meta="Pays May 15" />
        <Stat label="Lifetime" value="$2,180" meta="14 placements" />
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><div className="card-h-title">Earnings — last 6 months</div></div>
        <div style={{ padding: 20 }}>
          <div className="bar-chart">
            {[180, 240, 200, 260, 240, 320].map((v, i) => (
              <div key={i} className="bar" style={{ height: `${(v / 320) * 100}%` }} title={`$${v}`} />
            ))}
          </div>
          <div className="bar-x">
            {['Dec','Jan','Feb','Mar','Apr','May'].map(m => <span key={m}>{m}</span>)}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-h"><div className="card-h-title">Recent placements</div></div>
        <table className="table">
          <thead><tr><th>Order</th><th>Site</th><th>Client</th><th>Date</th><th>Sale</th><th>Your commission</th></tr></thead>
          <tbody>
            {([
              ['ORD-1042', 'site-alpha.com', 'Client A', 'Apr 28', 320, 48],
              ['ORD-1040', 'site-theta.com', 'Client B', 'Apr 22', 380, 57],
              ['ORD-1039', 'site-alpha.com', 'Client C', 'Apr 18', 320, 48],
              ['ORD-1035', 'site-alpha.com', 'Client C', 'Apr 14', 320, 48],
            ] as const).map((row, i) => (
              <tr key={i}>
                <td className="mono">{row[0]}</td>
                <td className="mono">{row[1]}</td>
                <td>{row[2]}</td>
                <td className="mono muted">{row[3]}</td>
                <td className="mono">${row[4]}</td>
                <td className="mono" style={{ color: 'var(--st-live-fg)', fontWeight: 500 }}>+${row[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Admin ────────────────────────────────────────────────────────────────────

export function AdminHome({ setPage }: { setPage: (p: string) => void }) {
  return (
    <div className="page">
      <PageHeader title="System overview" sub="Health and key metrics across LinkFlow." />
      <div className="stats">
        <Stat label="MRR" value="$18.4K" meta="+12% vs last mo" metaTone="up" />
        <Stat label="Active orders" value="6" meta="across 4 clients" />
        <Stat label="Pending site reviews" value="4" meta="oldest 1d" metaTone="down" />
        <Stat label="Overdue invoices" value="$700" meta="1 invoice" metaTone="down" />
      </div>
      <div className="split" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card">
          <div className="card-h"><div className="card-h-title">Orders by stage — last 30 days</div></div>
          <div style={{ padding: 20 }}>
            <div className="bar-chart" style={{ height: 160 }}>
              {STAGES.map((s, i) => {
                const v = [3, 4, 6, 5, 4, 9][i];
                return <div key={s.id} className="bar" style={{ height: `${(v / 10) * 100}%` }} title={`${s.label}: ${v}`} />;
              })}
            </div>
            <div className="bar-x">
              {STAGES.map(s => <span key={s.id}>{s.short}</span>)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-h">
            <div className="card-h-title">Action queue</div>
            <button className="btn btn-sm" onClick={() => setPage('approvals')}>View all</button>
          </div>
          <div className="side-section">
            <div className="hstack">
              <Icon name="check" />
              <div>
                <div style={{ fontWeight: 500 }}>4 sites awaiting approval</div>
                <div className="text-xs muted">Oldest submitted 1 day ago</div>
              </div>
              <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setPage('approvals')}>Review</button>
            </div>
          </div>
          <div className="side-section">
            <div className="hstack">
              <Icon name="cash" />
              <div>
                <div style={{ fontWeight: 500 }}>1 invoice overdue</div>
                <div className="text-xs muted">INV-3013 · Client C · $700</div>
              </div>
              <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setPage('finance')}>Open</button>
            </div>
          </div>
          <div className="side-section">
            <div className="hstack">
              <Icon name="team" />
              <div>
                <div style={{ fontWeight: 500 }}>2 user invitations pending</div>
                <div className="text-xs muted">Sent &gt; 3 days ago</div>
              </div>
              <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setPage('users')}>Manage</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminApprovals() {
  const pending = SEED_SITES.filter(s => s.status === 'pending');
  return (
    <div className="page">
      <PageHeader title="Site approvals" sub="Review submitted sites and approve or reject." />
      <div className="filterbar">
        <div className="tabs">
          <div className="tab active">Pending ({pending.length})</div>
          <div className="tab">Approved</div>
          <div className="tab">Rejected</div>
        </div>
      </div>
      <div className="vstack">
        {pending.map(s => (
          <div key={s.id} className="card">
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1.5fr 2fr auto', gap: 24, alignItems: 'center' }}>
              <div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{s.domain}</div>
                <div className="text-xs muted">Submitted by {s.sourcer} · {s.category}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <div><div className="text-xs muted">DR</div><div className="mono" style={{ fontWeight: 500 }}>{s.dr}</div></div>
                <div><div className="text-xs muted">Traffic</div><div className="mono" style={{ fontWeight: 500 }}>{s.traffic}</div></div>
                <div><div className="text-xs muted">Price</div><div className="mono" style={{ fontWeight: 500 }}>${s.price}</div></div>
              </div>
              <div className="hstack">
                <button className="btn btn-danger">Reject</button>
                <button className="btn btn-primary"><Icon name="check" size={14} />Approve</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminUsers() {
  return (
    <div className="page">
      <PageHeader title="Users" sub="All accounts on LinkFlow." actions={<button className="btn btn-primary"><Icon name="plus" size={14} />Invite user</button>} />
      <div className="filterbar">
        <input className="input" placeholder="Search…" style={{ width: 280 }} />
        <button className="btn btn-sm"><Icon name="filter" size={12} />Role</button>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Name</th><th>Role</th><th>Orders</th><th>Member since</th><th /></tr></thead>
          <tbody>
            {SEED_USERS.map(u => (
              <tr key={u.name} className="clickable">
                <td className="hstack"><Avatar name={u.name} /><span style={{ fontWeight: 500 }}>{u.name}</span></td>
                <td><span className="badge b-neutral"><span className="dot" />{u.role}</span></td>
                <td className="mono">{u.orders}</td>
                <td className="mono muted">{u.since}</td>
                <td><button className="btn btn-sm btn-ghost"><Icon name="more" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
