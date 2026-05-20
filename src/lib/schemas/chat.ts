import { z } from 'zod';

export const createChatSchema = z.object({
  title:   z.string().min(1, 'Title is required').max(200),
  userIds: z.array(z.string().uuid()).min(2, 'At least 2 participants required'),
});

export const editChatSchema = z.object({
  chatId:  z.string().uuid(),
  title:   z.string().min(1, 'Title is required').max(200),
  userIds: z.array(z.string().uuid()).min(2, 'At least 2 participants required'),
});

export const changeChatStatusSchema = z.object({
  chatId: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  chatId:  z.string().uuid(),
  content: z.string().min(1, 'Message cannot be empty').max(10_000),
});

export const startOrderChatSchema = z.object({
  orderId: z.string().uuid(),
});

export type CreateChatInput      = z.input<typeof createChatSchema>;
export type EditChatInput         = z.input<typeof editChatSchema>;
export type ChangeChatStatusInput = z.input<typeof changeChatStatusSchema>;
export type SendMessageInput      = z.input<typeof sendMessageSchema>;
export type StartOrderChatInput   = z.input<typeof startOrderChatSchema>;
