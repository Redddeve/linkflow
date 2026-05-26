'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  saveOrderContent,
  submitOrderContent,
} from '../../../app/dashboard/orders/actions';

interface Props {
  orderId: string;
  initialBody: string | null;
  status: string;
}

export function ContentEditorForm({ orderId, initialBody, status }: Props) {
  const [body, setBody] = useState(initialBody ?? '');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  const charCount = body.length;
  const canSubmit =
    charCount >= 50 && (status === 'In Progress' || status === 'Needs changes');

  function handleSave() {
    setSaveError(null);
    setSavedAt(null);
    startSave(async () => {
      try {
        await saveOrderContent({ orderId, body });
        setSavedAt(new Date().toLocaleTimeString());
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Failed to save');
      }
    });
  }

  function handleSubmit() {
    setSubmitError(null);
    startSubmit(async () => {
      try {
        await submitOrderContent({ orderId });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Failed to submit');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content-body">Content</Label>
          <span
            className={`text-xs tabular-nums ${charCount < 50 ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {charCount.toLocaleString()} chars
            {charCount < 50 ? ` (${50 - charCount} more needed)` : ''}
          </span>
        </div>
        <Textarea
          id="content-body"
          placeholder="Write the article content here…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          className="font-mono text-sm resize-y"
          disabled={status !== 'In Progress' && status !== 'Needs changes'}
        />
      </div>

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={isSaving || isSubmitting}
        >
          {isSaving ? 'Saving…' : 'Save draft'}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSaving || isSubmitting}
          title={
            !canSubmit
              ? 'Content must be at least 50 characters and status must be In Progress'
              : undefined
          }
        >
          {isSubmitting ? 'Submitting…' : 'Submit for review'}
        </Button>
        {savedAt && (
          <span className="text-xs text-muted-foreground ml-auto">
            Saved at {savedAt}
          </span>
        )}
      </div>
    </div>
  );
}
