'use client';

import { useState } from 'react';
import Icon from './Icon';
import { PageHeader, Stat, SiteStatusBadge, InvoiceBadge, UserAvatar } from './chrome';
import { SEED_SITES, SEED_TASKS, SEED_USERS, STAGES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
      <Card>
        <div className="card-h">
          <div className="card-h-title">Active tasks</div>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="mine">Mine</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
            </TabsList>
          </Tabs>
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
      </Card>
    </div>
  );
}

export function CopywriterEditor({ back }: { back: () => void }) {
  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <Button variant="ghost" size="sm" onClick={back}><Icon name="chev" size={12} />Back to tasks</Button>
      </div>
      <PageHeader
        title="Write article — site-alpha.com"
        sub={<><span className="mono">T-201</span> · ORD-1042 · Due May 06</>}
        actions={<>
          <Button variant="outline">Save draft</Button>
          <Button>Submit for review</Button>
        </>}
      />
      <div className="split">
        <div>
          <Card className="p-3.5 mb-4">
            <div className="hstack" style={{ marginBottom: 10 }}>
              <span className="badge b-assign"><span className="dot" />Brief</span>
              <span className="muted text-sm">800 words · informational tone</span>
            </div>
            <div className="text-sm">Write a 800-word informational article about <strong>&ldquo;best widgets&rdquo;</strong>, linking to <span className="mono">/landing-page-1</span> using the anchor &ldquo;best widgets&rdquo;. Avoid direct comparison; focus on buying considerations.</div>
          </Card>
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
        <Card>
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
        </Card>
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
        actions={
          <Button onClick={() => setPage('submit')}><Icon name="plus" size={14} />Submit site</Button>
        }
      />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Stat label="Approved" value="3" meta="earning commissions" metaTone="up" />
        <Stat label="Pending review" value="1" meta="avg. 2d to decision" />
        <Stat label="Rejected (90d)" value="0" />
        <Stat label="Earnings (mo)" value="$320" meta="3 placements" metaTone="up" />
      </div>
      <Card>
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
      </Card>
    </div>
  );
}

export function SourcerSubmit({ back }: { back: () => void }) {
  const [domain, setDomain] = useState('');
  const dupe = SEED_SITES.some(s => s.domain.toLowerCase() === domain.toLowerCase());

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <Button variant="ghost" size="sm" onClick={back}><Icon name="chev" size={12} />Back</Button>
      </div>
      <PageHeader title="Submit a new site" sub="If approved, you earn commission on every order placed on this site." />
      <div className="split">
        <Card className="p-5">
          <div className="field">
            <Label>Domain</Label>
            <Input
              className="mt-1.5"
              placeholder="example.com"
              value={domain}
              onChange={e => setDomain(e.target.value)}
            />
            {dupe && domain && (
              <p className="text-xs mt-1" style={{ color: 'var(--st-rejected-fg)' }}>
                This domain already exists in the system.
              </p>
            )}
            {domain && !dupe && (
              <p className="text-xs mt-1" style={{ color: 'var(--st-live-fg)' }}>
                Domain is unique.
              </p>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <Label>Category</Label>
              <Select defaultValue="Tech">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                  <SelectItem value="Travel">Travel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="field">
              <Label>Niche</Label>
              <Input className="mt-1.5" placeholder="SaaS, B2B…" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="field"><Label>DR</Label><Input className="mt-1.5" placeholder="0–100" /></div>
            <div className="field"><Label>Monthly traffic</Label><Input className="mt-1.5" placeholder="e.g. 25K" /></div>
            <div className="field"><Label>Price (USD)</Label><Input className="mt-1.5" placeholder="e.g. 250" /></div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <Label>Notes for admin</Label>
            <Textarea className="mt-1.5" placeholder="Editorial guidelines, contact, anything reviewers should know…" />
          </div>
        </Card>
        <Card>
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
            <Button
              className="w-full justify-center"
              disabled={!domain || dupe}
              onClick={back}
            >
              Submit for review
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function SourcerEarnings() {
  return (
    <div className="page">
      <PageHeader title="Commissions" sub="Earnings from approved sites." actions={
        <Button variant="outline"><Icon name="ext" size={14} />Export</Button>
      } />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat label="This month" value="$320" meta="+$80 vs last month" metaTone="up" />
        <Stat label="Pending payout" value="$140" meta="Pays May 15" />
        <Stat label="Lifetime" value="$2,180" meta="14 placements" />
      </div>
      <Card className="mb-4">
        <CardHeader className="card-h">
          <CardTitle className="card-h-title">Earnings — last 6 months</CardTitle>
        </CardHeader>
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
      </Card>
      <Card>
        <CardHeader className="card-h">
          <CardTitle className="card-h-title">Recent placements</CardTitle>
        </CardHeader>
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
                <td className="mono font-medium" style={{ color: 'var(--st-live-fg)' }}>+${row[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
        <Card>
          <CardHeader className="card-h">
            <CardTitle className="card-h-title">Orders by stage — last 30 days</CardTitle>
          </CardHeader>
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
        </Card>
        <Card>
          <div className="card-h">
            <div className="card-h-title">Action queue</div>
            <Button variant="outline" size="sm" onClick={() => setPage('approvals')}>View all</Button>
          </div>
          <div className="side-section">
            <div className="hstack">
              <Icon name="check" />
              <div>
                <div style={{ fontWeight: 500 }}>4 sites awaiting approval</div>
                <div className="text-xs muted">Oldest submitted 1 day ago</div>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => setPage('approvals')}>Review</Button>
            </div>
          </div>
          <div className="side-section">
            <div className="hstack">
              <Icon name="cash" />
              <div>
                <div style={{ fontWeight: 500 }}>1 invoice overdue</div>
                <div className="text-xs muted">INV-3013 · Client C · $700</div>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => setPage('finance')}>Open</Button>
            </div>
          </div>
          <div className="side-section">
            <div className="hstack">
              <Icon name="team" />
              <div>
                <div style={{ fontWeight: 500 }}>2 user invitations pending</div>
                <div className="text-xs muted">Sent &gt; 3 days ago</div>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => setPage('users')}>Manage</Button>
            </div>
          </div>
        </Card>
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
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="vstack">
        {pending.map(s => (
          <Card key={s.id}>
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
                <Button variant="outline" className="text-(--st-rejected-fg)">Reject</Button>
                <Button><Icon name="check" size={14} />Approve</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminUsers() {
  return (
    <div className="page">
      <PageHeader title="Users" sub="All accounts on LinkFlow." actions={
        <Button><Icon name="plus" size={14} />Invite user</Button>
      } />
      <div className="filterbar">
        <Input className="w-70" placeholder="Search…" />
        <Button variant="outline" size="sm"><Icon name="filter" size={12} />Role</Button>
      </div>
      <Card>
        <table className="table">
          <thead><tr><th>Name</th><th>Role</th><th>Orders</th><th>Member since</th><th /></tr></thead>
          <tbody>
            {SEED_USERS.map(u => (
              <tr key={u.name} className="clickable">
                <td className="hstack"><UserAvatar name={u.name} /><span style={{ fontWeight: 500 }}>{u.name}</span></td>
                <td><span className="badge b-neutral"><span className="dot" />{u.role}</span></td>
                <td className="mono">{u.orders}</td>
                <td className="mono muted">{u.since}</td>
                <td><Button variant="ghost" size="sm"><Icon name="more" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
