# Metropolitan Museum of Art Collection Search

A modern, fast, and beautiful search engine for the Metropolitan Museum of Art's public collection, built with Next.js, shadcn/ui, and the Met Museum Collection API.

## Project Description

This project allows users to search, browse, and view details for artworks in the Met's open-access collection. It features:
- Fast, progressive search with image filtering and pagination
- Clean, responsive UI using [shadcn/ui](https://ui.shadcn.com/) and Tailwind CSS
- Artwork detail modal with high-res images and metadata
- Sample search suggestions and a modern UX

## API
- Uses the [Metropolitan Museum of Art Collection API](https://metmuseum.github.io/#search)
  - API base: `https://collectionapi.metmuseum.org/public/collection/v1/search`
  - No API key required

## Local Development

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.