import { z } from 'zod';

/**
 * Zod schema for AI-parsed voice log output.
 * Validates and coerces the GPT response before it reaches the database.
 */
export const parsedLogSchema = z.object({
  client: z.string().optional(),
  client_name: z.string().optional(),
  client_mentioned: z.string().optional(),
  client_id: z.string().nullable().optional(),
  activity_type: z.string().optional().default('work'),
  duration_minutes: z.coerce.number().min(0).max(1440).optional(),
  notes: z.string().optional(),
  revenue: z.coerce.number().min(0).optional(),
  summary: z.string().optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
});

export type ValidatedParsedLog = z.infer<typeof parsedLogSchema>;
