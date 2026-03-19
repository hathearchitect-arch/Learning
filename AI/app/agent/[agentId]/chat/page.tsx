import { cookies } from 'next/headers';
import { Chat } from '@/components/chat';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { caddieApi } from '@/lib/api';

export default async function Page({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const session = await getSession();
  const { agentId } = await params;

  if (!session) {
    (await cookies()).set('agent-theme-id', agentId);
    redirect('/signin');
  }

  const { data: agent } = await caddieApi.get(`/api/agent/${agentId}`);

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
        agent={agent}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
