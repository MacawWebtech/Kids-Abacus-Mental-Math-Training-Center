# Plugins

The template loads Bootstrap, Bootstrap Icons and Chart.js from the jsDelivr CDN.

To self-host them (offline use or stricter security policies):

1. Download `bootstrap.bundle.min.js`, `bootstrap.min.css`, `bootstrap.rtl.min.css`, the `bootstrap-icons` font folder and `chart.umd.min.js` into this folder.
2. Update the `<link>` and `<script>` tags in each page `<head>` and footer. Keep the `data-ltr` / `data-rtl` attributes on `#bootstrap-css` so the RTL toggle keeps working.
3. If you keep the CDN, consider adding `integrity` (SRI) hashes from jsdelivr.com.
