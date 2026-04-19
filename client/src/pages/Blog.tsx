import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { BLOG_POSTS } from "@/lib/blogPosts";

export default function Blog() {
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

      {/* ─── Hero ─── */}
      <section className="container py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Resources for Shop Owners
          </h1>
          <p className="text-lg text-muted-foreground">
            Phone strategy, missed-call recovery, front-desk efficiency, and AI
            for auto repair shops.
          </p>
        </div>

        {/* ─── Posts ─── */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {BLOG_POSTS.map(post => (
            <Card
              key={post.slug}
              className="border bg-card hover:border-primary/30 transition-colors"
            >
              <CardContent className="pt-6">
                <Badge variant="secondary" className="mb-3 text-xs">
                  {post.category}
                </Badge>
                <h3 className="text-base font-semibold mb-2 leading-snug">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {post.readTime}
                  </span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                  >
                    Read More <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── CTA ─── */}
        <div className="max-w-2xl mx-auto text-center mt-20 p-8 bg-card border border-border rounded-sm">
          <h2 className="text-2xl font-bold mb-4">
            Stop losing calls. Start booking jobs.
          </h2>
          <p className="text-muted-foreground mb-6">
            See what an AI receptionist does for your shop. 14-day free trial,
            no credit card required.
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
      </section>

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
