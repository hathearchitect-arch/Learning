'use client';

import type { RecentChat } from '@/app/api/metrics/route';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';

type MessagePart = {
  type: string;
  text?: string;
};

type ApiChatMessage = {
  id: string;
  chatId: string;
  role: string;
  createdAt: string;
  attachments: [];
  parts: MessagePart[];
};

type FormattedChatMessage = {
  id: string;
  name: string;
  createdAt: string;
  messageText: string;
};

function ViewMessageButton(chat: RecentChat) {
  const [isLoadingMessageHistory, setIsLoadingMessageHistory] = useState(false);
  const [apiMessageHistory, setApiMessageHistory] = useState<
    Array<FormattedChatMessage>
  >([]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={async () => {
            setIsLoadingMessageHistory(true);
            try {
              const apiMessagesResult = await fetch(
                `/api/chat/${chat.chatMetadata.id}`,
              );
              const apiMessagesJson = await apiMessagesResult.json();
              const apiMessages: Array<FormattedChatMessage> =
                apiMessagesJson.chatMessageHistory.map(
                  (elem: ApiChatMessage) => {
                    const formattedChatMessage: FormattedChatMessage = {
                      id: elem.id,
                      name:
                        elem.role === 'user' ? chat.user.name : chat.agent.name,
                      createdAt: new Date(`${elem.createdAt}`).toLocaleString(),
                      messageText: elem.parts
                        .filter((elem) => 'text' in elem)
                        .map((elem) => elem.text)
                        .join('\n'),
                    };
                    return formattedChatMessage;
                  },
                );
              setApiMessageHistory(apiMessages);
              setIsLoadingMessageHistory(false);
            } catch {
              setApiMessageHistory([]);
              setIsLoadingMessageHistory(false);
            }
          }}
        >
          <span>View Messages</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conversation History</DialogTitle>
          <DialogDescription>
            Chat between {chat.user.name} and {chat.agent.name}
            <br />
            Chat Title:{' '}
            {chat.chatMetadata.title.length > 100
              ? `${chat.chatMetadata.title.slice(0, 100)}...`
              : chat.chatMetadata.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isLoadingMessageHistory ? (
            <div>
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : apiMessageHistory.length > 0 ? (
            apiMessageHistory.map((msg) => (
              <div key={msg.id} className="border-b pb-3 last:border-b-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold capitalize">{msg.name}:</span>
                  <span className="text-xs text-muted-foreground">
                    {msg.createdAt}
                  </span>
                </div>
                <div className="pl-4">
                  {msg.messageText.length > 0 ? (
                    <ReactMarkdown>{msg.messageText}</ReactMarkdown>
                  ) : (
                    'No message contents available'
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">
              No message history available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const RecentChatColumns: ColumnDef<RecentChat>[] = [
  { accessorKey: 'user.name', header: 'User Name' },
  { accessorKey: 'user.email', header: 'User Email' },
  { accessorKey: 'agent.name', header: 'Agent' },
  {
    accessorKey: 'chatMetadata.title',
    header: 'Chat Title',
    cell: ({ row }) => {
      const trimmedTitle =
        row.original.chatMetadata.title.length > 50
          ? `${row.original.chatMetadata.title.slice(0, 100)}...`
          : row.original.chatMetadata.title;
      return trimmedTitle;
    },
  },
  {
    accessorKey: 'chatMetadata.createdAt',
    header: 'Date Created',
    cell: ({ row }) => {
      const createdAt = row.original.chatMetadata.createdAt;
      return new Date(`${createdAt}Z`).toLocaleString();
    },
  },
  {
    accessorKey: 'chatMetadata.mostRecentMessageDate',
    header: 'Most Recent Message',
    cell: ({ row }) => {
      const mostRecentDate = row.original.chatMetadata.mostRecentMessageDate;
      return new Date(`${mostRecentDate}Z`).toLocaleString();
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const chat = row.original;
      return ViewMessageButton(chat);
    },
  },
];
