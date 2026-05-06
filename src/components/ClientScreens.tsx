'use client';

import { useState } from 'react';
import Icon from './Icon';
import { PageHeader, Stat, StageBadge, InvoiceBadge, Stepper } from './chrome';
import { SEED_ORDERS, SEED_SITES, SEED_INVOICES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function ClientHome({ setPage, openOrder }: { setPage: (p: string) => void; openOrder: (id: string) => void }) {
  const myOrders = SEED_ORDERS.filter(o => o.client === 'Client A');
  const recent = myOrders.slice(0, 5);
  const toApprove = myOrders.filter(o => o.stage === 'approval');
  return (
    <div className="page">
      <PageHeader
        title="Welcome back, Client A"
        sub="Here's a quick view of your linkbuilding activity."
        actions={
          <Button onClick={() => setPage('new')}><Icon name="plus" size={14} />New order</Button>
        }
      />
      <div className="stats">
        <Stat label="Active orders" value="4" meta="2 awaiting your review" />
        <Stat label="Live placements" value="12" meta="+3 this month" metaTone="up" />
        <Stat label="Outstanding" value="$1,040" meta="3 invoices pending" />
        <Stat label="Avg. turnaround" value="11d" meta="−2d vs last month" metaTone="up" />
      </div>
      <div className="split">
        <Card>
          <div className="card-h">
            <div>
              <div className="card-h-title">Recent orders</div>
              <div className="card-h-sub">Your last {recent.length} orders</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPage('orders')}>View all</Button>
          </div>
          <table className="table">
            <thead><tr><th>Order</th><th>Target</th><th>Sites</th><th>Stage</th><th /></tr></thead>
            <tbody>
              {recent.map(o => (
                <tr key={o.id} className="clickable" onClick={() => openOrder(o.id)}>
                  <td><span className="mono">{o.id}</span></td>
                  <td>{o.target}</td>
                  <td className="muted">{o.sites.length}</td>
                  <td><StageBadge stage={o.stage} /></td>
                  <td><Icon name="chev" size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <div className="card-h"><div className="card-h-title">Awaiting your approval</div></div>
          {toApprove.length === 0 ? (
            <div className="empty">All caught up.</div>
          ) : toApprove.map(o => (
            <div key={o.id} className="side-section" style={{ cursor: 'pointer' }} onClick={() => openOrder(o.id)}>
              <div className="hstack" style={{ marginBottom: 8 }}>
                <span className="mono faint">{o.id}</span>
                <StageBadge stage={o.stage} />
              </div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{o.target}</div>
              <div className="text-xs muted">Anchor: &ldquo;{o.anchor}&rdquo; · Due {o.due}</div>
              <Button size="sm" className="mt-2.5">Review draft</Button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export function ClientOrders({ openOrder }: { openOrder: (id: string) => void }) {
  const [tab, setTab] = useState('all');
  const orders = SEED_ORDERS.filter(o => o.client === 'Client A');
  const filtered = tab === 'all' ? orders : orders.filter(o => o.stage === tab);
  return (
    <div className="page">
      <PageHeader title="My orders" sub="Track every order you've placed." />
      <div className="filterbar">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="content">In progress</TabsTrigger>
            <TabsTrigger value="approval">For review</TabsTrigger>
            <TabsTrigger value="done">Live</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm"><Icon name="filter" size={12} />Filter</Button>
        <Button variant="outline" size="sm"><Icon name="sort" size={12} />Sort</Button>
      </div>
      <Card>
        <table className="table">
          <thead><tr><th>Order</th><th>Target URL</th><th>Anchor</th><th>Sites</th><th>Stage</th><th>Due</th><th>Amount</th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="clickable" onClick={() => openOrder(o.id)}>
                <td><span className="mono">{o.id}</span></td>
                <td>{o.target}</td>
                <td className="muted">&ldquo;{o.anchor}&rdquo;</td>
                <td className="mono">{o.sites.length}</td>
                <td><StageBadge stage={o.stage} /></td>
                <td className="mono muted">{o.due}</td>
                <td className="mono">${o.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function NewOrder({ setPage }: { setPage: (p: string) => void }) {
  const [selected, setSelected] = useState(['S-001', 'S-003']);
  const [anchor, setAnchor] = useState('best widgets');
  const [target, setTarget] = useState('/landing-page-1');
  const sites = SEED_SITES.filter(s => s.status === 'approved');
  const total = selected.reduce((sum, id) => sum + (SEED_SITES.find(s => s.id === id)?.price ?? 0), 0);

  return (
    <div className="page">
      <PageHeader title="New order" sub="Step 3 — choose sites and submit." />
      <div className="stepper">
        {['Brief', 'Sites', 'Review'].map((label, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className={`step ${i + 1 === 3 ? 'active' : 'done'}`}>
              <span className="step-num">{i + 1 < 3 ? '✓' : 3}</span>
              <span>{label}</span>
            </div>
            {i < 2 && <span className="step-arrow"><Icon name="chev" size={12} /></span>}
          </span>
        ))}
      </div>
      <div className="split">
        <div>
          <Card className="p-5 mb-4">
            <h3 className="text-[15px] font-semibold mb-4">Brief</h3>
            <div className="field">
              <Label>Target URL</Label>
              <Input className="mt-1.5" value={target} onChange={e => setTarget(e.target.value)} />
            </div>
            <div className="field">
              <Label>Anchor text</Label>
              <Input className="mt-1.5" value={anchor} onChange={e => setAnchor(e.target.value)} />
              <p className="field-hint">The visible link text on the destination article.</p>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <Label>Notes for copywriter (optional)</Label>
              <Textarea className="mt-1.5" placeholder="Tone, audience, must-mention points…" />
            </div>
          </Card>
          <Card>
            <div className="card-h">
              <div>
                <div className="card-h-title">Pick sites · {selected.length} selected</div>
                <div className="card-h-sub">Approved sites from our catalog</div>
              </div>
              <Button variant="outline" size="sm"><Icon name="filter" size={12} />Filter</Button>
            </div>
            <table className="table">
              <thead><tr><th /><th>Domain</th><th>Category</th><th>DR</th><th>Traffic</th><th>Price</th></tr></thead>
              <tbody>
                {sites.map(s => {
                  const on = selected.includes(s.id);
                  return (
                    <tr key={s.id} className="clickable" onClick={() => setSelected(on ? selected.filter(x => x !== s.id) : [...selected, s.id])}>
                      <td style={{ width: 32 }}>
                        <div className="check-box" style={{ background: on ? 'var(--accent)' : 'var(--surface)', borderColor: on ? 'var(--accent)' : 'var(--border-strong)', color: 'white' }}>
                          {on && '✓'}
                        </div>
                      </td>
                      <td><span className="mono">{s.domain}</span></td>
                      <td className="muted">{s.category}</td>
                      <td className="mono">{s.dr}</td>
                      <td className="mono muted">{s.traffic}</td>
                      <td className="mono">${s.price}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
        <Card>
          <div className="card-h"><div className="card-h-title">Order summary</div></div>
          <div className="side-section">
            <div className="side-label">Brief</div>
            <div className="side-row"><span className="k">Target</span><span className="v mono">{target}</span></div>
            <div className="side-row"><span className="k">Anchor</span><span className="v">&ldquo;{anchor}&rdquo;</span></div>
          </div>
          <div className="side-section">
            <div className="side-label">Selected sites · {selected.length}</div>
            {selected.map(id => {
              const s = SEED_SITES.find(x => x.id === id);
              return s ? (
                <div key={id} className="side-row">
                  <span className="k mono">{s.domain}</span>
                  <span className="v mono">${s.price}</span>
                </div>
              ) : null;
            })}
          </div>
          <div className="side-section">
            <div className="side-row"><span className="k">Subtotal</span><span className="v mono">${total}</span></div>
            <div className="side-row"><span className="k">Service fee</span><span className="v mono">$0</span></div>
            <div className="side-row" style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>
              <span>Total</span><span className="mono">${total}</span>
            </div>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <Button className="w-full justify-center" onClick={() => setPage('orders')}>
              Submit order <Icon name="arrow" size={14} />
            </Button>
            <Button variant="ghost" className="w-full justify-center mt-1.5">Save as draft</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ClientOrderDetail({ orderId, back }: { orderId: string; back: () => void }) {
  const order = SEED_ORDERS.find(o => o.id === orderId) ?? SEED_ORDERS[0];
  const sites = order.sites.map(id => SEED_SITES.find(s => s.id === id)!).filter(Boolean);
  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <Button variant="ghost" size="sm" onClick={back}><Icon name="chev" size={12} />Back to orders</Button>
      </div>
      <PageHeader
        title={<><span className="mono" style={{ fontSize: 15, color: 'var(--text-muted)', marginRight: 10 }}>{order.id}</span>{order.target}</>}
        sub={<>Anchor: &ldquo;{order.anchor}&rdquo; · Created {order.created} · Due {order.due}</>}
        actions={<>
          <Button variant="outline"><Icon name="more" /></Button>
          <Button>View draft</Button>
        </>}
      />
      <Stepper currentStage={order.stage} />
      <div className="split">
        <div className="vstack">
          <Card>
            <div className="card-h"><div className="card-h-title">Placements</div></div>
            <table className="table">
              <thead><tr><th>Site</th><th>Category</th><th>DR</th><th>Status</th><th>URL</th></tr></thead>
              <tbody>
                {sites.map(s => (
                  <tr key={s.id}>
                    <td className="mono">{s.domain}</td>
                    <td className="muted">{s.category}</td>
                    <td className="mono">{s.dr}</td>
                    <td><StageBadge stage={order.stage} /></td>
                    <td className="mono faint">— pending —</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <div className="card-h"><div className="card-h-title">Activity</div></div>
            <ul className="activity">
              <li><span className="when">10:24</span><span><span className="who">Writer A</span> submitted a draft for site-alpha.com</span></li>
              <li><span className="when">09:12</span><span><span className="who">Manager A</span> assigned writer to site-gamma.com</span></li>
              <li><span className="when">Apr 28</span><span><span className="who">Manager A</span> assigned writer to site-alpha.com</span></li>
              <li><span className="when">Apr 28</span><span><span className="who">Client A</span> created order</span></li>
            </ul>
          </Card>
        </div>
        <Card>
          <div className="side-section">
            <div className="side-label">Order details</div>
            <div className="side-row"><span className="k">Manager</span><span className="v">{order.manager}</span></div>
            <div className="side-row"><span className="k">Copywriter</span><span className="v">{order.copywriter ?? '—'}</span></div>
            <div className="side-row"><span className="k">Stage</span><span className="v"><StageBadge stage={order.stage} /></span></div>
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
        </Card>
      </div>
    </div>
  );
}

export function ApproveContent({ back }: { back: () => void }) {
  const [showOk, setShowOk] = useState(false);
  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <Button variant="ghost" size="sm" onClick={back}><Icon name="chev" size={12} />Back</Button>
      </div>
      <PageHeader
        title="Review draft"
        sub={<><span className="mono">ORD-1041</span> · site-beta.com · Anchor &ldquo;top tools&rdquo;</>}
        actions={<>
          <Button variant="outline">Request changes</Button>
          <Button onClick={() => setShowOk(true)}><Icon name="check" size={14} />Approve &amp; publish</Button>
        </>}
      />
      <div className="split">
        <div className="editor-doc">
          <h1>The complete guide to choosing the right tools</h1>
          <p>Selecting the right toolset is one of the most consequential decisions a growing operation can make. Pick well, and the team compounds; pick poorly, and you&rsquo;ll be replatforming again in eighteen months.</p>
          <h2>Start with the workflow</h2>
          <p>The most common mistake is to evaluate tools in isolation. A platform that scores brilliantly on a feature checklist can still create friction when it doesn&rsquo;t fit the way your team actually works day-to-day.</p>
          <p>That&rsquo;s why our review of <span className="anchor">top tools</span> for operations teams emphasizes flow over features — looking at how each option moves work between people, not just what each option can do on its own.</p>
          <h2>Three traps to avoid</h2>
          <p>First, don&rsquo;t over-index on integrations. Most teams use three or four tools heavily; the long tail of &ldquo;supported integrations&rdquo; is largely marketing. Second, watch for hidden seat costs. Third, evaluate the export story before you commit.</p>
          <p>Done right, this evaluation pays back many times over.</p>
        </div>
        <Card>
          <div className="card-h"><div className="card-h-title">Comments</div></div>
          <div className="comment">
            <span className="avatar-xs">M</span>
            <div className="body">
              <div className="head"><span className="who">Manager A</span><span className="when">2h ago</span></div>
              <div className="text">Draft is ready for your review. Anchor placed naturally in section 1.</div>
            </div>
          </div>
          <div className="comment">
            <span className="avatar-xs">W</span>
            <div className="body">
              <div className="head"><span className="who">Writer B</span><span className="when">3h ago</span></div>
              <div className="text">Used the brief points about hidden seat costs. Can swap if you&rsquo;d rather emphasize integrations.</div>
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <Textarea placeholder="Leave a comment or request changes…" />
            <Button variant="outline" size="sm" className="mt-2">Comment</Button>
          </div>
        </Card>
      </div>

      <Dialog open={showOk} onOpenChange={setShowOk}>
        <DialogContent className="max-w-140">
          <DialogHeader>
            <DialogTitle>Approve &amp; queue for publishing</DialogTitle>
          </DialogHeader>
          <div className="modal-b">
            <p>Once approved, this draft moves to publishing. The site owner will place the article and we&rsquo;ll email you the live URL.</p>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 13 }}>
              <div className="side-row"><span className="k">Order</span><span className="v mono">ORD-1041</span></div>
              <div className="side-row"><span className="k">Site</span><span className="v mono">site-beta.com</span></div>
              <div className="side-row"><span className="k">Anchor</span><span className="v">&ldquo;top tools&rdquo;</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOk(false)}>Cancel</Button>
            <Button onClick={() => setShowOk(false)}>Confirm approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ClientCatalog() {
  const [cat, setCat] = useState('All');
  const cats = ['All', 'Tech', 'Finance', 'Health', 'Lifestyle', 'Travel'];
  const sites = SEED_SITES.filter(s => s.status === 'approved' && (cat === 'All' || s.category === cat));
  return (
    <div className="page">
      <PageHeader title="Site catalog" sub="Approved sites available for orders." />
      <div className="filterbar">
        <Tabs value={cat} onValueChange={setCat}>
          <TabsList>
            {cats.map(c => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Input className="w-55 ml-auto" placeholder="Search domains…" />
      </div>
      <Card>
        <table className="table">
          <thead><tr><th>Domain</th><th>Category</th><th>DR</th><th>Traffic</th><th>Price</th><th /></tr></thead>
          <tbody>
            {sites.map(s => (
              <tr key={s.id} className="clickable">
                <td className="mono">{s.domain}</td>
                <td className="muted">{s.category}</td>
                <td className="mono">{s.dr}</td>
                <td className="mono muted">{s.traffic}</td>
                <td className="mono">${s.price}</td>
                <td><Button variant="outline" size="sm">Add to order</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function ClientInvoices() {
  return (
    <div className="page">
      <PageHeader title="Invoices" sub="All invoices issued for your account." actions={
        <Button variant="outline"><Icon name="ext" size={14} />Export CSV</Button>
      } />
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat label="Outstanding" value="$1,640" meta="3 invoices" />
        <Stat label="Paid (90d)" value="$2,840" meta="6 invoices" metaTone="up" />
        <Stat label="Overdue" value="$700" meta="1 invoice" metaTone="down" />
      </div>
      <Card>
        <table className="table">
          <thead><tr><th>Invoice</th><th>Order</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {SEED_INVOICES.map(inv => (
              <tr key={inv.id} className="clickable">
                <td className="mono">{inv.id}</td>
                <td className="mono">{inv.order}</td>
                <td className="mono muted">{inv.issued}</td>
                <td className="mono muted">{inv.due}</td>
                <td className="mono">${inv.amount}</td>
                <td><InvoiceBadge status={inv.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
