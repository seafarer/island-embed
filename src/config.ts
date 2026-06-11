// The three WordPress categories to display, in render order.
//
// Each entry may be configured by `slug` OR by numeric `id`. Slugs are
// resolved to IDs in the browser at runtime (see resolveCategoryId in the
// island), so you can wire this up without knowing the IDs ahead of time.
//
// EDIT THESE to match real categories on the target WordPress site
// (https://refugepoint.test). The slugs below are placeholders.
export interface CategoryConfig {
  /** Heading shown above the category's posts. */
  label: string;
  /** Category slug (resolved to an ID at runtime). Use this OR `id`. */
  slug?: string;
  /** Category ID (used directly, skips slug resolution). Use this OR `slug`. */
  id?: number;
}

export const CATEGORIES: CategoryConfig[] = [
  { label: 'News', slug: 'news' },
  { label: 'Stories', slug: 'stories' },
  { label: 'Updates', slug: 'updates' },
];

// Posts to fetch per category.
export const PER_PAGE = 4;

// Relative base so the same code works in dev (Vite proxy) and in production
// (same-origin once the built island is embedded in a WordPress page).
export const WP_API_BASE = '/wp-json/wp/v2';
