'use client';

import {useRef, useState, type FormEvent} from 'react';

type Review = {id: string; bookingId: string; rating: number; body?: string | null; verified: boolean};
type Props = {bookingId: string; onSubmitted: (review: Review) => void};
const scores = [1, 2, 3, 4, 5];

export default function CustomerReviewForm({bookingId, onSubmitted}: Props) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const commentId = `review-comment-${bookingId}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError('Choose a rating from 1 to 5 stars.');
      return;
    }
    if (body.length > 2000) {
      setError('Keep your review within 2,000 characters.');
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({bookingId, rating, body: body.trim() || undefined}),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof result?.error === 'string' ? result.error : 'Unable to submit your review. Please try again.');
        return;
      }
      if (typeof result?.id !== 'string' || !result.id || result.bookingId !== bookingId ||
          result.rating !== rating || result.verified !== true) {
        setError('We could not confirm the saved review. Refresh this delivery to check before trying again.');
        return;
      }
      onSubmitted(result);
    } catch {
      setError('We could not confirm whether your review was saved. Check your connection and refresh this delivery before trying again.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (!editing) return <button type="button" className="btn navy fullBtn" onClick={() => {setError(''); setEditing(true);}}>Leave verified review</button>;

  return <form className="customerReviewForm infoPanel" onSubmit={submit} aria-busy={pending}>
    <h3>Review your delivery</h3>
    <fieldset className="customerReviewRating" disabled={pending}>
      <legend>Your rating</legend>
      <div className="customerReviewStars">
        {scores.map(score => <label key={score} className={`customerReviewStar ${score <= rating ? 'isSelected' : ''}`}>
          <input type="radio" name={`review-rating-${bookingId}`} value={score} checked={rating === score} required
            onChange={() => {setRating(score); setError('');}} />
          <span aria-hidden="true">★</span>
          <span className="customerReviewSrOnly">{score} {score === 1 ? 'star' : 'stars'}</span>
        </label>)}
      </div>
      <p className="customerReviewRatingValue" aria-live="polite">{rating ? `${rating} of 5 stars` : 'Choose 1 to 5 stars'}</p>
    </fieldset>
    <div className="field">
      <label htmlFor={commentId}>Comment (optional)</label>
      <textarea id={commentId} value={body} onChange={event => setBody(event.target.value)}
        disabled={pending} maxLength={2000} rows={4} placeholder="How was your vehicle delivery?" />
    </div>
    {error && <p className="formNotice errorNotice" role="alert">{error}</p>}
    <div className="actionButtons">
      <button type="submit" className="btn orange" disabled={pending}>{pending ? 'Submitting…' : 'Submit review'}</button>
      <button type="button" className="btn light" disabled={pending} onClick={() => {if (!inFlight.current) {setEditing(false); setError('');}}}>Cancel</button>
    </div>
  </form>;
}
