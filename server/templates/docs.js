// SSR Documentation Page Template (Tri-pane layout: Sidebar, Reader Article, on-page TOC)

export const renderDocsPage = ({
  currentSlug,
  currentDoc,
  docHtml,
  toc = [],
  allDocs = []
}) => {
  const currentIndex = allDocs.findIndex(d => d.slug === currentSlug);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  return `
    <div class="docs-shell">
      <!-- 1. Left Chapter Navigation Sidebar -->
      <aside class="docs-sidebar">
        <div class="docs-group-title">Documentation</div>
        <ul class="docs-nav-tree">
          ${allDocs.map(doc => `
            <li>
              <a href="/docs/${doc.slug}" class="docs-nav-link ${doc.slug === currentSlug ? 'active' : ''}">
                <span>${doc.title}</span>
                ${doc.slug === currentSlug ? '<span style="font-size: 0.8rem; color: var(--text-title);">→</span>' : ''}
              </a>
            </li>
          `).join('')}
        </ul>

        <div class="docs-group-title" style="margin-top: 2.5rem;">Productivity Tools</div>
        <ul class="docs-nav-tree">
          <li><a href="/docs/productivity-apps#1-code-snippet-vault" class="docs-nav-link">Code Vault</a></li>
          <li><a href="/docs/productivity-apps#2-daily-journal-habit-tracker" class="docs-nav-link">Daily Journal</a></li>
          <li><a href="/docs/productivity-apps#3-finances-domains-subscriptions" class="docs-nav-link">Finances &amp; Domains</a></li>
          <li><a href="/docs/productivity-apps#4-flashcards-spaced-repetition" class="docs-nav-link">Flashcards (SRS)</a></li>
          <li><a href="/docs/productivity-apps#5-highlights-inbox" class="docs-nav-link">Highlights Inbox</a></li>
        </ul>

        <div style="margin-top: 3rem; padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-light); font-size: 0.82rem;">
          <div style="font-weight: 700; color: var(--text-title); margin-bottom: 0.25rem;">Free &amp; Open Source</div>
          <p style="color: var(--text-muted); margin-bottom: 0.5rem;">All features are completely unlocked for everyone.</p>
          <a href="/app" class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; width: 100%;">Launch Web App →</a>
        </div>
      </aside>

      <!-- 2. Main Reader Article -->
      <article class="docs-main-article">
        ${docHtml}

        <!-- Pagination Footer -->
        <div class="docs-pagination">
          <div>
            ${prevDoc ? `
              <div class="pagination-btn">
                <span class="pagination-label">← Previous Chapter</span>
                <a href="/docs/${prevDoc.slug}" class="pagination-title">${prevDoc.title}</a>
              </div>
            ` : ''}
          </div>

          <div style="text-align: right;">
            ${nextDoc ? `
              <div class="pagination-btn">
                <span class="pagination-label">Next Chapter →</span>
                <a href="/docs/${nextDoc.slug}" class="pagination-title">${nextDoc.title}</a>
              </div>
            ` : ''}
          </div>
        </div>
      </article>

      <!-- 3. Right On-Page Table of Contents (Sticky) -->
      <aside class="docs-toc-col">
        ${toc && toc.length > 0 ? `
          <div class="toc-title">On This Page</div>
          <ul class="toc-list">
            ${toc.map(item => `
              <li>
                <a href="#${item.id}" class="toc-link" style="padding-left: ${item.level === 3 ? '0.75rem' : '0'};">
                  ${item.title}
                </a>
              </li>
            `).join('')}
          </ul>
        ` : ''}

        <div style="margin-top: 2.5rem; border-top: 1px solid var(--border-light); padding-top: 1.5rem;">
          <a href="https://github.com" target="_blank" rel="noreferrer" class="toc-link" style="display: flex; align-items: center; gap: 0.4rem; color: var(--text-muted);">
            <span>GitHub Repository</span>
            <span>↗</span>
          </a>
          <a href="/app" class="toc-link" style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; color: var(--text-muted);">
            <span>Open App Workspace</span>
            <span>→</span>
          </a>
        </div>
      </aside>
    </div>
  `;
};
