'use strict';

const WORKER_URL  = 'https://eldarisoft-ai.elias-martikainen99.workers.dev';
const MAX_CHARS   = 500;
const MAX_HISTORY = 10;

const USE_STREAM = true; // Streaming aina päällä

let conversationHistory = [];
let isWaiting           = false;
let firstMessage        = true;

const chatWindow    = document.getElementById('chatWindow');
const messageInput  = document.getElementById('messageInput');
const sendBtn       = document.getElementById('sendBtn');
const charCount     = document.getElementById('charCount');
const welcomeScreen = document.getElementById('welcome-screen');

/* ── Helpers ─────────────────────────────────────────────────── */
function nowTime() {
  return new Date().toLocaleTimeString('fi-FI', { hour:'2-digit', minute:'2-digit' });
}
function scrollToBottom() {
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}
function updateScrollBtn() {
  const scrollBtn = document.getElementById('scrollBtn');
  if (!scrollBtn) return;
  const atBottom = chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight < 80;
  scrollBtn.style.opacity = atBottom ? '0' : '1';
  scrollBtn.style.pointerEvents = atBottom ? 'none' : 'auto';
}
function removeTypingIndicator() {
  const el = chatWindow.querySelector('.typing-indicator');
  if (el) el.remove();
}
function hideWelcome() {
  if (welcomeScreen) welcomeScreen.classList.add('hidden');
  chatWindow.style.display = 'flex';
}

/* ── Simple markdown ─────────────────────────────────────────── */
function renderMarkdown(text) {
  text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>\n?)+/gs, m => '<ul>' + m + '</ul>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

/* ── Copy button helper ──────────────────────────────────────── */
function makeCopyBtn(getTextFn) {
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.title = 'Kopioi viesti';
  copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(getTextFn());
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      copyBtn.classList.remove('copied');
    }, 2000);
  });
  return copyBtn;
}

/* ── Message element ─────────────────────────────────────────── */
function createMessage({ role, content, extraClass = '', streaming = false }) {
  const isAi = role === 'assistant' || role === 'ai';

  const row = document.createElement('div');
  row.className = ('message ' + (isAi ? 'ai' : 'user') + ' ' + extraClass).trim();

  const avatar = document.createElement('div');
  avatar.className = 'avatar ' + (isAi ? 'ai-avatar' : 'user-avatar');
  if (isAi) {
    const mark = document.createElement('div');
    mark.className = 'logo-mark';
    mark.textContent = 'E:\\';
    avatar.appendChild(mark);
  } else {
    avatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';
  }

  const body = document.createElement('div');
  body.className = 'msg-body';
  const wrap = document.createElement('div');

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (isAi) {
    bubble.innerHTML = renderMarkdown(content);
  } else {
    bubble.textContent = content;
  }

  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const time = document.createElement('span');
  time.className = 'msg-time';
  time.textContent = nowTime();
  meta.appendChild(time);

  // For non-streaming AI messages, add copy button immediately
  if (isAi && !streaming) {
    let _text = content;
    meta.appendChild(makeCopyBtn(() => _text));
  }

  wrap.appendChild(bubble);
  wrap.appendChild(meta);
  body.appendChild(wrap);
  row.appendChild(avatar);
  row.appendChild(body);
  return row;
}

/* ── Typing indicator ────────────────────────────────────────── */
function showTypingIndicator() {
  removeTypingIndicator();
  const row  = document.createElement('div');
  row.className = 'typing-indicator';
  const av   = document.createElement('div');
  av.className = 'avatar ai-avatar';
  const mark = document.createElement('div');
  mark.className = 'logo-mark';
  mark.textContent = 'E:\\';
  av.appendChild(mark);
  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div');
    d.className = 'typing-dot';
    dots.appendChild(d);
  }
  row.appendChild(av); row.appendChild(dots);
  chatWindow.appendChild(row);
  scrollToBottom();
}

/* ── Error ───────────────────────────────────────────────────── */
function showError(text) {
  removeTypingIndicator();
  const wrap = document.createElement('div');
  wrap.className = 'error-bubble';
  const inner = document.createElement('div');
  inner.className = 'error-inner';
  inner.textContent = text;
  wrap.appendChild(inner);
  chatWindow.appendChild(wrap);
  scrollToBottom();
  setTimeout(() => wrap.remove(), 8000);
}
function getFriendlyError(msg = '') {
  if (msg.includes('429') || msg.includes('Liian monta'))
    return '⚠️ Lähetit viestejä liian nopeasti – odota hetki.';
  if (msg.includes('fetch') || msg.includes('502'))
    return '⚠️ Yhteys palvelimeen katkesi. Tarkista nettiyhteys.';
  return '⚠️ Jokin meni pieleen. Yritä hetken kuluttua uudelleen.';
}

