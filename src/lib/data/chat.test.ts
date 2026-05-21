import { describe, it, expect, vi, beforeEach } from 'vitest';

interface ChatRow {
  id: string;
  title: string;
  category: 'Standard' | 'Support' | 'Sales';
  status: 'Active' | 'Archived';
  created_at: string;
  created_by_id: string;
}

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  role: 'Client' | 'Sourcer' | 'Copywriter' | 'Manager' | 'Admin';
}

interface ParticipantRow {
  chat_id: string;
  user_id: string;
}

const state: {
  myParticipantRows: ParticipantRow[];
  chats: ChatRow[];
  allParticipantRows: ParticipantRow[];
  users: UserRow[];
} = {
  myParticipantRows: [],
  chats: [],
  allParticipantRows: [],
  users: [],
};

// Track the select string passed to the users table (for asserting `role` is selected)
const usersSelectCalls: string[] = [];

function makeChatsQuery() {
  const filters: { status?: string; ids?: string[] } = {};
  const builder: {
    select: (cols: string) => typeof builder;
    in: (col: string, vals: string[]) => typeof builder;
    eq: (col: string, val: string) => typeof builder;
    order: () => Promise<{ data: ChatRow[]; error: null }>;
  } = {
    select: () => builder,
    in: (_col, vals) => {
      filters.ids = vals;
      return builder;
    },
    eq: (col, val) => {
      if (col === 'status') filters.status = val;
      return builder;
    },
    order: async () => {
      let data = state.chats;
      if (filters.ids) data = data.filter((c) => filters.ids!.includes(c.id));
      if (filters.status) data = data.filter((c) => c.status === filters.status);
      return { data, error: null };
    },
  };
  return builder;
}

function makeChatParticipantsQuery() {
  const filters: { actorId?: string; chatIds?: string[]; participantUserId?: string } = {};
  const builder: {
    select: (cols: string) => typeof builder;
    eq: (col: string, val: string) => typeof builder | Promise<{ data: ParticipantRow[] }>;
    in: (col: string, vals: string[]) => Promise<{ data: ParticipantRow[] }>;
  } = {
    select: () => builder,
    eq: (col, val) => {
      if (col === 'user_id') {
        filters.actorId = val;
        return Promise.resolve({
          data: state.myParticipantRows.filter((r) => r.user_id === val),
        });
      }
      return builder;
    },
    in: async (_col, vals) => {
      filters.chatIds = vals;
      let rows = state.allParticipantRows.filter((r) => vals.includes(r.chat_id));
      if (filters.participantUserId) {
        rows = rows.filter((r) => r.user_id === filters.participantUserId);
      }
      return { data: rows };
    },
  };
  return builder;
}

function makeUsersQuery() {
  const builder = {
    select: (cols: string) => {
      usersSelectCalls.push(cols);
      return {
        in: async (_col: string, vals: string[]) => ({
          data: state.users.filter((u) => vals.includes(u.id)),
        }),
      };
    },
  };
  return builder;
}

const fromMock = vi.fn((table: string) => {
  if (table === 'chats') return makeChatsQuery();
  if (table === 'chat_participants') return makeChatParticipantsQuery();
  if (table === 'users') return makeUsersQuery();
  throw new Error(`unexpected table ${table}`);
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: fromMock })),
}));

const { fetchChatsList } = await import('./chat');

const clientActor = { id: 'u-client', role: 'Client' as const };
const managerActor = { id: 'u-mgr', role: 'Manager' as const };

function seed() {
  state.myParticipantRows = [
    { chat_id: 'c-support', user_id: 'u-client' },
    { chat_id: 'c-sales', user_id: 'u-client' },
    { chat_id: 'c-std-new', user_id: 'u-client' },
    { chat_id: 'c-std-old', user_id: 'u-client' },
  ];
  state.chats = [
    { id: 'c-std-new', title: 'Acme launch', category: 'Standard', status: 'Active',
      created_at: '2025-03-10T00:00:00Z', created_by_id: 'u-client' },
    { id: 'c-std-old', title: 'Widget order', category: 'Standard', status: 'Active',
      created_at: '2025-01-10T00:00:00Z', created_by_id: 'u-client' },
    { id: 'c-sales', title: 'Sales', category: 'Sales', status: 'Active',
      created_at: '2024-12-01T00:00:00Z', created_by_id: 'u-admin' },
    { id: 'c-support', title: 'Support', category: 'Support', status: 'Active',
      created_at: '2024-11-01T00:00:00Z', created_by_id: 'u-admin' },
  ];
  state.allParticipantRows = [
    { chat_id: 'c-std-new', user_id: 'u-client' },
    { chat_id: 'c-std-new', user_id: 'u-sourcer' },
    { chat_id: 'c-std-old', user_id: 'u-client' },
    { chat_id: 'c-std-old', user_id: 'u-copy' },
    { chat_id: 'c-sales', user_id: 'u-client' },
    { chat_id: 'c-sales', user_id: 'u-admin' },
    { chat_id: 'c-support', user_id: 'u-client' },
    { chat_id: 'c-support', user_id: 'u-admin' },
  ];
  state.users = [
    { id: 'u-client', first_name: 'Alice', last_name: 'Smith', role: 'Client' },
    { id: 'u-sourcer', first_name: 'Bob', last_name: 'Sourcer', role: 'Sourcer' },
    { id: 'u-copy', first_name: 'Carol', last_name: 'Writer', role: 'Copywriter' },
    { id: 'u-admin', first_name: 'Dan', last_name: 'Admin', role: 'Admin' },
    { id: 'u-mgr', first_name: 'Eve', last_name: 'Manager', role: 'Manager' },
  ];
}

describe('fetchChatsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersSelectCalls.length = 0;
    seed();
  });

  it('selects role when loading participants users', async () => {
    await fetchChatsList({}, clientActor);
    expect(usersSelectCalls.some((c) => c.includes('role'))).toBe(true);
  });

  it('filters by chat title (case-insensitive)', async () => {
    const result = await fetchChatsList({ q: 'widget' }, clientActor);
    const ids = result.map((c) => c.id);
    expect(ids).toContain('c-std-old');
    expect(ids).not.toContain('c-std-new');
  });

  it('filters by participant full name', async () => {
    const result = await fetchChatsList({ q: 'sourcer' }, clientActor);
    const ids = result.map((c) => c.id);
    expect(ids).toContain('c-std-new');
    expect(ids).not.toContain('c-std-old');
  });

  it('pins Support then Sales then Standard (by created_at desc) for Client actors', async () => {
    const result = await fetchChatsList({}, clientActor);
    expect(result.map((c) => c.id)).toEqual(['c-support', 'c-sales', 'c-std-new', 'c-std-old']);
  });

  it('does not reorder for non-Client actors', async () => {
    state.myParticipantRows = [
      { chat_id: 'c-support', user_id: 'u-mgr' },
      { chat_id: 'c-sales', user_id: 'u-mgr' },
      { chat_id: 'c-std-new', user_id: 'u-mgr' },
      { chat_id: 'c-std-old', user_id: 'u-mgr' },
    ];
    const result = await fetchChatsList({}, managerActor);
    expect(result.map((c) => c.id)).toEqual(['c-std-new', 'c-std-old', 'c-sales', 'c-support']);
  });
});
