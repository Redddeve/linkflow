'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { addToCart } from '@/app/dashboard/cart/actions';

interface Props {
  siteId: string;
  inMyCart: boolean;
}

export function AddToCartButton({ siteId, inMyCart }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (inMyCart) return;
    startTransition(async () => {
      try {
        await addToCart({ siteId });
      } catch {
        // revalidation handles UI update; CONFLICT is expected on double-click
      }
    });
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="sm"
              variant={inMyCart ? 'outline' : 'default'}
              disabled={inMyCart || isPending}
              onClick={handleAdd}
            >
              {inMyCart ? 'In cart' : isPending ? 'Adding…' : 'Add to cart'}
            </Button>
          }
        />
        {inMyCart && <TooltipContent>Already in cart</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}
