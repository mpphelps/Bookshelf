export function loader() {
  const body = [
    "User-agent: *",
    "Allow: /$",
    "Disallow: /auth/",
    "Disallow: /shelves/",
    "Disallow: /books/",
    "Disallow: /health",
    "",
    "Sitemap: https://readingbookshelf.com/sitemap.xml",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
