import type { ChatMessage, Conversation } from '../../types/domain';

export type ConversationDto = Record<string, unknown>;
export type ChatMessageDto = Record<string, unknown>;

export function mapConversationDtoToModel(_dto: ConversationDto): Conversation {
  throw new Error('Not implemented: mapConversationDtoToModel');
}

export function mapChatMessageDtoToModel(_dto: ChatMessageDto): ChatMessage {
  throw new Error('Not implemented: mapChatMessageDtoToModel');
}
