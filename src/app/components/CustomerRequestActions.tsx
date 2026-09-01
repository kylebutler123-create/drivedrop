'use client';

import {useRef, useState} from 'react';

type Action = 'CANCEL' | 'DELETE';
type Props = {
  jobId: string;
  vehicle: string;
  status: string;
  hasBooking: boolean;
  quoteCount: number;
  onRemoved: (action: Action) => void;
};

export default function CustomerRequestActions({jobId, vehicle, status, hasBooking, quoteCount, onRemoved}: Props) {
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const locked = hasBooking || ['CANCELLED', 'COMPLETED', 'BOOKED'].includes(status);

  async function act(action: Action) {
    if (inFlight.current || locked || (action === 'DELETE' && quoteCount > 0)) return;
    const wording = action === 'DELETE' ? 'delete this request permanently' : 'cancel this quote request';
    if (!window.confirm(`Are you sure you want to ${wording}?\n\n${vehicle}`)) return;
    inFlight.current = true;
    setPending(action);
    setError('');
    try {
      const response = await fetch('/api/jobs/cancel', {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({jobId, action}),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof result?.error === 'string' ? result.error : 'Unable to update this request. Please try again.');
        return;
      }
      if (action === 'DELETE' ? result?.deleted !== true : result?.cancelled !== true || result?.job?.id !== jobId) {
        setError('The result could not be confirmed. Refresh your requests to check before trying again.');
        return;
      }
      onRemoved(action);
    } catch {
      setError('We could not confirm the update. Check your connection and refresh your requests before trying again.');
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  if (locked) return null;
  return <div className="customerRequestActions" aria-busy={pending !== null}>
    <div className="actionButtons manageRequestActions">
      {quoteCount === 0 && <button type="button" className="btn light" disabled={pending !== null} onClick={() => void act('DELETE')}>
        {pending === 'DELETE' ? 'Deleting…' : 'Delete request'}
      </button>}
      <button type="button" className="btn navy" disabled={pending !== null} onClick={() => void act('CANCEL')}>
        {pending === 'CANCEL' ? 'Cancelling…' : 'Cancel request'}
      </button>
    </div>
    {error && <p className="formNotice errorNotice" role="alert">{error}</p>}
  </div>;
}
