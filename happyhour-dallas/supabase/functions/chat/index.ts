import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseTime(t: string): number {
  const parts = t.split(':').map(Number);
  return parts[0] * 60 + (parts[1] ?? 0);
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const CROWD_LABEL = ['Empty', 'Quiet', 'Moderate', 'Busy', 'Packed'];
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, city = 'Dallas', history = [] } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: restaurants } = await supabase
      .from('restaurants')
      .select(`
        name, neighborhood, cuisine_type, average_rating, review_count,
        crowd_level, vibe_tags, address,
        happy_hours (day_of_week, start_time, end_time, is_active, label),
        menu_items (name, category, happy_hour_price, regular_price, is_featured, is_available)
      `)
      .eq('status', 'approved')
      .eq('city', city)
      .order('average_rating', { ascending: false });

    // Current time in Central Time (Dallas/Texas)
    const now = new Date();
    const ctStr = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const nowCT = new Date(ctStr);
    const todayDow = nowCT.getDay();
    const nowMin = nowCT.getHours() * 60 + nowCT.getMinutes();
    const timeStr = nowCT.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' });

    const restaurantLines = (restaurants ?? []).map((r: Record<string, unknown>) => {
      const happyHours = (r.happy_hours as Record<string, unknown>[] ?? []);
      const menuItems = (r.menu_items as Record<string, unknown>[] ?? []);

      const activeHH = happyHours.find((hh) =>
        hh.is_active &&
        hh.day_of_week === todayDow &&
        parseTime(hh.start_time as string) <= nowMin &&
        nowMin < parseTime(hh.end_time as string)
      );

      const todayHours = happyHours
        .filter((hh) => hh.is_active && hh.day_of_week === todayDow)
        .map((hh) => `${formatTime(hh.start_time as string)}–${formatTime(hh.end_time as string)}`)
        .join(', ');

      const deals = menuItems
        .filter((i) => i.happy_hour_price != null && i.is_available)
        .sort((a, b) => (a.happy_hour_price as number) - (b.happy_hour_price as number))
        .slice(0, 5)
        .map((i) => `${i.name} $${i.happy_hour_price}`)
        .join(' | ');

      const status = activeHH
        ? `🟢 ACTIVE now until ${formatTime(activeHH.end_time as string)}`
        : todayHours
        ? `Today's HH: ${todayHours}`
        : 'No happy hour today';

      const lines = [
        `• ${r.name} (${r.neighborhood ?? city}, ${r.cuisine_type ?? 'Bar'})`,
        `  ${status} | Crowd: ${CROWD_LABEL[r.crowd_level as number]} | ⭐ ${r.average_rating}/5 (${r.review_count} reviews)`,
      ];
      if (deals) lines.push(`  Deals: ${deals}`);
      return lines.join('\n');
    }).join('\n\n');

    const systemPrompt = `You are the Cheap Dates AI assistant — a friendly, knowledgeable guide for finding the best happy hours in ${city}.

Current time: ${timeStr} ${DAY_NAME[todayDow]}

LIVE RESTAURANT DATA:
${restaurantLines || `No restaurants available in ${city} yet — we're launching there soon!`}

GUIDELINES:
- Be concise and friendly. Keep responses under 130 words unless the user asks for a full list.
- Always mention prices when available and relevant to the question.
- For "what's open now" or "happening now" — ONLY mention spots with 🟢 ACTIVE.
- For "best deals" — lead with the lowest happy_hour_price items.
- For "quiet spot" or "not crowded" — prioritize Empty or Quiet crowd levels.
- For "best rated" — sort by rating.
- If asked how the app works: users check in at spots to earn passport stamps and badges, save favorites with the heart button, write reviews to earn points, and compete on the leaderboard.
- Never invent data. Only use what's in the database above.
- Use bullet points when listing 3+ restaurants.
- Don't repeat the restaurant's neighborhood if the user asked about a specific neighborhood.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 450,
      system: systemPrompt,
      messages: [
        ...(history as Anthropic.MessageParam[]).slice(-8),
        { role: 'user', content: message },
      ],
    });

    const reply = (response.content[0] as Anthropic.TextBlock).text;

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
