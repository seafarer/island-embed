import { useEffect, useState } from 'react';
import {
  CATEGORIES,
  PER_PAGE,
  WP_API_BASE,
  type CategoryConfig,
} from '../config';

// --- Minimal shape of the WordPress REST API response we care about ---
interface WpPost {
  id: number;
  link: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string }>;
  };
}

// A category's posts after mapping, plus any per-category error.
interface CategoryResult {
  config: CategoryConfig;
  posts: Post[];
  error?: string;
}

interface Post {
  id: number;
  title: string;
  date: string;
  excerpt: string;
  link: string;
  thumbnail: string | null;
}

// Strip HTML tags from an excerpt and collapse whitespace. WordPress excerpts
// arrive as HTML (e.g. a wrapped <p> plus a "read more" link); for this
// prototype we render plain text.
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

function mapPost(raw: WpPost): Post {
  const media = raw._embedded?.['wp:featuredmedia']?.[0];
  return {
    id: raw.id,
    title: stripHtml(raw.title?.rendered ?? ''),
    date: raw.date,
    excerpt: stripHtml(raw.excerpt?.rendered ?? ''),
    link: raw.link,
    thumbnail: media?.source_url ?? null,
  };
}

// Resolve a category slug to its numeric ID via the REST API. If the config
// already provides an `id`, use it directly and skip the lookup.
async function resolveCategoryId(config: CategoryConfig): Promise<number> {
  if (typeof config.id === 'number') return config.id;
  if (!config.slug) {
    throw new Error('Category config needs a `slug` or an `id`.');
  }
  const res = await fetch(
    `${WP_API_BASE}/categories?slug=${encodeURIComponent(config.slug)}`,
  );
  if (!res.ok) {
    throw new Error(`Category lookup failed (HTTP ${res.status}).`);
  }
  const cats: Array<{ id: number }> = await res.json();
  if (!cats.length) {
    throw new Error(`No category found for slug "${config.slug}".`);
  }
  return cats[0].id;
}

// Fetch one category's recent posts (with embedded media), mapped to `Post`.
async function fetchCategory(config: CategoryConfig): Promise<CategoryResult> {
  try {
    const id = await resolveCategoryId(config);
    const res = await fetch(
      `${WP_API_BASE}/posts?categories=${id}&per_page=${PER_PAGE}&_embed`,
    );
    if (!res.ok) {
      throw new Error(`Posts request failed (HTTP ${res.status}).`);
    }
    const raw: WpPost[] = await res.json();
    return { config, posts: raw.map(mapPost) };
  } catch (err) {
    return {
      config,
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error.',
    };
  }
}

export default function CategoryPosts() {
  const [results, setResults] = useState<CategoryResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Runtime fetch: runs in the browser on mount, never at build time.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(CATEGORIES.map(fetchCategory))
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load posts.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="island-status">Loading recent posts…</p>;
  }

  if (error) {
    return (
      <p className="island-status island-status--error">
        Could not load posts: {error}
      </p>
    );
  }

  return (
    <div className="categories">
      {results?.map((result) => (
        <section className="category" key={result.config.label}>
          <h2 className="category__title">{result.config.label}</h2>

          {result.error ? (
            <p className="island-status island-status--error">
              {result.error}
            </p>
          ) : result.posts.length === 0 ? (
            <p className="island-status">No posts found.</p>
          ) : (
            <ul className="post-grid">
              {result.posts.map((post) => (
                <li className="post-card" key={post.id}>
                  <a className="post-card__link" href={post.link}>
                    {post.thumbnail ? (
                      <img
                        className="post-card__thumb"
                        src={post.thumbnail}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className="post-card__thumb post-card__thumb--empty" />
                    )}
                    <h3 className="post-card__title">{post.title}</h3>
                  </a>
                  {post.date && (
                    <time className="post-card__date" dateTime={post.date}>
                      {formatDate(post.date)}
                    </time>
                  )}
                  {post.excerpt && (
                    <p className="post-card__excerpt">{post.excerpt}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
