// Floating chat widget. Sends the running transcript to /api/chat each turn
// (the server is stateless) along with the visitor's current score for context.
(() => {
  const fab = document.getElementById('chatFab');
  const panel = document.getElementById('chatPanel');
  const log = document.getElementById('chatLog');
  const input = document.getElementById('chatInput');
  const send = document.getElementById('chatSend');
  const suggests = document.getElementById('chatSuggests');

  // Transcript sent to the API. Roles: 'user' | 'assistant'.
  const history = [];
  let busy = false;

  function greet() {
    if (log.children.length) return;
    addMessage('bot', "Hi, I'm Plum. Ask me anything about credit scores, rebuilding, or which product might fit you. No judgment here.");
  }

  function addMessage(role, text) {
    const node = document.createElement('div');
    node.className = `msg ${role === 'bot' ? 'bot' : 'user'}`;
    node.textContent = text;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function setTyping(on) {
    let t = log.querySelector('.msg.typing');
    if (on && !t) {
      t = document.createElement('div');
      t.className = 'msg bot typing';
      t.textContent = 'Plum is typing…';
      log.appendChild(t);
      log.scrollTop = log.scrollHeight;
    } else if (!on && t) {
      t.remove();
    }
  }

  async function sendMessage(text) {
    if (!text || busy) return;
    busy = true;
    input.value = '';
    suggests.style.display = 'none';

    addMessage('user', text);
    history.push({ role: 'user', content: text });
    setTyping(true);

    try {
      // window.__SCORE__ is set by app.js state; fall back to undefined.
      const score = window.state ? window.state.score : undefined;
      const { reply } = await API.chat(history, score);
      setTyping(false);
      addMessage('bot', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      setTyping(false);
      addMessage('bot', `Sorry — ${err.message}`);
      // Roll back the unanswered user turn so retry works cleanly.
      history.pop();
    } finally {
      busy = false;
      input.focus();
    }
  }

  function toggle(open) {
    panel.classList.toggle('open', open);
    if (open) { greet(); input.focus(); }
  }

  fab.addEventListener('click', () => toggle(!panel.classList.contains('open')));
  document.getElementById('chatClose').addEventListener('click', () => toggle(false));
  send.addEventListener('click', () => sendMessage(input.value.trim()));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(input.value.trim()); });
  suggests.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') sendMessage(e.target.textContent);
  });
})();
