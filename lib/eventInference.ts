import type { ReconstructedState } from '@/lib/stateReconstructor';

export interface InferredEvent {
  session_id: string;
  user_id: string | null;
  event_type: string;
  event_ts: string;
  typeuser?: 'tenant' | 'investor' | 'owneroccupier' | null;
  location_type?: 'rental' | 'investor' | 'owneroccupier' | null;
  location_value?: string | null;
  rating?: number | null;
  feedback?: string | null;
  cta_id?: string | null;
  cta_name?: string | null;
  meta: Record<string, unknown>;
}

/**
 * Find timestamp for when a variable was first set in the logs
 */
function findEventTimestampForVariable(logs: any[], variableName: string): string {
  if (!logs || logs.length === 0) return new Date().toISOString();

  for (const log of logs) {
    if (log.type === 'trace' && log.data?.type === 'set') {
      const payload = log.data.payload;
      if (payload && payload.key === variableName) {
        return log.timestamp || log.createdAt || new Date().toISOString();
      }
    }
  }

  return new Date().toISOString();
}

/**
 * Infer events from transcript state and logs
 * Events represent key funnel steps and user interactions
 */
export function inferEvents(
  sessionId: string,
  userId: string | null,
  state: ReconstructedState,
  logs: any[] = []
): InferredEvent[] {
  const events: InferredEvent[] = [];

  // Event 1: typeuser_selected - when user chooses tenant/investor/owneroccupier
  if (state.typeuser) {
    events.push({
      session_id: sessionId,
      user_id: userId,
      event_type: 'typeuser_selected',
      event_ts: findEventTimestampForVariable(logs, 'typeuser'),
      typeuser: state.typeuser,
      meta: {
        description: `User selected ${state.typeuser} as their user type`,
      },
    });
  }

  // Event 2: location_selected - when user chooses a location
  if (state.location_value && state.location_type) {
    events.push({
      session_id: sessionId,
      user_id: userId,
      event_type: 'location_selected',
      event_ts: findEventTimestampForVariable(logs, `${state.location_type}location`),
      typeuser: state.typeuser,
      location_type: state.location_type,
      location_value: state.location_value,
      meta: {
        description: `User selected ${state.location_value} for ${state.location_type}`,
      },
    });
  }

  // Event 3: rating_submitted - when user submits a rating
  if (state.rating) {
    events.push({
      session_id: sessionId,
      user_id: userId,
      event_type: 'rating_submitted',
      event_ts: findEventTimestampForVariable(logs, 'rating'),
      rating: state.rating,
      meta: {
        description: `User submitted rating of ${state.rating}/5`,
      },
    });

    // Event 4: feedback_submitted - only if rating is 1-3 and feedback exists
    if (state.rating <= 3 && state.feedback) {
      events.push({
        session_id: sessionId,
        user_id: userId,
        event_type: 'feedback_submitted',
        event_ts: findEventTimestampForVariable(logs, 'feedback'),
        rating: state.rating,
        feedback: state.feedback,
        meta: {
          description: `User submitted feedback for low rating (${state.rating}/5)`,
        },
      });
    }
  }

  // Event 5: CTA interactions - look for button/click traces
  extractCTAEvents(sessionId, userId, logs).forEach((event) => {
    events.push(event);
  });

  // Sort events by timestamp
  events.sort((a, b) => new Date(a.event_ts).getTime() - new Date(b.event_ts).getTime());

  return events;
}

/**
 * Extract CTA (Call-to-Action) events from transcript logs
 */
function extractCTAEvents(sessionId: string, userId: string | null, logs: any[]): InferredEvent[] {
  const ctaEvents: InferredEvent[] = [];

  if (!logs || logs.length === 0) return ctaEvents;

  for (const log of logs) {
    // Look for button click or click traces
    if (log.type === 'trace') {
      const traceType = log.data?.type;

      if (traceType === 'click' || traceType === 'button') {
        const payload = log.data.payload;
        if (payload) {
          const ctaId = payload.buttonId || payload.id || undefined;
          const ctaName = payload.label || payload.buttonLabel || payload.name || undefined;

          if (ctaName) {
            ctaEvents.push({
              session_id: sessionId,
              user_id: userId,
              event_type: 'cta_clicked',
              event_ts: log.timestamp || log.createdAt || new Date().toISOString(),
              cta_id: ctaId,
              cta_name: ctaName,
              meta: {
                description: `User clicked CTA: ${ctaName}`,
                payload,
              },
            });
          }
        }
      }
    }
  }

  return ctaEvents;
}
