/**
 * Threat Engine — Real API Edition
 * ─────────────────────────────────
 * Priority:
 *   1. NewsAPI (NEWS_API_KEY)  + Twitter API v2 (TWITTER_BEARER_TOKEN)
 *   2. NewsAPI only            (if Twitter key missing / fails)
 *   3. OpenAI GPT-4o-mini      (OPENAI_API_KEY)
 *   4. Heuristic fallback      (always works, no key needed)
 *
 * Zones:  GREEN 0-30 | YELLOW 31-50 | ORANGE 51-70 | RED 71-100
 */

export interface ThreatResult {
  score: number;
  zone: "GREEN" | "YELLOW" | "ORANGE" | "RED";
  summary: string;
  sources?: string[]; // article/tweet titles used
}

// ── Zone classifier ────────────────────────────────────────────────────────
export function classifyZone(score: number): ThreatResult["zone"] {
  if (score <= 30) return "GREEN";
  if (score <= 50) return "YELLOW";
  if (score <= 70) return "ORANGE";
  return "RED";
}

// ── Score-based TTL (hours) ────────────────────────────────────────────────
export function scoreToTTLHours(score: number): number {
  if (score <= 30) return 3;   // Green  — refresh quickly (low risk, can change)
  if (score <= 50) return 6;   // Yellow
  if (score <= 70) return 10;  // Orange
  return 24;                   // Red    — danger persists longer
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword scoring helpers
// ─────────────────────────────────────────────────────────────────────────────
const DANGER_KEYWORDS = [
  "crime", "murder", "robbery", "assault", "riot", "shooting", "stabbing",
  "theft", "kidnap", "terror", "bomb", "explosion", "attack", "violence",
  "rape", "gang", "drug", "trafficking", "unrest", "protest", "clash",
  "flood", "accident", "fire", "emergency", "curfew", "police", "arrest",
];
const SAFE_KEYWORDS = [
  "festival", "celebration", "tourism", "award", "victory", "inauguration",
  "peace", "summit", "concert", "parade", "sports", "development", "investment",
];

function scoreText(text: string): number {
  const lower = text.toLowerCase();
  let s = 0;
  for (const kw of DANGER_KEYWORDS) if (lower.includes(kw)) s += 12;
  for (const kw of SAFE_KEYWORDS)   if (lower.includes(kw)) s -= 6;
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// NewsAPI
// ─────────────────────────────────────────────────────────────────────────────
interface NewsSignal { rawScore: number; titles: string[] }

async function fetchNewsSignals(locationName: string): Promise<NewsSignal | null> {
  const key = process.env.NEWS_API_KEY;
  if (!key) return null;

  const city = locationName.split(",")[0].trim();
  const query = encodeURIComponent(`"${city}" AND (crime OR theft OR attack OR incident OR protest OR riot)`);
  const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${key}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.warn("[threat-engine] NewsAPI error:", res.status);
      return null;
    }
    const data = await res.json();
    const articles: Array<{ title: string; description: string | null }> =
      data.articles ?? [];

    const titles: string[] = [];
    let rawScore = 0;

    for (const a of articles) {
      const combined = `${a.title ?? ""} ${a.description ?? ""}`;
      rawScore += scoreText(combined);
      if (a.title) titles.push(a.title);
    }

    // Normalise: each article adds up to ~120 pts raw; clamp and scale
    const normalised = Math.min(100, Math.max(0, rawScore / Math.max(articles.length, 1)));
    console.log(`[threat-engine] NewsAPI — ${articles.length} articles, raw=${rawScore}, normalised=${normalised}`);
    return { rawScore: normalised, titles };
  } catch (err) {
    console.warn("[threat-engine] NewsAPI fetch failed:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Twitter / X API v2
// ─────────────────────────────────────────────────────────────────────────────
interface TwitterSignal { rawScore: number; titles: string[] }

async function fetchTwitterSignals(locationName: string): Promise<TwitterSignal | null> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) return null;

  const city = locationName.split(",")[0].trim();
  const query = encodeURIComponent(
    `(crime OR theft OR attack OR incident OR riot) "${city}" -is:retweet lang:en`,
  );
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&tweet.fields=text`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.warn("[threat-engine] Twitter API error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const tweets: Array<{ text: string }> = data.data ?? [];

    const titles: string[] = [];
    let rawScore = 0;

    for (const t of tweets) {
      rawScore += scoreText(t.text);
      titles.push(t.text.slice(0, 80) + (t.text.length > 80 ? "…" : ""));
    }

    const normalised = Math.min(100, Math.max(0, rawScore / Math.max(tweets.length, 1)));
    console.log(`[threat-engine] Twitter — ${tweets.length} tweets, normalised=${normalised}`);
    return { rawScore: normalised, titles };
  } catch (err) {
    console.warn("[threat-engine] Twitter fetch failed:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic fallback (always works)
// ─────────────────────────────────────────────────────────────────────────────
const HIGH_RISK_LOCATION = ["border","slum","industrial","shanty","red light","conflict"];
const CAUTION_LOCATION   = ["market","bazaar","station","junction","highway","bus stand","railway"];
const SAFE_LOCATION      = ["resort","hotel","park","museum","hospital","university","mall","airport","tourist"];

function heuristicScore(locationName: string): number {
  const lower = locationName.toLowerCase();
  const hour  = new Date().getHours();
  let score   = 22;
  for (const kw of HIGH_RISK_LOCATION) if (lower.includes(kw)) score += 18;
  for (const kw of CAUTION_LOCATION)   if (lower.includes(kw)) score += 8;
  for (const kw of SAFE_LOCATION)      if (lower.includes(kw)) score -= 8;
  if (hour >= 22 || hour <= 4) score += 15;
  else if (hour >= 19)          score += 7;
  score += Math.round((Math.random() - 0.5) * 14);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Build human-readable summary
// ─────────────────────────────────────────────────────────────────────────────
function buildSummary(
  locationName: string,
  score: number,
  zone: string,
  sources: string[],
  usedApis: string[],
): string {
  const hour = new Date().getHours();
  const timeNote =
    hour >= 22 || hour <= 4 ? "Late-night hours elevate risk." :
    hour >= 19               ? "Evening — remain cautious."    : "";

  const zoneDesc: Record<string, string> = {
    GREEN:  "No significant threat signals detected nearby.",
    YELLOW: "Minor incidents reported in the vicinity. Stay aware.",
    ORANGE: "Elevated incidents detected — avoid isolated areas.",
    RED:    "High-risk signals detected. Avoid this area and alert authorities.",
  };

  const apiNote = usedApis.length
    ? `Data from: ${usedApis.join(" + ")}.`
    : "Estimated from location context.";

  const topSource = sources.length ? ` Latest: "${sources[0].slice(0, 80)}…"` : "";

  return `${zoneDesc[zone]} ${timeNote} ${apiNote}${topSource} Score: ${Math.round(score)}/100 for ${locationName.split(",")[0]}.`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────
export async function analyzeThreat(locationName: string): Promise<ThreatResult> {
  // Run news + twitter in parallel
  const [newsSignal, twitterSignal] = await Promise.all([
    fetchNewsSignals(locationName),
    fetchTwitterSignals(locationName),
  ]);

  const usedApis: string[] = [];
  const allSources: string[] = [];

  // Weighted composite score
  // News 60% | Twitter 40% | heuristic base if neither available
  let score: number;

  if (newsSignal || twitterSignal) {
    let weightedSum  = 0;
    let totalWeight  = 0;

    if (newsSignal) {
      weightedSum += newsSignal.rawScore * 0.6;
      totalWeight += 0.6;
      usedApis.push("NewsAPI");
      allSources.push(...newsSignal.titles.slice(0, 3));
    }
    if (twitterSignal) {
      weightedSum += twitterSignal.rawScore * 0.4;
      totalWeight += 0.4;
      usedApis.push("Twitter");
      allSources.push(...twitterSignal.titles.slice(0, 2));
    }

    score = totalWeight > 0 ? weightedSum / totalWeight : heuristicScore(locationName);

    // Time-of-day modifier (+10 late night)
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 4) score = Math.min(100, score + 10);
    score = Math.round(score);
  } else {
    // Full heuristic fallback
    score = heuristicScore(locationName);
  }

  const zone    = classifyZone(score);
  const summary = buildSummary(locationName, score, zone, allSources, usedApis);

  return { score, zone, summary, sources: allSources };
}
