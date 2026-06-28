function requireEnv(value: string | undefined, key: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  supabase: {
    url: requireEnv(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL'),
    anonKey: requireEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  },
  ai: {
    voiceParseModel: process.env.VOICE_PARSE_MODEL ?? 'claude-haiku-4-5',
    voiceParseMaxTokens: Number(process.env.VOICE_PARSE_MAX_TOKENS ?? 300),
    voiceTranscriptionMaxSeconds: Number(process.env.VOICE_TRANSCRIPTION_MAX_SECONDS ?? 120),
  },
  digest: {
    lookaheadDays: Number(process.env.DAILY_DIGEST_LOOKAHEAD_DAYS ?? 3),
  },
} as const;
