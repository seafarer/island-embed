<?php
/**
 * Plugin Name: WCR Islands
 * Description: Reference plugin for the Astro + React islands landing feed.
 *              Owns three concerns: the custom taxonomy/curation logic, the
 *              custom REST route the island fetches, and the built island
 *              assets + the shortcode that embeds them (Elementor-friendly).
 * Version:     0.1.0
 * Requires PHP: 7.4
 *
 * NOTE: This is a REFERENCE implementation meant to be copied into the real
 * WordPress plugin repo and adapted. It is not wired into this Astro repo's
 * build. See plugin/README.md.
 */

if (! defined('ABSPATH')) {
    exit; // No direct access.
}

// Absolute path / public URL of this plugin.
define('WCR_ISLANDS_DIR', plugin_dir_path(__FILE__));
define('WCR_ISLANDS_URL', plugin_dir_url(__FILE__));

// Where the Astro build output (`dist/`) is dropped. The `base` set in
// astro.config.mjs must resolve to this directory's public URL, i.e.
//   <site>/wp-content/plugins/wcr-islands/island/_astro/...
// so the asset URLs baked into the built markup are correct.
define('WCR_ISLANDS_DIST_DIR', WCR_ISLANDS_DIR . 'island/');

require_once WCR_ISLANDS_DIR . 'includes/class-feed-route.php';
require_once WCR_ISLANDS_DIR . 'includes/class-island-shortcode.php';

add_action('plugins_loaded', function () {
    (new WCR_Islands_Feed_Route())->register();
    (new WCR_Islands_Shortcode())->register();
});
