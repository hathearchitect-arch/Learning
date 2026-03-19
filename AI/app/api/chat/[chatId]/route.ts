import { getSession, getActiveOrganization } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; chatId: string }> },
) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);

  if (!session?.user || !activeOrganization) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Session or active organization is invalid',
      },
      { status: 401 },
    );
  }

  const { agentId, chatId } = await params;

  if (!chatId) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Not Found' },
      { status: 404 },
    );
  }

  //retrieve chat metadata and message history
  const chatData = await getChatById({ id: chatId });
  const chatMessageHistory = await getMessagesByChatId({ id: chatId }); //do we want some type of limit argument here? could be a very long message history
  const chatDataResponse = {
    chatMetadata: chatData,
    chatMessageHistory,
  };
  return NextResponse.json(chatDataResponse, { status: 200 });
}
