document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  const statusEl = document.getElementById('status');
  const cardsContainer = document.getElementById('cards');
  const fetchButton = document.getElementById('fetch-button');
  const jsonOut = document.getElementById('json-output');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let url = urlInput.value.trim();
    if (!url) return;
    
    // Normalize URL
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    
    // Clear previous cards and update UI
    cardsContainer.innerHTML = '';
    fetchButton.disabled = true;
    setStatus('Loading...');
    jsonOut.value = '';
    
    try {
      const response = await fetch('http://localhost:8000/analyze-financial-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: url,
          source_type: 'url'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
      }
      
      try {
        const data = await response.json();
        jsonOut.value = JSON.stringify(data, null, 2);
      } catch (jsonError) {
        const text = await response.text();
        jsonOut.value = text;
      }
      
      renderUserCards(url);
      setStatus('Loaded');
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      jsonOut.value = error.message;
      
      const errorNode = document.createElement('div');
      errorNode.innerHTML = `<h3>Error</h3><p>${error.message}</p>`;
      
      const errorBackNode = document.createElement('div');
      errorBackNode.innerHTML = `<h3>Error Details</h3><p>Failed to fetch content from ${url}</p><p>Please check the URL and try again.</p>`;
      
      createCard(errorNode, errorBackNode);
    } finally {
      fetchButton.disabled = false;
    }
  });
  
  function renderUserCards(currentUrl) {
    const stored = getStored(currentUrl);

    const ratingFront = document.createElement('div');
    ratingFront.innerHTML = `<h3>Rating</h3><p>${stored.rating ? `Your rating: ${stored.rating}/5` : 'No rating yet'}</p>`;
    const ratingBack = document.createElement('div');
    const stars = Array.from({ length: 5 }, (_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = '★';
      b.className = 'no-flip';
      b.dataset.value = i + 1;
      if (stored.rating && stored.rating >= i + 1) b.style.opacity = '1';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = Number(b.dataset.value);
        stored.rating = val;
        setStored(currentUrl, stored);
        ratingFront.querySelector('p').textContent = `Your rating: ${val}/5`;
        stars.forEach((s, idx) => { s.style.opacity = idx < val ? '1' : '0.3'; });
      });
      return b;
    });
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.className = 'no-flip';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stored.rating = null;
      setStored(currentUrl, stored);
      ratingFront.querySelector('p').textContent = 'No rating yet';
      stars.forEach(s => { s.style.opacity = '0.3'; });
    });
    ratingBack.appendChild(document.createElement('h3')).textContent = 'Rating';
    stars.forEach(s => ratingBack.appendChild(s));
    ratingBack.appendChild(clearBtn);
    createCard(ratingFront, ratingBack);

    const fbFront = document.createElement('div');
    fbFront.innerHTML = `<h3>User Feedback</h3><p>${stored.feedback ? truncate(stored.feedback, 60) : 'No feedback yet'}</p>`;
    const fbBack = document.createElement('div');
    fbBack.appendChild(document.createElement('h3')).textContent = 'User Feedback';
    const ta = document.createElement('textarea');
    ta.className = 'no-flip';
    ta.rows = 5;
    ta.style.width = '100%';
    ta.value = stored.feedback || '';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.className = 'no-flip';
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stored.feedback = ta.value.trim();
      setStored(currentUrl, stored);
      fbFront.querySelector('p').textContent = stored.feedback ? truncate(stored.feedback, 60) : 'No feedback yet';
    });
    fbBack.appendChild(ta);
    fbBack.appendChild(saveBtn);
    createCard(fbFront, fbBack);
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

    ['click', 'keydown'].forEach(evt => {
      cardBack.addEventListener(evt, (e) => {
        e.stopPropagation();
      });
    });
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

  function storageKey(u) {
    return 'uf:' + u;
  }

  function getStored(u) {
    try {
      const raw = localStorage.getItem(storageKey(u));
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { rating: null, feedback: '' };
  }

  function setStored(u, data) {
    try {
      localStorage.setItem(storageKey(u), JSON.stringify(data));
    } catch (_) {}
  }
});
