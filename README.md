# Campus Lost & Found

A responsive, browser-only college lost-and-found portal. Open `index.html` in any modern browser—no installation, server, or internet connection is required.

## Features
- Report, edit, delete, filter, search, claim, and return items
- LocalStorage persistence, automatic IDs, duplicate checking, saved drafts, favorites, recently viewed items, and dark mode
- Dashboard statistics, CSS chart, pagination, data import/export, printable detail views, toasts, modals, and keyboard shortcuts
- Fully responsive blue-and-white interface built with HTML, CSS, and vanilla JavaScript only

## Folder structure
```
Campus-Lost-And-Found/
├── index.html
├── css/style.css
├── js/storage.js
├── js/ui.js
├── js/app.js
├── pages/
│   ├── lost.html
│   ├── found.html
│   ├── dashboard.html
│   ├── about.html
│   ├── contact.html
│   └── details.html
└── images/
```

## LocalStorage
Items, claims, favorites, settings, viewed-item history, and form drafts are saved under names beginning with `clf_`. Use Dashboard → Export before clearing browser data. The Import action accepts an exported JSON file.

## Future improvements
An authenticated backend could add ownership verification, image uploads, staff moderation, email notifications, and cross-device sharing.
