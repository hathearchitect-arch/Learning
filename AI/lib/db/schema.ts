import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  vector,
  index,
  jsonb,
  real,
  type AnyPgColumn,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql, type SQL } from 'drizzle-orm';
import { regularPrompt } from '../ai/prompts';

const timestamps = {
  updated_at: timestamp(),
  created_at: timestamp().defaultNow().notNull(),
  deleted_at: timestamp(),
};

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text('role'),
  banned: boolean('banned'),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
});

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  organizations: many(member),
  invitations: many(invitation, {
    relationName: 'invitations',
  }),
  sentInvitations: many(invitation, {
    relationName: 'sentInvitations',
  }),
  apikeys: many(apikey),
  agents: many(agentUser),
}));

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('active_organization_id'),
  impersonatedBy: text('impersonated_by'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp('updated_at').$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  logo: text('logo'),
  theme: text('theme', { enum: ['light', 'dark'] }),
  font: text('font').default('Inter'),
  logoS3Key: text('logo_s3_key'),
  plan: varchar('plan', { enum: ['free', 'pro', 'enterprise'] })
    .default('free')
    .notNull(),
  planExpiresAt: timestamp('plan_expires_at')
    .notNull()
    .default(sql`NOW() + INTERVAL '2 weeks'`),
  customMetadataFilterFunction: varchar('custom_metadata_filter_function', {
    enum: ['generic'],
  }).default('generic'),
  customMetadataFilterConfig: jsonb('custom_metadata_filter_config'),
  chatHelpUrl: text('chat_help_url').default('https://gocaddie.ai/'),
  createdAt: timestamp('created_at').notNull(),
  metadata: text('metadata'),
});

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  files: many(file),
  folders: many(folder),
  agents: many(agent),
}));

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').default('member').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role'),
  status: text('status').default('pending').notNull(),
  sendInvite: boolean('send_invite').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
    relationName: 'sentInvitations',
  }),
  invitee: one(user, {
    fields: [invitation.email],
    references: [user.email],
    relationName: 'invitations',
  }),
}));

export const apikey = pgTable('apikey', {
  id: text('id').primaryKey(),
  name: text('name'),
  start: text('start'),
  prefix: text('prefix'),
  key: text('key').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  refillInterval: integer('refill_interval'),
  refillAmount: integer('refill_amount'),
  lastRefillAt: timestamp('last_refill_at'),
  enabled: boolean('enabled').default(true),
  rateLimitEnabled: boolean('rate_limit_enabled').default(true),
  rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000),
  rateLimitMax: integer('rate_limit_max').default(10),
  requestCount: integer('request_count'),
  remaining: integer('remaining'),
  lastRequest: timestamp('last_request'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  permissions: text('permissions'),
  metadata: text('metadata'),
});

// Caddie tables

export const accessCode = pgTable('access_code', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  code: text('code').notNull().unique(),
  assignedTo: text('assigned_to').notNull(),
  comments: text('comments'),
  isActive: boolean('is_active').notNull().default(true),
  isUsed: boolean('is_used').notNull().default(false),
  usedBy: text('used_by'),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
});

export const chat = pgTable('chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  impersonatedById: text('impersonatedById').references(() => user.id),
  agentId: uuid('agentId')
    .notNull()
    .references(() => agent.id, { onDelete: 'cascade' }),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
  impersonationUser: one(user, {
    fields: [chat.impersonatedById],
    references: [user.id],
  }),
  agent: one(agent, {
    fields: [chat.agentId],
    references: [agent.id],
  }),
  messages: many(message),
  votes: many(vote),
  streams: many(stream),
}));

export const message = pgTable('message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export const vote = pgTable(
  'vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return [primaryKey({ columns: [table.chatId, table.messageId] })];
  },
);

export const document = pgTable(
  'document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export const suggestion = pgTable(
  'suggestion',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  ],
);

export const stream = pgTable('stream', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull(),
});

export const folder = pgTable('folder', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => folder.id),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
});

export const folderRelations = relations(folder, ({ many, one }) => ({
  files: many(file),
  parentFolder: one(folder, {
    relationName: 'parentFolder',
    fields: [folder.parentId, folder.organizationId],
    references: [folder.id, folder.organizationId],
  }),
  childFolders: many(folder, {
    relationName: 'parentFolder',
  }),
  organization: one(organization, {
    fields: [folder.organizationId],
    references: [organization.id],
  }),
}));

