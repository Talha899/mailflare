import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, listBlogPosts } from "@/lib/blog/posts";

type Params = { slug: string };

export function generateStaticParams() {
	return listBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
	const { slug } = await params;
	const post = getBlogPost(slug);
	if (!post) return { title: "Blog" };
	return {
		title: post.title,
		description: post.excerpt,
		openGraph: { images: [post.cover] },
	};
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
	const { slug } = await params;
	const post = getBlogPost(slug);
	if (!post) notFound();

	const blocks: typeof post.body = post.body.some((block) => block.type === "img")
		? post.body
		: [
				post.body[0],
				{
					type: "img",
					src: `/blog/${post.slug}-inline.svg`,
					alt: post.title,
					caption: post.excerpt,
				},
				...post.body.slice(1),
			];

	return (
		<article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<p className="text-sm text-[var(--muted-foreground)]">
				<Link href="/blog" className="hover:text-[var(--foreground)]">
					Blog
				</Link>
				<span> · {post.category} · {post.minutes} min</span>
			</p>
			<h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
			<p className="mt-3 text-[var(--muted-foreground)]">{post.excerpt}</p>
			<img
				src={post.cover}
				alt={post.title}
				className="mt-8 aspect-[1200/630] w-full rounded-2xl border border-[var(--border)] object-cover"
			/>
			<div className="mt-10 space-y-5">
				{blocks.map((block, index) => {
					if (block.type === "h2") {
						return (
							<h2 key={index} className="pt-2 text-xl font-semibold tracking-tight">
								{block.text}
							</h2>
						);
					}
					if (block.type === "ul") {
						return (
							<ul key={index} className="list-disc space-y-2 pl-5 text-base leading-7 text-[var(--muted-foreground)]">
								{block.items.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						);
					}
					if (block.type === "img") {
						return (
							<figure key={index} className="py-2">
								<img
									src={block.src}
									alt={block.alt}
									className="aspect-[1200/720] w-full rounded-2xl border border-[var(--border)] object-cover"
								/>
								{block.caption ? (
									<figcaption className="mt-2 text-center text-sm text-[var(--muted-foreground)]">{block.caption}</figcaption>
								) : null}
							</figure>
						);
					}
					return (
						<p key={index} className="text-base leading-7 text-[var(--muted-foreground)]">
							{block.text}
						</p>
					);
				})}
			</div>
		</article>
	);
}
