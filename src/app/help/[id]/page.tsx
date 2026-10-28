import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RichText } from "@/components/chat/rich-text";
import { ARTICLES, getArticle } from "@/lib/help/articles";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ id: article.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).id);
  return { title: article?.title ?? "Article not found" };
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle((await params).id);
  if (!article) notFound();

  return (
    <article className="max-w-[65ch]">
      <nav aria-label="Breadcrumb" className="text-ink-muted text-sm">
        <Link href="/" className="hover:text-ink underline underline-offset-4">
          Help centre
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{article.topic}</span>
      </nav>
      <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        {article.title}
      </h1>
      <RichText
        text={article.body}
        className="text-ink-soft mt-6 space-y-4 text-[17px] leading-7"
      />
    </article>
  );
}
