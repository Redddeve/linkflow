'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { addToCart } from '@/app/dashboard/cart/actions';

interface Props {
  siteId: string;
  inMyCart: boolean;
  inActiveOrder?: boolean;
}

export function AddToCartButton({ siteId, inMyCart, inActiveOrder = false }: Props) {
  const [isPending, startTransition] = useTransition();

  const disabled = inMyCart || inActiveOrder || isPending;

  function handleAdd() {
    if (disabled) return;
    startTransition(async () => {
      try {
        await addToCart({ siteId });
      } catch {
        // revalidation handles UI update; CONFLICT is expected on double-click
      }
    });
  }

  const label = inActiveOrder
    ? 'Ordered'
    : inMyCart
      ? 'In cart'
      : isPending
        ? 'Adding…'
        : 'Add to cart';

  const tooltip = inActiveOrder
    ? 'You already have an active order for this site'
    : inMyCart
      ? 'Already in cart'
      : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="sm"
              variant={inMyCart || inActiveOrder ? 'outline' : 'default'}
              disabled={disabled}
              onClick={handleAdd}
            >
              {label}
            </Button>
          }
        />
        {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}
