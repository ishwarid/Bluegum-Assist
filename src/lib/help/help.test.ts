import { describe, expect, it } from "vitest";
import { ARTICLES, getArticle } from "./articles";
import { expandQuery, searchHelpCentre } from "./search";

describe("help-centre articles", () => {
  it("have unique ids that are safe in a URL", () => {
    const ids = ARTICLES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("all have a title and a body", () => {
    for (const article of ARTICLES) {
      expect(article.title.length).toBeGreaterThan(5);
      expect(article.body.length).toBeGreaterThan(100);
    }
  });

  it("looks articles up by id", () => {
    expect(getArticle("replace-a-card")?.title).toBe("Replacing a card");
    expect(getArticle("nope")).toBeUndefined();
  });
});

describe("expandQuery", () => {
  it("drops stop words and the brand name", () => {
    expect(expandQuery("How do I contact Bluegum?")).toBe("contact");
  });

  it("adds synonyms customers use that articles don't", () => {
    expect(expandQuery("sent money overseas").split(" ")).toContain("international");
  });

  it("returns nothing for a query that's all stop words", () => {
    expect(expandQuery("what is it?")).toBe("");
  });
});

describe("searchHelpCentre", () => {
  it("ranks the most relevant article first", () => {
    expect(searchHelpCentre("How do I dispute a charge?")[0]?.id).toBe("dispute-a-transaction");
  });

  it("returns the article URL and full content for the model to quote", () => {
    const [top] = searchHelpCentre("replacement card delivery time");
    expect(top?.url).toBe("/help/replace-a-card");
    expect(top?.content).toContain("5 to 7 business days");
  });

  it("returns at most the requested number of results", () => {
    expect(searchHelpCentre("card", 2).length).toBeLessThanOrEqual(2);
  });

  it("returns nothing when no article is a real match", () => {
    expect(searchHelpCentre("What is the share price?")).toEqual([]);
    expect(searchHelpCentre("")).toEqual([]);
  });
});
