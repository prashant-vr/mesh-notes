import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { logAudit, logError, logInfo } from '../utils/logger.js';

export const extractUrlFromText = (text) => {
  if (!text || typeof text !== 'string') return null;
  // Match http/https URL
  const match = text.match(/(https?:\/\/[^\s<>"'{}|\\^`]+)/i);
  return match ? match[1] : null;
};

export const fetchUrlMetadata = async (rawUrl, userId = null) => {
  let urlObj;
  try {
    urlObj = new URL(rawUrl);
  } catch (err) {
    return null;
  }

  const domain = urlObj.hostname.replace(/^www\./, '');
  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

  const fallbackResult = {
    url: rawUrl,
    domain,
    title: domain,
    description: '',
    image_url: null,
    favicon: defaultFavicon,
    readable_html: null,
    readable_text: null,
    byline: null,
    reading_time_mins: 1
  };

  try {
    logInfo(`[Scraper] Fetching URL: ${rawUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MeshNotes/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logAudit(userId, 'scraper_fetch_http_error', { url: rawUrl, status: response.status }, 'warn');
      return fallbackResult;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return fallbackResult;
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url: rawUrl });
    const doc = dom.window.document;

    // OpenGraph & Meta extraction
    const getMeta = (names) => {
      for (const name of names) {
        const el = doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        if (el && el.getAttribute('content')) {
          return el.getAttribute('content').trim();
        }
      }
      return null;
    };

    const title = getMeta(['og:title', 'twitter:title']) || doc.title || domain;
    const description = getMeta(['og:description', 'twitter:description', 'description']) || '';
    let image_url = getMeta(['og:image', 'twitter:image', 'image']);
    if (image_url) {
      try {
        image_url = new URL(image_url, rawUrl).href;
      } catch (_) {
        image_url = null;
      }
    }

    // Favicon extraction
    let favicon = null;
    const iconEl = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    if (iconEl && iconEl.getAttribute('href')) {
      try {
        favicon = new URL(iconEl.getAttribute('href'), rawUrl).href;
      } catch (_) {
        favicon = defaultFavicon;
      }
    }
    if (!favicon) {
      favicon = defaultFavicon;
    }

    // Readability extraction
    let readable_html = null;
    let readable_text = null;
    let byline = null;
    let reading_time_mins = 1;

    try {
      const reader = new Readability(doc);
      const article = reader.parse();
      if (article) {
        readable_html = article.content || null;
        readable_text = article.textContent ? article.textContent.trim() : null;
        byline = article.byline || null;
        if (readable_text) {
          const wordCount = readable_text.split(/\s+/).length;
          reading_time_mins = Math.max(1, Math.ceil(wordCount / 200));
        }
      }
    } catch (readabilityErr) {
      logError(`[Scraper] Readability parsing failed for ${rawUrl}:`, readabilityErr.message);
    }

    logAudit(userId, 'scraper_success', { url: rawUrl, title: title.slice(0, 100) }, 'success');

    return {
      url: rawUrl,
      domain,
      title: title.slice(0, 500),
      description: description.slice(0, 1000),
      image_url,
      favicon,
      readable_html,
      readable_text,
      byline,
      reading_time_mins
    };
  } catch (err) {
    logError(`[Scraper] Exception fetching metadata for ${rawUrl}:`, err.message);
    logAudit(userId, 'scraper_fallback_used', { url: rawUrl, error: err.message }, 'warn');
    return fallbackResult;
  }
};