/* ── Send ────────────────────────────────────────────────────── */
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isWaiting) return;
  if (text.length > MAX_CHARS) { showError('Viesti on liian pitkä (max 500 merkkiä).'); return; }

  if (firstMessage) { hideWelcome(); firstMessage = false; }

  messageInput.value = '';
  messageInput.style.height = 'auto';
  updateChar(0);

  chatWindow.appendChild(createMessage({ role: 'user', content: text }));
  scrollToBottom();

  isWaiting = true;
  sendBtn.disabled = true;
  showTypingIndicator();

  conversationHistory.push({ role: 'user', content: text });
  const histToSend = conversationHistory.slice(-(MAX_HISTORY + 1)).slice(0, -1);

  try {
    // ── Streaming ──────────────────────────────────────────────
    const res = await fetch(WORKER_URL + '/chat?stream=true', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ message: text, history: histToSend }),
    });
    if (!res.ok || !res.body) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'HTTP ' + res.status);
    }

    const msgRow = createMessage({ role: 'assistant', content: '', streaming: true });
    const bubble = msgRow.querySelector('.bubble');
    const meta   = msgRow.querySelector('.msg-meta');
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';
    let fullText  = '';
    let firstChunk = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const parsed = JSON.parse(raw);
          const chunk  = parsed.delta?.text ?? '';
          if (chunk) {
            if (firstChunk) {
              removeTypingIndicator();
              chatWindow.appendChild(msgRow);
              firstChunk = false;
            }
            fullText += chunk;
            bubble.textContent = fullText;
            scrollToBottom();
            await new Promise(r => setTimeout(r, 25));
          }
        } catch { /* ohita epäkelvot rivit */ }
      }
    }

    if (firstChunk) { removeTypingIndicator(); chatWindow.appendChild(msgRow); }
    bubble.innerHTML = renderMarkdown(fullText);
    meta.appendChild(makeCopyBtn(() => fullText));
    conversationHistory.push({ role: 'assistant', content: fullText });

  } catch {
    // ── Fallback: plain JSON ────────────────────────────────────
    try {
      const res = await fetch(WORKER_URL + '/chat', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ message: text, history: histToSend }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'HTTP ' + res.status);
      }
      const data       = await res.json();
      const reply      = data.reply ?? '';
      if (!reply) throw new Error('Tyhjä vastaus');
      const cleanReply = reply.replace(/\n{2,}/g, '\n').trim();
      removeTypingIndicator();
      chatWindow.appendChild(createMessage({ role: 'assistant', content: cleanReply }));
      conversationHistory.push({ role: 'assistant', content: cleanReply });
    } catch (err2) {
      conversationHistory.pop();
      removeTypingIndicator();
      showError(getFriendlyError(err2.message));
      console.error(err2);
    }
  } finally {
    if (conversationHistory.length > MAX_HISTORY * 2)
      conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2);
    scrollToBottom();
    isWaiting = false;
    sendBtn.disabled = messageInput.value.trim().length === 0;
    messageInput.focus();
  }
}

/* ── Chip shortcut ───────────────────────────────────────────── */
function sendChip(msg) {
  messageInput.value = msg;
  messageInput.dispatchEvent(new Event('input'));
  setTimeout(() => sendBtn.click(), 50);
}

/* ── Char counter & resize ───────────────────────────────────── */
function updateChar(len) {
  if (len === 0) { charCount.textContent = ''; charCount.className = 'char-count'; return; }
  charCount.textContent = len + '/' + MAX_CHARS;
  charCount.className = 'char-count' +
    (len >= MAX_CHARS ? ' at-limit' : len >= MAX_CHARS * .8 ? ' near-limit' : '');
}
function autoResize() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';
}

/* ── Events ──────────────────────────────────────────────────── */
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
messageInput.addEventListener('input', () => {
  updateChar(messageInput.value.length);
  autoResize();
  sendBtn.disabled = messageInput.value.trim().length === 0 || isWaiting;
});

/* ── Init ────────────────────────────────────────────────────── */
chatWindow.style.display = 'none';
chatWindow.addEventListener('scroll', updateScrollBtn);
document.getElementById('scrollBtn')?.addEventListener('click', scrollToBottom);
messageInput.focus();
