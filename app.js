document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('url-form');
  const jsonInput = document.getElementById('json-input');
  const statusEl = document.getElementById('status');
  const cardsContainer = document.getElementById('cards');
  const fetchButton = document.getElementById('fetch-button');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = jsonInput.value.trim();
    if (!raw) return;

    // Clear previous state
    cardsContainer.innerHTML = '';
    fetchButton.disabled = true;
    setStatus('Loading...');
    try {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed = Object.fromEntries(parsed.map((v, i) => [String(i), v]));
      } else if (parsed === null || typeof parsed !== 'object') {
        parsed = { value: parsed };
      }

      Object.entries(parsed).forEach(([key, value]) => {
        // Create front with only the key
        const front = document.createElement('div');
        front.innerHTML = `<h3>${key}</h3>`;

        // Create back with appropriate rendering based on value type
        const back = document.createElement('div');
        back.appendChild(document.createElement('h3')).textContent = key;
        
        if (value === null || typeof value !== 'object') {
          // For primitive values, use a paragraph
          const p = document.createElement('p');
          p.textContent = String(value);
          back.appendChild(p);
        } else {
          // For objects/arrays, use pre-formatted text
          const pre = document.createElement('pre');
          pre.textContent = JSON.stringify(value, null, 2);
          back.appendChild(pre);
        }

        // Create the card and apply pro/con styling if applicable
        const card = createCard(front, back);
        
        // Add pro/con styling based on key name
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'pro' || lowerKey === 'pros') {
          card.classList.add('card-pro');
        } else if (lowerKey === 'con' || lowerKey === 'cons') {
          card.classList.add('card-con');
        }
      });

      setStatus('Loaded');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
      const errorNode = document.createElement('div');
      errorNode.innerHTML = `<h3>Error</h3><p>${err.message}</p>`;
      createCard(errorNode, errorNode.cloneNode(true));
    } finally {
      fetchButton.disabled = false;
    }
  });
  
  /* ===== helper functions ===== */
  
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
        //e.stopPropagation();
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
});