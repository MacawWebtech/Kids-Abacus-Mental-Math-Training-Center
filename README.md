# BeadUp Academy — Kids Abacus & Mental Math Website Template

A multi-page Bootstrap 5 template for an abacus and mental math training center. It has 13 public pages (including 2 home layouts), a 9-page parent dashboard, dark/light mode, full RTL support and documentation.

**Brand concept:** "Level-up journey". Abacus beads, belt badges, progress paths and trophies, all made in CSS/SVG.

## Quick start

```bash
# from this folder
npx serve .            # or: python3 -m http.server 8080
```

Open `http://localhost:8080/pages/index.html`.

**Demo login:** on `pages/login.html`, enter any email and a password of 8+ characters.

Full guide: `documentation/index.html`.

## What's included

| Area | Pages |
|---|---|
| Public | Home 1 (classic), Home 2 (photo hero), Programs, Program Details (Level 3), Instructors, Competitions & Certifications, About, Contact (message + free-trial forms), Pricing, Parent Login, Register, 404, Coming Soon |
| Parent dashboard | Overview, My Children, Enroll (4-step wizard), Skill Progress (Chart.js), Upcoming Sessions (calendar + list), Payments (Stripe/PayPal placeholders, receipts), Certificates & Competitions, Messages, Profile & Settings |

## Features

- Bootstrap 5.3, mobile first, custom CSS on an 8px spacing scale
- Design tokens in CSS variables, with a separate dark palette (`dark-mode.css`)
- Dark/light toggle that follows the device until the visitor chooses (saved in localStorage)
- RTL toggle (Arabic/Hebrew) that swaps in Bootstrap RTL; logical CSS properties throughout
- WCAG 2.1 AA: skip link, focus rings, ARIA labels, labelled fields, 44px touch targets, reduced-motion support
- Friendly client-side validation, tooltips, password strength meter
- Skeleton loaders and empty states on dashboard widgets
- SEO: unique titles and descriptions, Open Graph, JSON-LD, sitemap.xml, robots.txt
- Integration placeholders for Formspree/Netlify, Mailchimp, Google Maps, booking calendar, Stripe/PayPal

## Folder structure

```
beadup-academy/
├── assets/css      style.css, dark-mode.css, rtl.css (+ .min)
├── assets/js       main.js, dashboard.js (+ .min), plugins/
├── assets/images   WebP images, logo, favicons, OG image
├── assets/fonts    optional self-hosted fonts
├── pages/          public pages
├── dashboard/      parent dashboard
├── documentation/  guide
├── sitemap.xml, robots.txt, package.json
└── README.md
```

## Customizing

1. Search the folder for `TODO` to find every customization point.
2. Colors and fonts: `assets/css/style.css`, section 01 (tokens).
3. Replace `https://www.example.com/` with your domain in the pages, `sitemap.xml` and `robots.txt`.
4. After editing CSS/JS sources, run `npm install && npm run build` to refresh the `.min` files.

## Credits

Bootstrap, Bootstrap Icons and Chart.js (MIT). Fredoka and Atkinson Hyperlegible (SIL OFL). Placeholder illustrations were made for this template.

## Changelog

- **1.1.0** (October 2026): added Home 2 (`pages/index-2.html`) and a Home dropdown in the main menu; logo, favicons and 404 art are now image files.
- **1.0.0** (October 2026): first release.
