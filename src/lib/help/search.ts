import MiniSearch from "minisearch";
import { ARTICLES, articleUrl, type Article } from "./articles";

/*
 * Keyword (BM25) search over the help centre.
 *
 * With ~15 articles this is fast, free and deterministic, and the retrieval
 * eval (evals/retrieval.ts) tells us if it stops being good enough. See
 * openspec design.md for why there are no embeddings yet.
 */

export type SearchResult = {
  id: string;
  title: string;
  url: string;
  content: string;
  score: number;
};

/**
 * Words customers use that our articles don't. Each query term found here is
 * searched as well as its expansion. Keep this small and let the retrieval
 * eval justify every entry.
 */
const SYNONYMS: Record<string, string[]> = {
  overseas: ["international"],
  abroad: ["international", "overseas"],
  lost: ["freeze", "stolen"],
  lock: ["freeze"],
  block: ["freeze"],
  stolen: ["lost"],
  arrive: ["business", "days"],
  cost: ["fee"],
  refund: ["dispute"],
  password: ["passcode"],
  pin: ["passcode"],
};

/** Below this fraction of the best score, a result is noise, not a second answer. */
const RELATIVE_CUTOFF = 0.35;
/** Below this absolute score, even the best match isn't really a match. */
const MIN_SCORE = 6;

const index = new MiniSearch<Article>({
  idField: "id",
  fields: ["title", "keywords", "body"],
  storeFields: ["id", "title", "body"],
  extractField: (doc, field) => {
    const value = doc[field as keyof Article];
    return Array.isArray(value) ? value.join(" ") : String(value);
  },
  searchOptions: {
    boost: { title: 3, keywords: 2 },
    prefix: (term) => term.length > 3,
    fuzzy: (term) => (term.length > 5 ? 0.2 : false),
    combineWith: "OR",
  },
});
index.addAll(ARTICLES);

// "bluegum" is in almost every article and question, so it carries no signal.
const STOP_WORDS = new Set(
  "bluegum a an and are as at be by can do does for from how i if in is it its me my of on or our so that the this to was what when where which who why will with you your".split(
    " ",
  ),
);

export function expandQuery(query: string): string {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term && !STOP_WORDS.has(term));

  const expanded = new Set(terms);
  for (const term of terms) {
    for (const synonym of SYNONYMS[term] ?? []) expanded.add(synonym);
  }
  return [...expanded].join(" ");
}

export function searchHelpCentre(query: string, limit = 3): SearchResult[] {
  const expanded = expandQuery(query);
  if (!expanded) return [];

  const hits = index.search(expanded);
  const best = hits[0]?.score ?? 0;
  if (best < MIN_SCORE) return [];

  return hits
    .filter((hit) => hit.score >= best * RELATIVE_CUTOFF)
    .slice(0, limit)
    .map((hit) => ({
      id: hit.id as string,
      title: hit.title as string,
      url: articleUrl(hit.id as string),
      content: hit.body as string,
      score: Math.round(hit.score * 10) / 10,
    }));
}
