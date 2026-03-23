/**
 * Blog Post Detail Page
 * 
 * Renders a single blog post with full content,
 * author info, related posts, and SEO metadata.
 */
import { useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Clock, Calendar, Tag, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  blogPosts,
  getPostBySlug,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "../../../shared/blogData";

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const post = useMemo(() => getPostBySlug(params.slug || ""), [params.slug]);

  // Update document title for SEO
  useEffect(() => {
    if (post) {
      document.title = post.metaTitle;
      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", post.metaDescription);
      }
    }
    return () => {
      document.title = "Baylio — AI Call Assistant for Auto Repair Shops";
    };
  }, [post]);

  // Related posts: same category, excluding current
  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return blogPosts
      .filter((p) => p.category === post.category && p.slug !== post.slug)
      .slice(0, 3);
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[post.category];
  const categoryColor = CATEGORY_COLORS[post.category];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <span className="text-xl font-bold font-heading text-primary">Baylio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/blog" className="text-foreground font-medium">
              Blog
            </Link>
            <Link href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>
          <Link href="/dashboard">
            <Button size="sm">Dashboard</Button>
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="container pt-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{post.title}</span>
        </nav>
      </div>

      {/* Article */}
      <article className="container max-w-3xl py-10">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge variant="secondary" className={categoryColor}>
            {categoryLabel}
          </Badge>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readTimeMinutes} min read
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading leading-tight mb-6">
          {post.title}
        </h1>

        {/* Excerpt */}
        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          {post.excerpt}
        </p>

        {/* Author */}
        <div className="flex items-center gap-4 mb-10">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {post.author.charAt(0)}
          </div>
          <div>
            <p className="font-medium">{post.author}</p>
            <p className="text-sm text-muted-foreground">{post.authorRole}</p>
          </div>
        </div>

        <Separator className="mb-10" />

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none
          prose-headings:font-heading prose-headings:font-bold
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:leading-relaxed prose-p:text-foreground/90
          prose-li:text-foreground/90
          prose-strong:text-foreground
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
          prose-table:border-collapse
          prose-th:bg-muted prose-th:p-3 prose-th:text-left prose-th:font-medium
          prose-td:p-3 prose-td:border-t
        ">
          {post.content.split("\n").map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return null;
            
            // Headers
            if (trimmed.startsWith("## ")) {
              return <h2 key={i}>{trimmed.slice(3)}</h2>;
            }
            if (trimmed.startsWith("### ")) {
              return <h3 key={i}>{trimmed.slice(4)}</h3>;
            }

            // List items
            if (trimmed.startsWith("- **") || trimmed.startsWith("1. **") || trimmed.startsWith("2. **") || trimmed.startsWith("3. **") || trimmed.startsWith("4. **") || trimmed.startsWith("5. **") || trimmed.startsWith("6. **")) {
              const isOrdered = /^\d+\./.test(trimmed);
              const text = trimmed.replace(/^[-\d]+\.?\s*/, "");
              // Parse bold markers
              const parts = text.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return <strong key={j}>{part.slice(2, -2)}</strong>;
                }
                return part;
              });
              return (
                <li key={i} className={isOrdered ? "list-decimal ml-6" : "list-disc ml-6"}>
                  {parts}
                </li>
              );
            }

            // Table rows (simple markdown table)
            if (trimmed.startsWith("|")) {
              // Skip separator rows
              if (trimmed.match(/^\|[\s-|]+\|$/)) return null;
              const cells = trimmed.split("|").filter(Boolean).map((c) => c.trim());
              const isHeader = i > 0 && post.content.split("\n")[i + 1]?.trim().match(/^\|[\s-|]+\|$/);
              if (isHeader) {
                return (
                  <tr key={i} className="bg-muted">
                    {cells.map((cell, j) => (
                      <th key={j} className="p-3 text-left font-medium text-sm">{cell}</th>
                    ))}
                  </tr>
                );
              }
              return (
                <tr key={i}>
                  {cells.map((cell, j) => {
                    const parts = cell.split(/(\*\*.*?\*\*)/g).map((part, k) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={k}>{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    });
                    return <td key={j} className="p-3 border-t text-sm">{parts}</td>;
                  })}
                </tr>
              );
            }

            // Regular paragraphs with bold parsing
            const parts = trimmed.split(/(\*\*.*?\*\*)/g).map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return part;
            });
            return <p key={i}>{parts}</p>;
          })}
        </div>

        {/* Tags */}
        <div className="mt-10 pt-6 border-t">
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Share */}
        <div className="mt-6 flex items-center gap-3">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Share this article:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
          >
            Copy Link
          </Button>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="border-t bg-muted/20 py-16">
          <div className="container">
            <h2 className="text-2xl font-bold font-heading mb-8">Related Articles</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`}>
                  <article className="group flex flex-col h-full rounded-xl border bg-card hover:shadow-md transition-all duration-300 overflow-hidden">
                    <div className="p-6 flex flex-col flex-1">
                      <Badge variant="secondary" className={`${CATEGORY_COLORS[p.category]} text-xs w-fit mb-3`}>
                        {CATEGORY_LABELS[p.category]}
                      </Badge>
                      <h3 className="text-lg font-bold font-heading mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {p.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                        {p.excerpt}
                      </p>
                      <span className="text-xs text-primary font-medium flex items-center gap-1 mt-4 group-hover:gap-1.5 transition-all">
                        Read article <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t py-16">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-heading mb-3">
            Stop missing calls. Start growing revenue.
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Baylio answers every call for your auto repair shop — 24/7, in under 2 seconds.
          </p>
          <Link href="/">
            <Button size="lg">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Baylio. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link href="/partners" className="text-primary hover:text-primary/80 transition-colors">Partners</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
