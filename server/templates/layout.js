// Base HTML layout shell for documentation (Light mode only, modern Linear-inspired styling)

export const renderHtmlLayout = ({
  title = 'Mesh Notes Documentation',
  description = 'Learn how to use Mesh Notes - private, open-source notes, bookmarks, daily habits, and expense tracking.',
  canonicalUrl = '',
  activeNav = 'docs',
  bodyContent = ''
}) => {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="theme-color" content="#ffffff" />
  
  <!-- Open Graph / Social Meta -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  
  <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
  <link rel="stylesheet" href="/css/site.css" />
</head>
<body>
  <!-- Global Top Header -->
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand" title="Mesh Notes Home">
        <div class="brand-icon">M</div>
        <span>Mesh Notes</span>
        <span class="badge-tag">Documentation</span>
      </a>

      <nav>
        <ul class="nav-menu">
          <li><a href="/#features" class="nav-link">Features</a></li>
          <li><a href="/#apps" class="nav-link">5 Apps</a></li>
          <li><a href="/#pricing" class="nav-link">Free Forever</a></li>
          <li><a href="/docs" class="nav-link active">Docs</a></li>
          <li><a href="https://github.com" target="_blank" rel="noreferrer" class="nav-link">GitHub ↗</a></li>
          <li><a href="/app" class="btn btn-primary" style="padding: 0.45rem 1rem;">Open App →</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <!-- Main Body Content -->
  <main>
    ${bodyContent}
  </main>

  <!-- Global Footer -->
  <footer class="site-footer">
    <div class="container footer-content">
      <div>
        <div style="font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">Mesh Notes</div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0;">
          Free and open-source. No paywalls. Your data stays on your machine.
        </p>
      </div>

      <ul class="footer-nav">
        <li><a href="/">Home</a></li>
        <li><a href="/docs">Documentation</a></li>
        <li><a href="/docs/05-self-hosting">Self-Hosting</a></li>
        <li><a href="/app">Launch App</a></li>
      </ul>
    </div>
  </footer>
</body>
</html>`;
};
