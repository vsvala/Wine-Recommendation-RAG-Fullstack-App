/**
 * services/explainer.js — per-wine LLM blurb generation
 *
 * Sends all top-5 wines to OpenAI in a single chat call.
 * The model returns one short blurb (1–2 sentences) per wine,
 * tailored to the user's query.
 *
 * Single call keeps costs low and latency acceptable (~1–2s).
 */

import OpenAI from 'openai';

let client;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/**
 * Generate a short recommendation blurb for each wine.
 * @param {Array} wines - ranked wine objects
 * @param {string} query - original user query
 * @returns {Promise<Array>} same wines with an `explanation` field added
 */
export async function explain(wines, query) {
  const wineList = wines
    .map(
      (w, i) =>
        `${i + 1}. ${w.title} — ${w.variety}, ${w.country}, $${w.price}, ${w.points}pts\n   "${w.description}"`
    )
    .join('\n\n');

  const prompt = `You are a knowledgeable sommelier. A customer asked: "${query}"

Here are the top wine matches:

${wineList}

For each wine (1–${wines.length}), write exactly one sentence (max 20 words) explaining why it fits the customer's request. Be specific and helpful.

Reply in this exact JSON format:
[
  { "index": 1, "explanation": "..." },
  { "index": 2, "explanation": "..." }
]`;

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  let blurbs = [];
  try {
    const parsed = JSON.parse(response.choices[0].message.content);
    // The model may return { explanations: [...] } or just [...]
    blurbs = Array.isArray(parsed) ? parsed : (parsed.explanations ?? parsed[Object.keys(parsed)[0]]);
  } catch {
    // If parsing fails, return wines without explanations rather than crashing
    return wines.map((w) => ({ ...w, explanation: '' }));
  }

  return wines.map((wine, i) => {
    const blurb = blurbs.find((b) => b.index === i + 1);
    return { ...wine, explanation: blurb?.explanation ?? '' };
  });
}
