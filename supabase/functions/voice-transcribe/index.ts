import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Receives audio file from client, transcribes via OpenAI Whisper, returns text.
serve(async (_req) => {
  return new Response(JSON.stringify({ error: 'Not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
});
