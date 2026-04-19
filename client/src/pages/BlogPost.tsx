import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import { getBlogPostBySlug, BLOG_POSTS } from "@/lib/blogPosts";
import NotFound from "./NotFound";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug;
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  if (!post) return <NotFound />;

  const others = BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-semibold tracking-wider uppercase text-sm">
              Baylio
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/faq"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </Link>
            <Link href="/blog" className="text-sm text-foreground font-medium">
              Blog
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Article ─── */}
      <article className="container py-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-3 w-3" />
            All posts
          </Link>
          <Badge variant="secondary" className="mb-4 text-xs">
            {post.category}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
            {post.title}
          </h1>
          <p className="text-sm text-muted-foreground mb-10">{post.readTime}</p>
          <div className="prose prose-sm md:prose-base max-w-none">
            {post.content.split("\n\n").map((para, i) => {
              if (para.startsWith("## ")) {
                return (
                  <h2
                    key={i}
                    className="text-xl md:text-2xl font-semibold mt-10 mb-4"
                  >
                    {para.replace(/^## /, "")}
                  </h2>
                );
              }
              if (para.startsWith("- ")) {
                const items = para
                  .split("\n")
                  .filter(l => l.startsWith("- "))
                  .map(l => l.replace(/^- /, ""));
                return (
                  <ul
                    key={i}
                    className="list-disc pl-6 mb-6 space-y-2 text-muted-foreground"
                  >
                    {items.map((it, j) => (
                      <li key={j}>{renderInline(it)}</li>
                    ))}
                  </ul>
                );
              }
              if (/^\d+\.\s/.test(para)) {
                const items = para
                  .split("\n")
                  .filter(l => /^\d+\.\s/.test(l))
                  .map(l => l.replace(/^\d+\.\s/, ""));
                return (
                  <ol
                    key={i}
                    className="list-decimal pl-6 mb-6 space-y-2 text-muted-foreground"
                  >
                    {items.map((it, j) => (
                      <li key={j}>{renderInline(it)}</li>
                    ))}
                  </ol>
                );
              }
              return (
                <p
                  key={i}
                  className="mb-6 text-muted-foreground leading-relaxed"
                >
                  {renderInline(para)}
                </p>
              );
            })}
          </div>

          {/* ─── CTA ─── */}
          <div className="mt-16 p-8 bg-card border border-border rounded-sm text-center">
            <h3 className="text-xl font-bold mb-3">Ready to stop losing calls?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Try Baylio free for 14 days. No credit card required.
            </p>
            <Button
              size="lg"
              className="rounded-sm"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* ─── More posts ─── */}
          {others.length > 0 && (
            <div className="mt-20">
              <h3 className="text-lg font-semibold mb-6">Keep reading</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {others.map(p => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="block p-5 border border-border rounded-sm hover:border-primary/30 transition-colors"
                  >
                    <Badge variant="secondary" className="mb-2 text-xs">
                      {p.category}
                    </Badge>
                    <p className="text-sm font-semibold leading-snug">
                      {p.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-semibold tracking-wider uppercase text-sm">
                Baylio
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Baylio. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/contact"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Contact
              </Link>
              <Link
                href="/faq"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                FAQ
              </Link>
              <Link
                href="/blog"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Blog
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-foreground font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