export const file = pgTable('file', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  folderId: uuid('folder_id').references(() => folder.id, {
    onDelete: 'cascade',
  }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  s3Key: text('s3_key'),
  type: varchar('type'),
  size: integer('size'),
  description: text('description'),
  isVectorized: boolean('is_vectorized').default(false).notNull(),
  metadata: json('metadata'),
  tags: json('tags'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

export const fileRelations = relations(file, ({ one, many }) => ({
  folder: one(folder, {
    fields: [file.folderId, file.organizationId],
    references: [folder.id, folder.organizationId],
  }),
  organization: one(organization, {
    fields: [file.organizationId],
    references: [organization.id],
  }),
  embeddings: many(embeddings),
}));

export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    fileId: uuid('file_id')
      .generatedAlwaysAs(
        (): SQL => sql`CAST(${embeddings.customMetadata}->>'fileId' AS UUID)`,
      )
      .references(() => file.id, {
        onDelete: 'cascade',
      }),
    chunks: text('chunks').notNull(),
    metadata: json('metadata'),
    customMetadata: jsonb('custom_metadata'),
    embedding: vector('embedding', { dimensions: 1024 }).notNull(),
    createdAt: timestamp('created_at').notNull().default(sql`now()`),
  },
  (table) => [
    index('embeddingIndex').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
    index('chunksIndex').using(
      'gin',
      sql`to_tsvector('simple', ${table.chunks})`,
    ),
    index('metadataIndex').using('gin', table.customMetadata.op('jsonb_ops')),
  ],
);

const embeddingsRelations = relations(embeddings, ({ one }) => ({
  file: one(file, {
    fields: [embeddings.fileId],
    references: [file.id],
  }),
}));

export const agent = pgTable('agent', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  instructions: text('instructions').notNull().default(regularPrompt),
  modelId: text('model').notNull(),
  temperature: real('temperature').default(0.5),
  greeting: json('greeting')
    .notNull()
    .default(JSON.stringify(['Hello there!', 'How can I help you today?'])),
  font: text('font').default('Inter'),
  avatar: text('avatar'),
  logoS3Key: text('logo_s3_key'),
  isActive: boolean('is_active').default(true).notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  monthlyQueryLimit: integer('monthly_query_limit').default(100).notNull(),
  theme: text('theme', { enum: ['light', 'dark'] }),
  themeAttributes: json('theme_attributes'),
  isToolKnowledgebaseEnabled: boolean('is_tool_knowledgebase_enabled')
    .default(true)
    .notNull(),
  toolKnowledgebaseSettings: json('tool_knowledgebase_settings')
    .notNull()
    .default(
      JSON.stringify({
        maxResults: 5,
        minSimilarityScore: 0.5,
        isCustomFilteringEnabled: false,
      }),
    ),
  isCustomMetadataFilteringEnabled: boolean(
    'is_custom_metadata_filtering_enabled',
  )
    .default(false)
    .notNull(),
  isToolCreateDocumentEnabled: boolean('is_tool_create_document_enabled')
    .default(false)
    .notNull(),
  isToolUpdateDocumentEnabled: boolean('is_tool_update_document_enabled')
    .default(false)
    .notNull(),
  isToolCodeGenerationEnabled: boolean('is_tool_code_generation_enabled')
    .default(false)
    .notNull(),
  isToolImageGenerationEnabled: boolean('is_tool_image_generation_enabled')
    .default(false)
    .notNull(),
  isToolQueryDatabaseEnabled: boolean('is_tool_query_database_enabled')
    .default(false)
    .notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

export const agentRelations = relations(agent, ({ one, many }) => ({
  user: one(user, {
    fields: [agent.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [agent.organizationId],
    references: [organization.id],
  }),
  suggestedActions: many(agentSuggestedAction),
  folders: many(agentFolder),
  chats: many(chat),
  users: many(agentUser),
}));

export const agentSuggestedAction = pgTable('agent_suggested_action', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agent.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  action: text('action').notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

export const agentSuggestedQueryRelations = relations(
  agentSuggestedAction,
  ({ one }) => ({
    agent: one(agent, {
      fields: [agentSuggestedAction.agentId],
      references: [agent.id],
    }),
  }),
);

export const agentFolder = pgTable(
  'agent_folder',
  {
    id: uuid('id').notNull().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agent.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id')
      .notNull()
      .references(() => folder.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  },
  (table) => [primaryKey({ columns: [table.agentId, table.folderId] })],
);

export const agentFolderRelations = relations(agentFolder, ({ one }) => ({
  agent: one(agent, {
    fields: [agentFolder.agentId],
    references: [agent.id],
  }),
  folder: one(folder, {
    fields: [agentFolder.folderId],
    references: [folder.id],
  }),
}));

export const agentUser = pgTable(
  'agent_user',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agent.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    inviteEmail: text('invite_email'),
    inviteStatus: varchar('invite_status', {
      enum: ['pending', 'accepted'],
    }).default('pending'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex('agent_user_unique_index').on(table.agentId, table.userId),
    uniqueIndex('agent_user_invite_email_index').on(
      table.agentId,
      table.inviteEmail,
    ),
  ],
);

export const agentUserRelations = relations(agentUser, ({ one }) => ({
  agent: one(agent, {
    fields: [agentUser.agentId],
    references: [agent.id],
  }),
  user: one(user, {
    fields: [agentUser.userId],
    references: [user.id],
  }),
}));
