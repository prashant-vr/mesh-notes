// SSR Landing Page Template (Light mode only, zero JS framework, direct copy)

export const renderLandingPage = () => {
  return `
    <!-- Hero Section -->
    <section class="hero">
      <div class="container">
        <div class="hero-pill">
          <span>●</span> 100% Free & Open Source Personal Workspace
        </div>
        
        <h1 class="hero-title">
          The private space for your <span>notes, bookmarks, and daily life</span>.
        </h1>
        
        <p class="hero-desc">
          Capture thoughts, store code snippets, track daily habits, manage subscription expenses, and review flashcards. Everything saves to a single file on your computer. No paywalls, no tracking, and no subscriptions.
        </p>

        <div class="hero-cta-group">
          <a href="/app" class="btn btn-primary btn-lg">Open Mesh Notes Now →</a>
          <a href="/docs" class="btn btn-outline btn-lg">Read Documentation</a>
        </div>

        <div class="hero-metrics">
          <div class="metric-item">
            <strong>$0</strong> Free forever
          </div>
          <div class="metric-item">
            <strong>100%</strong> Offline capable
          </div>
          <div class="metric-item">
            <strong>Single</strong> SQLite database file
          </div>
          <div class="metric-item">
            <strong>0</strong> Tracking scripts
          </div>
        </div>
      </div>
    </section>

    <!-- Core Value Pillars -->
    <section id="features" class="features-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Why Mesh Notes</span>
          <h2 class="section-title">Built for speed, clarity, and peace of mind.</h2>
          <p class="section-desc">Traditional note apps trap your thinking behind paywalls or slow cloud logins. Mesh Notes gives you complete control.</p>
        </div>

        <div class="grid-3">
          <div class="card">
            <div class="card-icon">⚡</div>
            <h3 class="card-title">Zero-Lag Stream</h3>
            <p class="card-desc">Jot down quick thoughts in seconds. Filter effortlessly with tags, folders, or full-text search without waiting for network spin.</p>
          </div>

          <div class="card">
            <div class="card-icon">🔒</div>
            <h3 class="card-title">You Own Your Data</h3>
            <p class="card-desc">All your notes, finance logs, and bookmarks stay inside your local SQLite database file. No external company can lock you out.</p>
          </div>

          <div class="card">
            <div class="card-icon">🔗</div>
            <h3 class="card-title">Private Sharing</h3>
            <p class="card-desc">Share any note with a password or set it to self-destruct after one reading. Keep your confidential memos safe.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Productivity Apps Showcase -->
    <section id="apps" style="padding: 5rem 0;">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">All-In-One Toolkit</span>
          <h2 class="section-title">5 essential tools built right into your notes.</h2>
          <p class="section-desc">You don't need five separate apps to organize your work and life.</p>
        </div>

        <div class="grid-3">
          <div class="card">
            <div class="card-icon">💻</div>
            <h3 class="card-title">Code Snippet Vault</h3>
            <p class="card-desc">Save reusable scripts, regex snippets, and configs. Syntax highlighting for 20+ languages with one-click clipboard copying.</p>
          </div>

          <div class="card">
            <div class="card-icon">📅</div>
            <h3 class="card-title">Daily Habits & Journal</h3>
            <p class="card-desc">Automatic daily templates, mood scoring, and simple habit checkboxes to reflect on your day and build momentum.</p>
          </div>

          <div class="card">
            <div class="card-icon">💳</div>
            <h3 class="card-title">Finance & Subscriptions</h3>
            <p class="card-desc">Track domains, SaaS renewals, and expenses. Support for INR, USD, EUR, JPY, CNY, and RUB with linked login accounts.</p>
          </div>

          <div class="card">
            <div class="card-icon">🧠</div>
            <h3 class="card-title">Flashcard Learning</h3>
            <p class="card-desc">Memorize concepts faster with lightweight spaced repetition. Review cards when they are due and strengthen your memory.</p>
          </div>

          <div class="card">
            <div class="card-icon">📑</div>
            <h3 class="card-title">Bookmarks & Inbox</h3>
            <p class="card-desc">Save articles and research links with instant preview cards. Organize with tags and clean reading mode.</p>
          </div>

          <div class="card">
            <div class="card-icon">🛡️</div>
            <h3 class="card-title">Self-Hostable Anywhere</h3>
            <p class="card-desc">Runs on your laptop, Raspberry Pi, or small VPS with Node.js. Backups are as simple as copying a single .db file.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 100% Free Plan Section -->
    <section id="pricing" class="pricing-section" style="background-color: var(--bg-subtle); border-top: 1px solid var(--border-color);">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Honest Pricing</span>
          <h2 class="section-title">One simple plan. Free for everyone.</h2>
          <p class="section-desc">No tiers, no trial periods, and no credit card required. All features are fully unlocked.</p>
        </div>

        <div class="pricing-card">
          <div class="pricing-badge">Community Edition</div>
          <h3 style="font-size: 1.5rem; margin-top: 0.5rem;">Free Forever</h3>
          <div class="price-tag">$0</div>
          <div class="price-sub">Forever free • Open source</div>

          <ul class="pricing-features">
            <li><span class="check-icon">✓</span> Unlimited notes, tags, and folders</li>
            <li><span class="check-icon">✓</span> Full access to all 5 productivity apps</li>
            <li><span class="check-icon">✓</span> Multi-currency domain & expense tracking</li>
            <li><span class="check-icon">✓</span> Single-file local SQLite database</li>
            <li><span class="check-icon">✓</span> Password protected & one-time share links</li>
            <li><span class="check-icon">✓</span> No tracking, telemetry, or user selling</li>
            <li><span class="check-icon">✓</span> Complete self-hosting freedom</li>
          </ul>

          <a href="/app" class="btn btn-primary btn-lg" style="width: 100%;">Launch Mesh Notes</a>
        </div>
      </div>
    </section>

    <!-- Final CTA Banner -->
    <section class="container">
      <div class="cta-banner">
        <h2>Ready to clear your mental clutter?</h2>
        <p>Start organizing your thoughts and tasks in a fast, private environment designed for simplicity.</p>
        <div class="hero-cta-group" style="margin-bottom: 0;">
          <a href="/app" class="btn btn-primary btn-lg">Open Mesh Notes →</a>
          <a href="/docs/getting-started" class="btn btn-outline btn-lg">Read the Setup Guide</a>
        </div>
      </div>
    </section>
  `;
};
