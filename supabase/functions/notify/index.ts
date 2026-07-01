import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotifyPayload {
  user_ids: string[];
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  item_type?: string;
  item_id?: string;
  scheduled_for?: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Exchange a service account JSON for a short-lived OAuth2 access token.
// FCM v1 API requires this instead of a static server key.
async function getFcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const payload = b64url({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  });

  const signingInput = `${header}.${payload}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0)).buffer;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${sig}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const { access_token } = await tokenRes.json();
  return access_token;
}

serve(async (req) => {
  try {
    const payload: NotifyPayload = await req.json();
    const { user_ids, notification_type, title, body, data, item_type, item_id, scheduled_for } = payload;

    let query = supabase
      .from('user_profile')
      .select('id, push_token, reminders_enabled')
      .in('id', user_ids)
      .not('push_token', 'is', null);

    if (notification_type === 'reminder') {
      query = query.eq('reminders_enabled', true);
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error('user_profile query error:', JSON.stringify(error));
      return new Response(JSON.stringify({ sent: 0, error: String(error) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!profiles?.length) {
      console.log('No eligible profiles for user_ids:', user_ids);
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const saRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!saRaw) throw new Error('FIREBASE_SERVICE_ACCOUNT secret is not set');
    const sa: ServiceAccount = JSON.parse(saRaw);

    const accessToken = await getFcmAccessToken(sa);

    const results = await Promise.all(
      profiles.map(async (profile) => {
        let success = false;
        let errorMessage: string | null = null;
        let fcmBody = '';

        try {
          const fcmRes = await fetch(
            `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: {
                  token: profile.push_token,
                  notification: { title, body },
                  android: {
                    notification: { channel_id: 'default' },
                  },
                  data: data ?? {},
                },
              }),
            },
          );
          fcmBody = await fcmRes.text();
          success = fcmRes.ok;
          if (!success) errorMessage = fcmBody;
        } catch (e) {
          errorMessage = String(e);
        }

        await supabase.from('notification_log').insert({
          user_id: profile.id,
          notification_type,
          item_type: item_type ?? null,
          item_id: item_id ?? null,
          scheduled_for: scheduled_for ?? null,
          success,
          error_message: errorMessage,
        });

        return success;
      }),
    );

    return new Response(
      JSON.stringify({ sent: results.filter(Boolean).length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('notify crash:', String(e));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
