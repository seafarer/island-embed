// The island fetches a single custom WordPress REST route that returns the
// landing-page feed already grouped by category. The taxonomy / curation logic
// lives server-side in the WordPress plugin (see plugin/), so the browser does
// one request and just renders the result.
//
// Relative path so the same code works in dev (Vite proxy → refugepoint.test)
// and in production (same-origin once embedded in WordPress).
//
// Expected response shape (see plugin/includes/class-feed-route.php):
//   {
//     "groups": [
//       {
//         "key": "news",
//         "label": "News",
//         "posts": [
//           { "id": 1, "title": "...", "date": "2026-01-01T00:00:00",
//             "excerpt": "plain text", "link": "https://...",
//             "thumbnail": "https://..." | null }
//         ]
//       }
//     ]
//   }
export const WP_FEED_ENDPOINT = '/wp-json/wcr/v1/landing-feed';
