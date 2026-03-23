/**
 * Blog Listing Page
 * 
 * Displays all blog posts with category filtering,
 * featured posts hero, and SEO-optimized layout.
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, Clock, Calendar, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  blogPosts,
  getFeaturedPosts,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type BlogCategory,
  type BlogPost,
} from "../../../shared/blogData";

function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const categoryLabel = CATEGORY_LABELS[post.category];
  const categoryColor = CATEGORY_COLORS[post.category];

  if (featured) {
    return (
      <Link href={`/blog/${post.slug}`}>
        <article className="group relative overflow-hidden rounded-2xl border bg-card hover:shadow-lg transition-all duration-300">
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary" className={categoryColor}>
                {categoryLabel}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readTimeMinutes} min read
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-heading mb-3 group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6 max-w-2xl">
              {post.excerpt}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {post.author.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{post.author}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <span className="text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Read article <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="group flex flex-col h-full rounded-xl border bg-card hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className={`${categoryColor} text-xs`}>
              {categoryLabel}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readTimeMinutes} min
            </span>
          </div>
          <h3 className="text-lg font-bold font-heading mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-3">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-1.5 transition-all">
              Read <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const featuredPosts = useMemo(() => getFeaturedPosts(), []);

  const filteredPosts = useMemo(() => {
    let posts = blogPosts;
    if (selectedCategory !== "all") {
      posts = posts.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return posts;
  }, [selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    const cats = new Set(blogPosts.map((p) => p.category));
    return Array.from(cats);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header / Nav */}
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

      {/* Hero */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">
              The Baylio Blog
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Insights, guides, and industry analysis for auto repair shop owners 
              who want to grow their business with AI.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {selectedCategory === "all" && !searchQuery && featuredPosts.length > 0 && (
        <section className="pb-12">
          <div className="container">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
              Featured Articles
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {featuredPosts.slice(0, 2).map((post) => (
                <BlogCard key={post.slug} post={post} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="pb-8">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                All Posts
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Post Grid */}
      <section className="pb-20">
        <div className="container">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                No articles found. Try a different search or category.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-heading mb-3">
            Ready to stop missing calls?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Join hundreds of auto repair shops using Baylio to answer every call, 
            book more appointments, and grow revenue.
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
