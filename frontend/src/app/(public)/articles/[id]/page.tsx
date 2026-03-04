import type { Metadata } from "next";
import { fetchArticleServer } from "@/lib/api/server";
import { getCoverUrl } from "@/lib/api/media";
import ArticleContent from "./ArticleContent";

const SITE_URL = "https://paulfun.net";
const SITE_NAME = "PaulFun Blogger";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticleServer(id);

  if (!article) {
    return { title: `文章不存在 | ${SITE_NAME}` };
  }

  const title = `${article.title} | ${SITE_NAME}`;
  const description =
    article.summary ||
    article.content?.replace(/<[^>]*>/g, "").slice(0, 160) ||
    "";
  const coverImage = getCoverUrl(article.coverImage);
  const url = `${SITE_URL}/articles/${article.id}`;

  return {
    title,
    description,
    openGraph: {
      title: article.title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      locale: "zh_TW",
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      ...(article.publishedAt && {
        publishedTime: article.publishedAt,
      }),
      ...(article.author && {
        authors: [article.author.displayName],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [coverImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function ArticlePage() {
  return <ArticleContent />;
}
