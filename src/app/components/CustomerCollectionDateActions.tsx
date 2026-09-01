'use client';

import {useRef, useState, type FormEvent} from 'react';

type DateUpdate = {
  proposedCollectionDate: string | null;
  dateNegotiationStatus: 'ACCEPTED' | 'DECLINED' | 'COUNTERED';
};

type Props = {
  quoteId: string;
  proposedDate: string;
  onUpdated: (update: DateUpdate) => void;
};

export default function CustomerCollectionDateActions({quoteId, proposedDate, onUpdated}: Props) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const inputId = `counter-date-${quoteId}`;
  const errorId = `counter-date-error-${quoteId}`;

  async function send(action: 'ACCEPT' | 'DECLINE' | 'COUNTER') {
    if (inFlight.current) return;
    if (action === 'COUNTER' && !date) {
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
        body: JSON.stringify({quoteId, action, ...(action === 'COUNTER' ? {date} : {})}),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof result?.error === 'string' ? result.error : 'Unable to update the collection date. Please try again.');
        return;
      }
      const expectedStatus = action === 'ACCEPT' ? 'ACCEPTED' : action === 'DECLINE' ? 'DECLINED' : 'COUNTERED';
      const validDate = action === 'DECLINE'
        ? result?.proposedCollectionDate === null
        : typeof result?.proposedCollectionDate === 'string' && Number.isFinite(Date.parse(result.proposedCollectionDate));
      if (result?.id !== quoteId || result?.dateNegotiationStatus !== expectedStatus || !validDate) {
        setError('The response could not be confirmed. Refresh your quotes to check the date before trying again.');
        return;
      }
      // The endpoint returns the transporter price; keep the customer's displayed total.
      onUpdated({
        proposedCollectionDate: result.proposedCollectionDate,
        dateNegotiationStatus: expectedStatus,
      });
    } catch {
      setError('We could not confirm the update. Check your connection and refresh your quotes before trying again.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send('COUNTER');
  }

  return <div className="customerDateActions" aria-busy={pending}>
    {editing ? <form className="customerCounterDateForm" onSubmit={submit}>
      <div className="field">
        <label htmlFor={inputId}>Your preferred collection date</label>
        <input id={inputId} type="date" value={date} required disabled={pending}
          aria-describedby={error ? errorId : undefined}
          onChange={event => {setDate(event.target.value); setError('');}} autoFocus />
      </div>
      <div className="actionButtons">
        <button type="submit" className="btn orange" disabled={pending}>{pending ? 'Sending…' : 'Send proposed date'}</button>
        <button type="button" className="btn light" disabled={pending} onClick={() => {setEditing(false); setError('');}}>Cancel</button>
      </div>
    </form> : <div className="actionButtons">
      <button type="button" className="btn orange" disabled={pending} onClick={() => void send('ACCEPT')}>Accept date</button>
      <button type="button" className="btn light" disabled={pending} onClick={() => void send('DECLINE')}>Keep original date</button>
      <button type="button" className="btn navy" disabled={pending} onClick={() => {setDate(proposedDate.slice(0, 10)); setError(''); setEditing(true);}}>Offer another date</button>
    </div>}
    {error && <p id={errorId} className="formNotice errorNotice" role="alert">{error}</p>}
  </div>;
}
