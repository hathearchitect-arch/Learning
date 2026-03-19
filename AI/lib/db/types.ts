import type { InferSelectModel } from 'drizzle-orm';
import type {
  user,
  chat,
  document,
  message,
  stream,
  suggestion,
  vote,
  agent,
  organization,
} from './schema';

export type User = InferSelectModel<typeof user>;
export type Chat = InferSelectModel<typeof chat>;
export type DBMessage = InferSelectModel<typeof message>;
export type Vote = InferSelectModel<typeof vote>;
export type Document = InferSelectModel<typeof document>;
export type Suggestion = InferSelectModel<typeof suggestion>;
export type Stream = InferSelectModel<typeof stream>;
export type Agent = InferSelectModel<typeof agent>;
export type Organization = InferSelectModel<typeof organization>;
