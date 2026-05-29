import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/features/auth';

// POST /api/chat/mark-read
// Fire-and-forget endpoint hit by the client via fetch({ keepalive: true })
// when a chat thread is opened with unread content. Performs the merged
// `mark_chat_read` RPC and returns immediately — no revalidation, no payload,
// to keep the request as cheap as possible.
export async function POST(request: Request) {
  let chatId: string;
  try {
    const body = (await request.json()) as { chatId?: unknown };
    if (typeof body.chatId !== 'string') {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }
    chatId = body.chatId;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('mark_chat_read', { p_chat_id: chatId });
  if (error) {
    console.error('[mark-read] rpc failed:', error.message);
    return NextResponse.json({ error: 'rpc_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
