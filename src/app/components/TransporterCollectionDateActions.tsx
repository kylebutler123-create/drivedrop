'use client';

import {useRef, useState, type FormEvent} from 'react';

type DateUpdate = {
  proposedCollectionDate: string;
  dateNegotiationStatus: 'ACCEPTED' | 'PROPOSED';
};

type Props = {
  quoteId: string;
  customerDate: string;
  onUpdated: (update: DateUpdate) => void;
};

export default function TransporterCollectionDateActions({quoteId, customerDate, onUpdated}: Props) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const errorId = `transporter-date-error-${quoteId}`;

  async function send(action: 'ACCEPT' | 'PROPOSE') {
    if (inFlight.current) return;
    if (action === 'PROPOSE' && !date) {
      setError('Choose a collection date.');
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/quotes/date-negotiation', {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({quoteId, action, ...(action === 'PROPOSE' ? {date} : {})}),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof result?.error === 'string' ? result.error : 'Unable to update the collection date. Please try again.');
        return;
      }
      const expectedStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'PROPOSED';
      if (result?.id !== quoteId || result?.dateNegotiationStatus !== expectedStatus ||
          typeof result?.proposedCollectionDate !== 'string' || !Number.isFinite(Date.parse(result.proposedCollectionDate))) {
        setError('The response could not be confirmed. Refresh your jobs to check the date before trying again.');
        return;
      }
      onUpdated({
        proposedCollectionDate: result.proposedCollectionDate,
        dateNegotiationStatus: expectedStatus,
      });
    } catch {
      setError('We could not confirm the update. Check your connection and refresh your jobs before trying again.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send('PROPOSE');
  }

  return <div className="requoteWrap" aria-busy={pending}>
    {editing ? <form className="requoteForm" onSubmit={submit}>
      <div className="requoteHeading"><strong>Suggest another collection date</strong><small>The customer can review your proposed date.</small></div>
      <label>COLLECTION DATE
        <input type="date" value={date} required disabled={pending}
          aria-describedby={error ? errorId : undefined}
          onChange={event => {setDate(event.target.value); setError('');}} autoFocus />
      </label>
      <div className="requoteActions">
        <button type="submit" className="btn orange" disabled={pending}>{pending ? 'Sending…' : 'Send proposed date'}</button>
        <button type="button" className="btn light" disabled={pending} onClick={() => {setEditing(false); setError('');}}>Cancel</button>
      </div>
    </form> : <div className="requoteActions">
      <button type="button" className="btn orange" disabled={pending} onClick={() => void send('ACCEPT')}>{pending ? 'Accepting…' : 'Accept customer date'}</button>
      <button type="button" className="btn light" disabled={pending} onClick={() => {setDate(customerDate.slice(0, 10)); setError(''); setEditing(true);}}>Suggest another date</button>
    </div>}
    {error && <p id={errorId} className="requoteNotice error" role="alert">{error}</p>}
  </div>;
}
