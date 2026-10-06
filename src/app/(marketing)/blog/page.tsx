import type { Metadata } from "next";
import Link from "next/link";
import { listBlogPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
	title: "Blog",
	description: "Notes on custom-domain email, DNS, routing, and running Dispatch.",
};

export default function BlogIndexPage() {
	const posts = listBlogPosts();
	return (
		<div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<h1 className="text-4xl font-semibold tracking-tight">Blog</h1>
			<p className="mt-3 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
				How mail actually moves on a host you run.
			</p>
			<ul className="mt-12 grid gap-6 sm:grid-cols-2">
				{posts.map((post) => (
					<li key={post.slug}>
						<Link href={`/blog/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
							<img src={post.cover} alt={post.title} className="aspect-[1200/630] w-full object-cover" />
							<div className="flex flex-1 flex-col gap-2 p-5">
								<p className="text-xs text-[var(--muted-foreground)]">
									{post.category} · {post.minutes} min
								</p>
								<h2 className="text-lg font-semibold tracking-tight group-hover:underline">{post.title}</h2>
								<p className="text-sm leading-6 text-[var(--muted-foreground)]">{post.excerpt}</p>
							</div>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
