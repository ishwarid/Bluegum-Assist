import Link from "next/link";
import { ARTICLES, articleUrl, type Topic } from "@/lib/help/articles";

const TOPIC_ORDER: Topic[] = ["Cards", "Payments", "Accounts", "Fees", "Security", "Support"];

export default function HelpCentrePage() {
  return (
    <div className="space-y-14">
      <header className="max-w-2xl">
        <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          How can we help?
        </h1>
        <p className="text-ink-soft mt-4 text-lg leading-relaxed">
          Browse the help centre, or ask Bluegum Assist. It answers from these articles and can
          check or freeze your cards for you.
        </p>
      </header>

      <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {TOPIC_ORDER.map((topic) => (
          <section key={topic} aria-labelledby={`topic-${topic}`}>
            <h2 id={`topic-${topic}`} className="border-line border-b pb-2 text-lg font-semibold">
              {topic}
            </h2>
            <ul className="mt-3 space-y-2">
              {ARTICLES.filter((a) => a.topic === topic).map((article) => (
                <li key={article.id}>
                  <Link
                    href={articleUrl(article.id)}
                    className="text-leaf-strong decoration-leaf/40 hover:decoration-leaf-strong underline underline-offset-4"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
