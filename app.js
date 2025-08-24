document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  const statusEl = document.getElementById('status');
  const cardsContainer = document.getElementById('cards');
  const fetchButton = document.getElementById('fetch-button');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let url = urlInput.value.trim();
    if (!url) return;
    
    // Normalize URL
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    
    const proxyUrl = `https://r.jina.ai/${url}`;
    
    // Clear previous cards and update UI
    cardsContainer.innerHTML = '';
    fetchButton.disabled = true;
    setStatus('Loading...');
    
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      processContent(text);
      setStatus('Loaded');
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      const errorNode = document.createElement('div');
      errorNode.innerHTML = `<h3>Error</h3><p>${error.message}</p>`;
      
      const errorBackNode = document.createElement('div');
      errorBackNode.innerHTML = `<h3>Error Details</h3><p>Failed to fetch content from ${url}</p><p>Please check the URL and try again.</p>`;
      
      createCard(errorNode, errorBackNode);
    } finally {
      fetchButton.disabled = false;
    }
  });
  
  function processContent(text) {
    // Extract title
    let title = '';
    const titleMatch = text.match(/^# (.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      title = truncate(text, 80);
    }
    
    // Extract headings
    const headings = [];
    const headingRegex = /^(#{2,4}) (.+)$/gm;
    let match;
    while ((match = headingRegex.exec(text)) !== null && headings.length < 6) {
      const heading = match[2].trim();
      if (!headings.includes(heading)) {
        headings.push(heading);
      }
    }
    
    // Extract paragraphs for summary
    const paragraphs = text.split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length >= 80 && !p.startsWith('#'));
    
    const summary = paragraphs.slice(0, 2).join('\n\n');
    
    // Extract links
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = linkRegex.exec(text)) !== null) {
      const linkText = match[1].trim();
      const linkUrl = match[2].trim();
      
      if (linkUrl.startsWith('http')) {
        links.push({ text: linkText, url: linkUrl });
      }
    }
    
    const uniqueLinks = uniqueBy(links, link => link.url).slice(0, 6);
    
    // Create cards
    if (title) {
      const titleFront = document.createElement('div');
      titleFront.innerHTML = `<h3>Title</h3><p>${truncate(title, 60)}</p>`;
      
      const titleBack = document.createElement('div');
      titleBack.innerHTML = `<h3>Title</h3><p>${title}</p>`;
      
      createCard(titleFront, titleBack);
    }
    
    if (summary) {
      const summaryFront = document.createElement('div');
      summaryFront.innerHTML = `<h3>Summary</h3><p>${truncate(summary, 80)}</p>`;
      
      const summaryBack = document.createElement('div');
      summaryBack.innerHTML = `<h3>Summary</h3><p>${summary}</p>`;
      
      createCard(summaryFront, summaryBack);
    }
    
    if (headings.length > 0) {
      const headingsFront = document.createElement('div');
      headingsFront.innerHTML = `<h3>Headings</h3><p>${headings.length} heading${headings.length > 1 ? 's' : ''} found</p>`;
      
      const headingsBack = document.createElement('div');
      headingsBack.innerHTML = `<h3>Headings</h3><ul>${headings.map(h => `<li>${h}</li>`).join('')}</ul>`;
      
      createCard(headingsFront, headingsBack);
    }
    
    uniqueLinks.forEach(link => {
      const host = extractHostname(link.url);
      const linkFront = document.createElement('div');
      linkFront.innerHTML = `<h3>Link</h3><p>${truncate(link.text, 60)}</p><small>${host}</small>`;
      
      const linkBack = document.createElement('div');
      linkBack.innerHTML = `<h3>Link</h3><p><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.url}</a></p>`;
      
      createCard(linkFront, linkBack);
    });
  }
  
  function createCard(frontNode, backNode) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    
    const cardInner = document.createElement('div');
    cardInner.className = 'card-inner';
    
    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';
    cardFront.appendChild(frontNode);
    
    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';
    cardBack.appendChild(backNode);
    
    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    card.appendChild(cardInner);
    
    card.addEventListener('click', () => {
      card.classList.toggle('is-flipped');
    });
    
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('is-flipped');
      }
    });
    
    cardsContainer.appendChild(card);
    return card;
  }
  
  function setStatus(message) {
    statusEl.textContent = message;
  }
  
  function truncate(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
  
  function uniqueBy(arr, keyFn) {
    const seen = new Set();
    return arr.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  function extractHostname(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch (e) {
      return url;
    }
  }
});
