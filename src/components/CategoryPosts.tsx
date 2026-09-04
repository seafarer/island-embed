import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WP_FEED_ENDPOINT } from '../config';
// Imported as a string (not a <link>) so we can inject it inside the shadow
// root. Vite's `?inline` returns the processed CSS as the default export.
import islandCss from '../styles/island.css?inline';

// --- Shape returned by the custom feed route (plugin/includes/class-feed-route.php) ---
interface Post {
  id: number;
  title: string;
  date: string;
  excerpt: string;
  link: string;
  thumbnail: string | null;
}

interface Group {
  key: string;
  label: string;
  posts: Post[];
}

interface FeedResponse {
  groups: Group[];
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

// The actual feed UI. Rendered INSIDE the shadow root (see CategoryPosts).
function Feed() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Runtime fetch: runs in the browser on mount, never at build time.
  // The custom route returns the three groups already assembled, so the client
  // does a single request and renders whatever it gets back.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(WP_FEED_ENDPOINT)
      .then((res) => {
        if (!res.ok) throw new Error(`Feed request failed (HTTP ${res.status}).`);
        return res.json() as Promise<FeedResponse>;
      })
      .then((data) => {
        if (!cancelled) setGroups(data.groups ?? []);
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
    <div className="island-embed">
      {groups?.map((group) => (
        <section className="category" key={group.key}>
          <h2 className="category__title">{group.label}</h2>

          {group.posts.length === 0 ? (
            <p className="island-status">No posts found.</p>
          ) : (
            <ul className="post-grid">
              {group.posts.map((post) => (
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

// Island entry. Attaches a shadow root to its host element and renders the feed
// (plus its CSS) inside it, so the host theme's stylesheet cannot cascade into
// our markup and ours cannot leak out. The fetch still happens at runtime.
export default function CategoryPosts() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    // Reuse an existing root if one is already attached (StrictMode re-runs).
    setShadow(el.shadowRoot ?? el.attachShadow({ mode: 'open' }));
  }, []);

  return (
    <div ref={hostRef}>
      {/* Light-DOM fallback shown until the shadow root attaches on hydrate. */}
      {!shadow && <p>Loading recent posts…</p>}
      {shadow &&
        createPortal(
          <>
            <style>{islandCss}</style>
            <Feed />
          </>,
          shadow,
        )}
    </div>
  );
}
