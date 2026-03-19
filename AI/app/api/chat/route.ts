import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';
import { getSession, getActiveOrganization, auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  checkAgentAccess,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { searchKnowledgebase } from '@/lib/ai/tools/search-knowledgebase';
import { isProductionEnvironment } from '@/lib/constants';
import { bedrockLanguageModel } from '@/lib/ai/providers';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/types';
import { differenceInSeconds } from 'date-fns';
import { ChatSDKError } from '@/lib/errors';
import { db } from '@/lib/db';
import { agent, type chat } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { Resource } from 'sst';
import {
  getImpersonatedUser,
  handleImpersonatedUser,
  type ImpersonatedUserIdentifiers,
} from './actions';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
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

  let requestBody: PostRequestBody;
  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    return new ChatSDKError(
      'bad_request:api',
      'Improperly formatted request to create a chat',
    ).toResponse();
  }

  try {
    let {
      id,
      message,
      impersonatedUser,
      selectedVisibilityType,
      agentId,
      metadata,
    } = requestBody;
    let existingChat: typeof chat.$inferSelect | null = null;
    const apiKey = request.headers.get('x-api-key');

    // chat request must include either a chat id or agent id
    if (!id && !agentId) {
      return new ChatSDKError(
        'bad_request:chat',
        'Valid chat requests must include either a chat id or an agent id',
      ).toResponse();
    }

    if (impersonatedUser) {
      const impersonatedUserIdentifiers: ImpersonatedUserIdentifiers = {
        id: impersonatedUser.id,
        email: impersonatedUser.email,
      };
      const handleImpersonatedUserResponse = await handleImpersonatedUser(
        impersonatedUserIdentifiers,
        activeOrganization.id,
      );
      if (
        handleImpersonatedUserResponse &&
        !handleImpersonatedUserResponse.ok
      ) {
        return handleImpersonatedUserResponse;
      }
    }

    const impersonatedUserObject = await getImpersonatedUser(
      impersonatedUser?.id,
      impersonatedUser?.email,
    );
    const userId = impersonatedUserObject?.id || session.user.id;

    //----------AUTHENTICATION LOGIC----------------------------------
    /*

    if chat id, 
      - infer the agent id using chat id
      - if chat doesn't exist, throw error
      - if userId doesn't match chat id, throw error
    check agent exists
    check that agent is part of active organization
    check that userId has access to agent, or that admin permissions are true (allows API key usage)
    */

    if (id) {
      existingChat = await getChatById({
        id,
        organizationId: activeOrganization.id,
      });
      if (existingChat) {
        if (existingChat?.userId !== userId) {
          return new ChatSDKError(
            'forbidden:chat',
            'Unable to access the existing chat you provided, which belongs to another user',
          ).toResponse();
        }
        agentId = existingChat.agentId;
      }
    } else {
      //if no chat id is provided, create one
      id = generateUUID();
    }

    const chatAgent = await db.query.agent.findFirst({
      where: and(
        eq(agent.id, agentId || ''),
        eq(agent.organizationId, activeOrganization.id),
      ),
    });

    if (!chatAgent) {
      return new ChatSDKError(
        'not_found:agent',
        'No agent found for the chat id or agent id you provided',
      ).toResponse();
    }
    if (chatAgent.organizationId !== activeOrganization.id) {
      return new ChatSDKError(
        'forbidden:agent',
        'The agent does not belong to your active organization',
      ).toResponse();
    }

    // check that user has access to agent, or that user has admin/org-level admin permissions
    const adminPermission = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: {
          chat: ['create'],
        },
      },
    });

    const organizationPermission = await auth.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId: activeOrganization.id,
        permissions: {
          chat: ['create'],
        },
      },
    });

    const agentUserAccess = await checkAgentAccess(userId, agentId || '');
    if (
      agentUserAccess.length === 0 &&
      !adminPermission &&
      !organizationPermission
    ) {
      return new ChatSDKError(
        'forbidden:agent',
        'User does not have access to agent',
      ).toResponse();
    }

    //---------------------------END OF AUTHENTICATION LOGIC------------------------------------

    const userType = 'regular';

    const messageCount = await getMessageCountByUserId({
      id: userId,
      differenceInHours: 24,
    });

    // TODO implement a message limit for the user

    //chat creation happens here: I'd like to consolidate this
    if (!existingChat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      const impersonatedById =
        apiKey && impersonatedUser ? session.user.id : null;
      await saveChat({
        id,
        userId,
        impersonatedById,
        title,
        visibility: selectedVisibilityType,
        agentId: chatAgent.id,
      });
    }

    const previousMessages = await getMessagesByChatId({ id });

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });
    let stepCount = 0;
    const stream = createDataStream({
      execute: (dataStream) => {
        type availableToolsType =
          | 'requestSuggestions'
          | 'createDocument'
          | 'updateDocument'
          | 'searchKnowledgebase';
        const enabledTools: Array<availableToolsType> = [];
        const toolsObject: Record<string, any> = {};
        if (chatAgent.isToolCreateDocumentEnabled) {
          enabledTools.push('createDocument');
          toolsObject.createDocument = createDocument({
            session: session,
            dataStream: dataStream,
          });
        }
        if (chatAgent.isToolUpdateDocumentEnabled) {
          enabledTools.push('updateDocument');
          toolsObject.updateDocument = updateDocument({
            session: session,
            dataStream: dataStream,
          });
          enabledTools.push('requestSuggestions');
          toolsObject.requestSuggestions = requestSuggestions({
            session: session,
            dataStream: dataStream,
          });
        }
        if (chatAgent.isToolKnowledgebaseEnabled) {
          enabledTools.push('searchKnowledgebase');
          toolsObject.searchKnowledgebase = searchKnowledgebase({
            question: message.content,
            session: session,
            organizationId: activeOrganization.id,
            agentId: chatAgent.id,
            requestMetadata: metadata,
            dataStream: dataStream,
            numberOfResults: (
              chatAgent.toolKnowledgebaseSettings as {
                maxResults: number;
                minSimilarityScore: number;
              }
            ).maxResults, // default to 5 results
            similarityScoreThreshold: (
              chatAgent.toolKnowledgebaseSettings as {
                maxResults: number;
                minSimilarityScore: number;
              }
            ).minSimilarityScore, // default to 0.5 similarity score
          });
        }

        dataStream.writeMessageAnnotation({ chatId: id }); //show user the chat id in the first row of the message
        const result = streamText({
          model: bedrockLanguageModel(chatAgent.modelId),
          providerOptions: {
            bedrock: {
              guardrailConfig: {
                guardrailIdentifier:
                  Resource.BedrockBasicGuardrailLinkable.guardrailId,
                guardrailVersion:
                  Resource.BedrockBasicGuardrailLinkable.version,
                streamProcessingMode: 'async',
                trace: 'enabled' as const,
              },
            },
          },
          system: systemPrompt({
            agentPrompt: chatAgent.instructions,
            requestHints: requestHints,
            enableArtifacts: chatAgent.isToolCreateDocumentEnabled,
            enableDatabaseQuery: chatAgent.isToolQueryDatabaseEnabled,
            enableKnowledgebaseSearch: chatAgent.isToolKnowledgebaseEnabled,
          }),
          messages,
          temperature: chatAgent.temperature || undefined,
          maxSteps: 7,
          experimental_activeTools: enabledTools,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: toolsObject,
          onStepFinish: async (step) => {
            stepCount++;
            console.log(`Step ${stepCount} completed:`, step.stepType);
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (event) => {
        console.log('an error occurred', event);
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    }
    return new Response(stream);
  } catch (error) {
    console.log('error in chat route: ', error);
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
  }
}

export async function GET(request: Request) {
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

  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  //need to correct this logic for impersonate user id
  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const chat = await getChatById({ id });

  //need to correct this logic for impersonate user id
  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
