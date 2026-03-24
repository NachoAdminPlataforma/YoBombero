import { Question } from '../types';

/**
 * Calculates the next review date based on an optimized SM-2 spaced repetition algorithm.
 * 
 * @param question The question being reviewed
 * @param rating User feedback: 0 (AGAIN), 1 (HARD), 2 (GOOD), 3 (EASY)
 * @returns Object containing the new SRS fields
 */
export function calculateNextReview(
  question: Partial<Question>,
  rating: number
) {
  let easeFactor = question.easeFactor ?? 2.5;
  let interval = question.interval ?? 0;
  
  // 1. Ease Factor (EF) Management
  if (rating === 0) { // AGAIN
    easeFactor -= 0.20;
  } else if (rating === 1) { // HARD
    easeFactor -= 0.15;
  } else if (rating === 3) { // EASY
    easeFactor += 0.15;
  }
  // GOOD (2) keeps EF the same

  // Apply EF limits
  easeFactor = Math.max(1.3, Math.min(2.8, easeFactor));

  // 2. Interval Calculation
  if (rating === 0) { // AGAIN
    interval = 1;
  } else if (interval === 0) {
    // First time answering correctly
    interval = rating === 3 ? 4 : 1;
  } else {
    if (rating === 1) { // HARD
      interval = interval * 1.2;
    } else if (rating === 2) { // GOOD
      interval = interval * easeFactor;
    } else if (rating === 3) { // EASY
      interval = interval * easeFactor * 1.3;
    }
  }

  // 3. Fuzz Implementation (+/- 5% for intervals > 3 days)
  if (interval > 3) {
    const fuzzFactor = 0.95 + Math.random() * 0.10; // 0.95 to 1.05
    interval = interval * fuzzFactor;
  }

  interval = Math.max(1, Math.round(interval));

  const now = new Date();
  const nextDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    nextReview: nextDate.toISOString(),
    lastSeen: now.toISOString(),
    easeFactor,
    interval,
    retrievability: calculateRetrievability(nextDate.toISOString(), interval)
  };
}

/**
 * Calculates the retrievability index.
 * retrievability = days_delayed / current_interval
 */
export function calculateRetrievability(nextReviewDate: string, interval: number): number {
  if (!nextReviewDate || !interval || interval === 0) return 0;
  
  const now = new Date();
  const nextReview = new Date(nextReviewDate);
  const diffTime = now.getTime() - nextReview.getTime();
  const daysDelayed = diffTime / (1000 * 60 * 60 * 24);
  
  return daysDelayed / interval;
}

