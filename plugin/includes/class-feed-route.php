<?php
/**
 * Registers the custom REST route the island fetches at runtime:
 *
 *   GET /wp-json/wcr/v1/landing-feed
 *
 * Returns the landing-page feed already grouped by category, so the browser
 * does a single request and the React island just renders the result. All
 * taxonomy / curation logic belongs here, server-side.
 *
 * Response shape (consumed by src/components/CategoryPosts.tsx):
 *   {
 *     "groups": [
 *       {
 *         "key": "news",
 *         "label": "News",
 *         "posts": [
 *           { "id": 1, "title": "...", "date": "2026-01-01T00:00:00",
 *             "excerpt": "plain text", "link": "https://...",
 *             "thumbnail": "https://..." | null }
 *         ]
 *       }
 *     ]
 *   }
 */

if (! defined('ABSPATH')) {
    exit;
}

class WCR_Islands_Feed_Route {

    const NAMESPACE = 'wcr/v1';
    const ROUTE     = '/landing-feed';

    /**
     * The three groups to render, in order.
     *
     * REPLACE this with the real taxonomy/curation source. For the reference
     * we just map a display label + a built-in `category` slug; the actual site
     * will likely resolve these from the custom taxonomy plugin instead.
     */
    private function groups_config(): array {
        return [
            ['key' => 'news',    'label' => 'News',    'category' => 'news'],
            ['key' => 'stories', 'label' => 'Stories', 'category' => 'stories'],
            ['key' => 'updates', 'label' => 'Updates', 'category' => 'updates'],
        ];
    }

    const PER_GROUP = 4;

    public function register(): void {
        add_action('rest_api_init', function () {
            register_rest_route(self::NAMESPACE, self::ROUTE, [
                'methods'             => 'GET',
                'callback'            => [$this, 'handle'],
                // Public read, same as the default posts endpoint.
                'permission_callback' => '__return_true',
            ]);
        });
    }

    public function handle(WP_REST_Request $request): WP_REST_Response {
        $groups = [];

        foreach ($this->groups_config() as $group) {
            $posts = get_posts([
                'post_type'        => 'post',
                'post_status'      => 'publish',
                'numberposts'      => self::PER_GROUP,
                'category_name'    => $group['category'], // swap for custom tax query
                'suppress_filters' => false,
            ]);

            $groups[] = [
                'key'   => $group['key'],
                'label' => $group['label'],
                'posts' => array_map([$this, 'map_post'], $posts),
            ];
        }

        // The feed is fetched fresh on every page load and must not be cached
        // by intermediaries, so editing a post shows up on refresh.
        $response = new WP_REST_Response(['groups' => $groups]);
        $response->header('Cache-Control', 'no-store, max-age=0');

        return $response;
    }

    /**
     * Map a WP_Post to the lean, render-ready shape the island expects.
     * Excerpt HTML is stripped to plain text here so the client stays dumb.
     */
    private function map_post(WP_Post $post): array {
        $thumbnail = get_the_post_thumbnail_url($post, 'medium_large');

        return [
            'id'        => $post->ID,
            'title'     => get_the_title($post),
            'date'      => get_post_time('c', false, $post), // ISO 8601
            'excerpt'   => wp_strip_all_tags(get_the_excerpt($post)),
            'link'      => get_permalink($post),
            'thumbnail' => $thumbnail ?: null,
        ];
    }
}
