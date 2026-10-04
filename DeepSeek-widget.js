/* ============================================================
 * DeepSeek 聊天挂件（Google Material Design 风格）
 * 通过 window.DeepSeekWidgetConfig 配置：
 *   endpoint : 后端代理地址（生产环境推荐，Key 存服务端）
 *   apiKey   : DeepSeek API Key（仅本地测试，会暴露在浏览器）
 *   model    : 模型名，如 deepseek-chat / deepseek-reasoner
 *   title    : 挂件标题
 *   position : right | left
 *   welcome  : 欢迎语
 * ============================================================ */
(function () {
  var cfg = window.DeepSeekWidgetConfig || {};
  var endpoint = cfg.endpoint || '';
  var apiKey = cfg.apiKey || '';
  var model = cfg.model || 'deepseek-chat';
  var title = cfg.title || 'DeepSeek';
  var position = cfg.position === 'left' ? 'left' : 'right';
  var welcome = cfg.welcome || '你好！有什么可以帮你？';

  var history = []; // 会话上下文 [{role, content}]

  /* ---------- Google Material 风格样式 ---------- */
  var style = document.createElement('style');
  style.textContent = [
    /* 入口 FAB：白底圆形 + Material 阴影 + Gemini 四角星图标 */
    '.dsw-toggle{position:fixed;bottom:24px;' + position + ':24px;width:56px;height:56px;border-radius:50%;',
    'border:none;cursor:pointer;background:#fff;z-index:999;display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 1px 3px rgba(60,64,67,.3),0 4px 8px 3px rgba(60,64,67,.15);',
    'transition:box-shadow .15s,transform .15s;}',
    '.dsw-toggle:hover{transform:scale(1.06);',
    'box-shadow:0 1px 3px rgba(60,64,67,.3),0 8px 16px 4px rgba(60,64,67,.25);}',
    '.dsw-toggle:active{transform:scale(.96);}',
    '.dsw-toggle svg{width:30px;height:30px;}',

    /* 面板：Google 白色卡片 */
    '.dsw-panel{position:fixed;bottom:96px;' + position + ':24px;width:360px;max-width:calc(100vw - 32px);',
    'height:500px;max-height:calc(100vh - 130px);background:#fff;border-radius:24px;z-index:999;',
    'box-shadow:0 1px 3px rgba(60,64,67,.3),0 8px 24px 6px rgba(60,64,67,.18);',
    'display:none;flex-direction:column;overflow:hidden;',
    'font-family:"Google Sans",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;}',
    '.dsw-panel.open{display:flex;animation:dswPop .22s cubic-bezier(0.2,0,0,1);}',
    '@keyframes dswPop{from{opacity:0;transform:translateY(12px) scale(.97);}to{opacity:1;transform:none;}}',

    /* 头部 */
    '.dsw-header{display:flex;align-items:center;gap:12px;padding:16px 16px 14px;border-bottom:1px solid #dadce0;}',
    '.dsw-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4285F4,#9B72CB,#D96570);',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.dsw-avatar svg{width:20px;height:20px;}',
    '.dsw-title{color:#202124;font-size:16px;font-weight:500;letter-spacing:.2px;}',
    '.dsw-sub{color:#5f6368;font-size:12px;margin-top:2px;display:flex;align-items:center;gap:5px;}',
    '.dsw-online{width:7px;height:7px;border-radius:50%;background:#34a853;}',
    '.dsw-close{margin-left:auto;width:36px;height:36px;border-radius:50%;border:none;background:none;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;transition:background .15s;}',
    '.dsw-close:hover{background:#f1f3f4;}',
    '.dsw-close svg{width:20px;height:20px;fill:#5f6368;}',

    /* 消息区 */
    '.dsw-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#fff;}',
    '.dsw-messages::-webkit-scrollbar{width:6px;}',
    '.dsw-messages::-webkit-scrollbar-thumb{background:#dadce0;border-radius:3px;}',
    '.dsw-msg{max-width:80%;padding:10px 16px;font-size:14px;line-height:1.6;',
    'white-space:pre-wrap;word-break:break-word;}',
    '.dsw-msg.user{align-self:flex-end;background:#1a73e8;color:#fff;border-radius:18px 18px 4px 18px;}',
    '.dsw-msg.bot{align-self:flex-start;background:#f1f3f4;color:#202124;border-radius:18px 18px 18px 4px;}',
    '.dsw-msg.bot.error{background:#fce8e6;color:#d93025;}',

    /* 输入中动画 */
    '.dsw-typing{align-self:flex-start;background:#f1f3f4;border-radius:18px 18px 18px 4px;padding:14px 16px;',
    'display:flex;gap:5px;}',
    '.dsw-typing span{width:8px;height:8px;border-radius:50%;background:#9aa0a6;animation:dswBlink 1.2s infinite;}',
    '.dsw-typing span:nth-child(2){animation-delay:.2s;}',
    '.dsw-typing span:nth-child(3){animation-delay:.4s;}',
    '@keyframes dswBlink{0%,80%,100%{opacity:.25;}40%{opacity:1;}}',

    /* 输入区 */
    '.dsw-inputrow{display:flex;align-items:flex-end;gap:8px;padding:12px 14px;border-top:1px solid #e8eaed;}',
    '.dsw-input{flex:1;background:#f1f3f4;border:none;border-radius:22px 22px 22px 6px;padding:12px 16px;',
    'color:#202124;font-size:14px;outline:none;resize:none;font-family:inherit;line-height:1.4;',
    'transition:background .15s,box-shadow .15s;}',
    '.dsw-input::placeholder{color:#80868b;}',
    '.dsw-input:focus{background:#fff;box-shadow:0 0 0 1.5px #1a73e8;}',
    '.dsw-send{width:42px;height:42px;border:none;border-radius:50%;background:#1a73e8;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,transform .15s;}',
    '.dsw-send:hover{background:#1765cc;transform:scale(1.06);}',
    '.dsw-send:active{transform:scale(.94);}',
    '.dsw-send:disabled{background:#dadce0;cursor:not-allowed;transform:none;}',
    '.dsw-send svg{width:20px;height:20px;}'
  ].join('');
  document.head.appendChild(style);

  /* ---------- SVG 图标 ---------- */
  var sparkIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<defs><linearGradient id="dswGrad' + position + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#4285F4"/>' +
        '<stop offset="50%" stop-color="#9B72CB"/>' +
        '<stop offset="100%" stop-color="#D96570"/>' +
      '</linearGradient></defs>' +
      '<path fill="url(#dswGrad' + position + ')" d="M12 2c.9 4.6 4.4 8.1 9 9-4.6.9-8.1 4.4-9 9-.9-4.6-4.4-8.1-9-9 4.6-.9 8.1-4.4 9-9z"/>' +
    '</svg>';

  var closeIcon =
    '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  var sendIcon =
    '<svg viewBox="0 0 24 24"><path fill="#fff" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

  /* ---------- DOM ---------- */
  var toggle = document.createElement('button');
  toggle.className = 'dsw-toggle';
  toggle.title = title;
  toggle.setAttribute('aria-label', '打开 ' + title + ' 聊天');
  toggle.innerHTML = sparkIcon;

  var panel = document.createElement('div');
  panel.className = 'dsw-panel';
  panel.innerHTML =
    '<div class="dsw-header">' +
      '<div class="dsw-avatar">' + sparkIcon + '</div>' +
      '<div>' +
        '<div class="dsw-title"></div>' +
        '<div class="dsw-sub"><span class="dsw-online"></span>在线</div>' +
      '</div>' +
      '<button class="dsw-close" title="收起" aria-label="收起">' + closeIcon + '</button>' +
    '</div>' +
    '<div class="dsw-messages"></div>' +
    '<div class="dsw-inputrow">' +
      '<textarea class="dsw-input" rows="1" placeholder="发送消息…"></textarea>' +
      '<button class="dsw-send" title="发送" aria-label="发送">' + sendIcon + '</button>' +
    '</div>';

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  panel.querySelector('.dsw-title').textContent = title;
  var messagesEl = panel.querySelector('.dsw-messages');
  var inputEl = panel.querySelector('.dsw-input');
  var sendEl = panel.querySelector('.dsw-send');

  toggle.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) inputEl.focus();
  });
  panel.querySelector('.dsw-close').addEventListener('click', function () {
    panel.classList.remove('open');
  });

  /* ---------- 消息渲染 ---------- */
  function addMessage(text, role) {
    var div = document.createElement('div');
    div.className = 'dsw-msg ' + (role === 'user' ? 'user' : role === 'error' ? 'bot error' : 'bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    var t = document.createElement('div');
    t.className = 'dsw-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(t);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return t;
  }

  addMessage(welcome, 'bot');

  /* ---------- 调用 API ---------- */
  function callApi(messages, onDone) {
    if (endpoint) {
      // 生产环境：走后端代理
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model, messages: messages })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var reply = data && data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : (data && data.reply) || '（服务端返回格式异常）';
          onDone(null, reply);
        })
        .catch(function (e) { onDone(e); });
      return;
    }

    if (apiKey) {
      // 本地测试：浏览器直连 DeepSeek API
      fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({ model: model, messages: messages, stream: false })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (data) {
          var reply = data.choices[0].message.content;
          onDone(null, reply);
        })
        .catch(function (e) { onDone(e); });
      return;
    }

    // 未配置：演示模式
    setTimeout(function () {
      onDone(null, '（演示模式）尚未配置 apiKey 或 endpoint，无法连接 DeepSeek。\n\n' +
        '请在 index.html 的 DeepSeekWidgetConfig 中填写：\n' +
        '· 本地测试：apiKey\n' +
        '· 生产环境：endpoint（后端代理）');
    }, 600);
  }

  /* ---------- 发送 ---------- */
  var busy = false;

  function send() {
    var text = inputEl.value.trim();
    if (!text || busy) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';
    addMessage(text, 'user');
    history.push({ role: 'user', content: text });

    busy = true;
    sendEl.disabled = true;
    var typing = showTyping();

    callApi(history, function (err, reply) {
      typing.remove();
      busy = false;
      sendEl.disabled = false;
      inputEl.focus();

      if (err) {
        addMessage('请求失败：' + err.message, 'error');
        return;
      }
      addMessage(reply, 'bot');
      history.push({ role: 'assistant', content: reply });
    });
  }

  sendEl.addEventListener('click', send);

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  // 输入框自适应高度
  inputEl.addEventListener('input', function () {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });
})();
