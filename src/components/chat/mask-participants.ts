import type { ChatParticipant, ChatCategory } from '@/lib/data/chat';
import type { UserRole } from '@/lib/features/auth';

export interface MaskedParticipant {
  id: string;
  displayName: string;
  initials: string;
  role: UserRole | null;
  masked: boolean;
}

export function shouldMaskCategory(
  viewerRole: UserRole | null,
  category: ChatCategory,
) {
  return (
    viewerRole === 'Client' && (category === 'Support' || category === 'Sales')
  );
}

export function maskParticipants(
  participants: ChatParticipant[],
  category: ChatCategory,
  viewerRole: UserRole | null,
  actorId: string,
): MaskedParticipant[] {
  const mask = shouldMaskCategory(viewerRole, category);
  return participants.map((p) => {
    if (
      mask &&
      p.id !== actorId &&
      (p.role === 'Admin' || p.role === 'Manager')
    ) {
      return {
        id: p.id,
        displayName: 'Support',
        initials: 'S',
        role: null,
        masked: true,
      };
    }
    return {
      id: p.id,
      displayName: `${p.first_name} ${p.last_name}`,
      initials: `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase(),
      role: p.role,
      masked: false,
    };
  });
}
