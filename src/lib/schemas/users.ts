import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.email('Enter a valid email'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(['Client', 'Sourcer', 'Copywriter', 'Manager', 'Admin']),
  manager_id: z.uuid('Invalid manager').nullable().optional(),
});

export const editUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  role: z.enum(['Client', 'Sourcer', 'Copywriter', 'Manager', 'Admin']).optional(),
  manager_id: z.uuid('Invalid manager').nullable().optional(),
});

export const disableUserSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type EditUserInput = z.infer<typeof editUserSchema>;
export type DisableUserInput = z.infer<typeof disableUserSchema>;
