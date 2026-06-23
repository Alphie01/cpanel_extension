/* Self-contained UI served by the extension container at /ui (public, no auth),
 * embedded by the host dashboard via a sandboxed iframe (manifest frontend.appUrl).
 *
 * It is a single static HTML page (inline CSS + vanilla JS, no build step). The
 * API base is configurable so the page can call the host gateway (which injects
 * x-ext-token) rather than the container directly:
 *   - ?api=<base> query param (preferred — host sets it on appUrl), or
 *   - the saved value in localStorage, or
 *   - same-origin /api/extensions/cpanel-whm-manager (default).
 *
 * SECURITY: this page is public, but the API endpoints it calls are NOT — they
 * require tenant context (x-ext-token in header mode). Only the gateway can mint
 * that token, so public direct calls to the API are rejected.
 *
 * NOTE: the embedded client JS intentionally avoids template literals so this
 * outer template literal has no interpolation/escaping hazards. */
export const HOSTING_UI_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Hosting Control Center</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: #0f1115; color: #e7e9ee; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 16px;
           padding: 16px 24px; border-bottom: 1px solid #232733; background: #141823; }
  header h1 { font-size: 16px; margin: 0; font-weight: 700; letter-spacing: .2px; }
  header .api { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #98a2b3; }
  header .api input { width: 320px; }
  main { padding: 24px; max-width: 1100px; margin: 0 auto; }
  nav { display: flex; gap: 8px; margin-bottom: 20px; }
  nav button.tab { background: transparent; border: 1px solid #2a2f3a; color: #c7ccd6; }
  nav button.tab.active { background: #2563eb; border-color: #2563eb; color: #fff; }
  .card { background: #161a23; border: 1px solid #232733; border-radius: 12px; padding: 18px; margin-bottom: 18px; }
  .card h2 { font-size: 14px; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #98a2b3; font-weight: 600; padding: 8px 10px; border-bottom: 1px solid #232733; }
  td { padding: 8px 10px; border-bottom: 1px solid #1c212c; vertical-align: middle; }
  input, select { background: #0f1320; border: 1px solid #2a2f3a; color: #e7e9ee; border-radius: 8px; padding: 7px 9px; font-size: 13px; }
  label { display: block; font-size: 12px; color: #98a2b3; margin: 0 0 4px; }
  .field { margin-bottom: 10px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; }
  .row .field { flex: 1; min-width: 150px; }
  button { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; }
  button.ghost { background: transparent; border: 1px solid #2a2f3a; color: #c7ccd6; }
  button.danger { background: #dc2626; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .b-active { background: #103a24; color: #4ade80; }
  .b-inactive { background: #20242e; color: #98a2b3; }
  .b-unreachable { background: #3a1414; color: #f87171; }
  .muted { color: #98a2b3; }
  .toast { position: fixed; bottom: 18px; right: 18px; max-width: 360px; padding: 12px 14px; border-radius: 10px;
           background: #161a23; border: 1px solid #2a2f3a; font-size: 13px; display: none; }
  .toast.err { border-color: #dc2626; color: #fca5a5; }
  .toast.ok { border-color: #2563eb; color: #93c5fd; }
  .hide { display: none; }
  .sub td { background: #11151d; }
</style>
</head>
<body>
<header>
  <h1>Hosting Control Center</h1>
  <div class="api">
    <span>API</span>
    <input id="apiBase" placeholder="/api/extensions/cpanel-whm-manager" />
    <button class="ghost" id="apiSave">Set</button>
  </div>
</header>
<main>
  <nav>
    <button class="tab active" data-tab="servers">Servers</button>
    <button class="tab" data-tab="accounts">Accounts</button>
  </nav>

  <section id="tab-servers">
    <div class="card">
      <h2>Add server</h2>
      <div class="row">
        <div class="field"><label>Name</label><input id="s-name" placeholder="Production WHM" /></div>
        <div class="field"><label>Hostname</label><input id="s-host" placeholder="whm.example.com" /></div>
        <div class="field"><label>Port</label><input id="s-port" type="number" value="2087" /></div>
        <div class="field"><label>SSL verify</label>
          <select id="s-ssl"><option value="true">Verify</option><option value="false">Skip (self-signed)</option></select>
        </div>
      </div>
      <button id="s-add">Add server</button>
    </div>
    <div class="card">
      <h2>Servers</h2>
      <table><thead><tr><th>Name</th><th>Host</th><th>Status</th><th>Tokens</th><th></th></tr></thead>
        <tbody id="serversBody"><tr><td colspan="5" class="muted">Loading…</td></tr></tbody>
      </table>
    </div>
  </section>

  <section id="tab-accounts" class="hide">
    <div class="card">
      <h2>Accounts</h2>
      <table><thead><tr><th>User</th><th>Domain</th><th>Plan</th><th>Disk</th><th>Status</th></tr></thead>
        <tbody id="accountsBody"><tr><td colspan="5" class="muted">Loading…</td></tr></tbody>
      </table>
    </div>
  </section>
</main>
<div class="toast" id="toast"></div>

<script>
(function () {
  var params = new URLSearchParams(location.search);
  var API = params.get('api') || localStorage.getItem('hostingApiBase') || '/api/extensions/cpanel-whm-manager';
  document.getElementById('apiBase').value = API;

  function toast(msg, kind) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast ' + (kind || 'ok'); t.style.display = 'block';
    setTimeout(function () { t.style.display = 'none'; }, 4000);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function api(path, opts) {
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data = txt ? JSON.parse(txt) : null;
        if (!res.ok) {
          var msg = (data && data.error && data.error.message) || ('HTTP ' + res.status);
          throw new Error(msg);
        }
        return data;
      });
    });
  }

  function statusBadge(s) {
    var cls = s === 'ACTIVE' ? 'b-active' : s === 'UNREACHABLE' ? 'b-unreachable' : 'b-inactive';
    return '<span class="badge ' + cls + '">' + esc(s) + '</span>';
  }

  // ----- Servers -----
  function loadServers() {
    api('/servers').then(function (page) {
      var rows = (page && page.items) || [];
      var body = document.getElementById('serversBody');
      if (!rows.length) { body.innerHTML = '<tr><td colspan="5" class="muted">No servers yet.</td></tr>'; return; }
      body.innerHTML = rows.map(function (s) {
        return '<tr data-id="' + esc(s.id) + '">' +
          '<td>' + esc(s.name) + '</td>' +
          '<td>' + esc(s.hostname) + ':' + esc(s.port) + '</td>' +
          '<td>' + statusBadge(s.status) + '</td>' +
          '<td>' + esc(s.tokenCount) + '</td>' +
          '<td>' +
            '<button class="ghost" data-act="tokens">Tokens</button> ' +
            '<button class="ghost" data-act="test">Test</button> ' +
            '<button class="ghost" data-act="sync">Sync</button> ' +
            '<button class="danger" data-act="del">Delete</button>' +
          '</td></tr>';
      }).join('');
    }).catch(function (e) {
      document.getElementById('serversBody').innerHTML =
        '<tr><td colspan="5" class="muted">' + esc(e.message) + '</td></tr>';
    });
  }

  function addServer() {
    var body = {
      name: document.getElementById('s-name').value.trim(),
      hostname: document.getElementById('s-host').value.trim(),
      port: Number(document.getElementById('s-port').value) || 2087,
      verifySsl: document.getElementById('s-ssl').value === 'true'
    };
    api('/servers', { method: 'POST', body: body }).then(function () {
      toast('Server added', 'ok');
      document.getElementById('s-name').value = '';
      document.getElementById('s-host').value = '';
      loadServers();
    }).catch(function (e) { toast(e.message, 'err'); });
  }

  function toggleTokens(tr, id) {
    var next = tr.nextSibling;
    if (next && next.className === 'sub') { next.parentNode.removeChild(next); return; }
    var sub = document.createElement('tr');
    sub.className = 'sub';
    sub.innerHTML = '<td colspan="5"><div class="muted">Loading tokens…</div></td>';
    tr.parentNode.insertBefore(sub, tr.nextSibling);
    api('/servers/' + id + '/tokens').then(function (tokens) {
      var list = (tokens || []).map(function (t) {
        return '<tr><td>' + esc(t.label) + '</td><td>' + esc(t.scope) + '</td><td>' +
          esc(t.cpanelUser || t.whmUser) + '</td><td>••••' + esc(t.lastFour || '') + '</td>' +
          '<td><button class="danger" data-tok="' + esc(t.id) + '">Delete</button></td></tr>';
      }).join('');
      sub.innerHTML = '<td colspan="5">' +
        '<table><thead><tr><th>Label</th><th>Scope</th><th>User</th><th>Token</th><th></th></tr></thead>' +
        '<tbody>' + (list || '<tr><td colspan="5" class="muted">No tokens.</td></tr>') + '</tbody></table>' +
        '<div class="row" style="margin-top:10px">' +
          '<div class="field"><label>Label</label><input class="t-label" placeholder="Root WHM" /></div>' +
          '<div class="field"><label>WHM user</label><input class="t-user" value="root" /></div>' +
          '<div class="field"><label>API token</label><input class="t-secret" type="password" /></div>' +
        '</div><button class="t-add">Add token</button></td>';
      sub.querySelector('.t-add').addEventListener('click', function () {
        var b = {
          label: sub.querySelector('.t-label').value.trim(),
          whmUser: sub.querySelector('.t-user').value.trim(),
          scope: 'WHM',
          token: sub.querySelector('.t-secret').value
        };
        api('/servers/' + id + '/tokens', { method: 'POST', body: b }).then(function () {
          toast('Token added', 'ok'); loadServers();
        }).catch(function (e) { toast(e.message, 'err'); });
      });
      Array.prototype.forEach.call(sub.querySelectorAll('[data-tok]'), function (btn) {
        btn.addEventListener('click', function () {
          api('/tokens/' + btn.getAttribute('data-tok'), { method: 'DELETE' })
            .then(function () { toast('Token deleted', 'ok'); loadServers(); })
            .catch(function (e) { toast(e.message, 'err'); });
        });
      });
    }).catch(function (e) { sub.innerHTML = '<td colspan="5" class="muted">' + esc(e.message) + '</td>'; });
  }

  document.getElementById('serversBody').addEventListener('click', function (ev) {
    var btn = ev.target;
    if (btn.tagName !== 'BUTTON' || !btn.getAttribute('data-act')) return;
    var tr = btn.closest('tr');
    var id = tr.getAttribute('data-id');
    var act = btn.getAttribute('data-act');
    if (act === 'tokens') { toggleTokens(tr, id); return; }
    if (act === 'test') {
      btn.disabled = true;
      api('/servers/' + id + '/test-connection', { method: 'POST' }).then(function (r) {
        toast(r.message, r.ok ? 'ok' : 'err'); loadServers();
      }).catch(function (e) { toast(e.message, 'err'); }).then(function () { btn.disabled = false; });
    }
    if (act === 'sync') {
      btn.disabled = true;
      api('/servers/' + id + '/sync', { method: 'POST' }).then(function (r) {
        toast('Synced ' + r.accounts + ' account(s)', 'ok');
      }).catch(function (e) { toast(e.message, 'err'); }).then(function () { btn.disabled = false; });
    }
    if (act === 'del') {
      if (!confirm('Delete this server and its tokens?')) return;
      api('/servers/' + id, { method: 'DELETE' })
        .then(function () { toast('Server deleted', 'ok'); loadServers(); })
        .catch(function (e) { toast(e.message, 'err'); });
    }
  });

  // ----- Accounts -----
  function loadAccounts() {
    api('/accounts').then(function (page) {
      var rows = (page && page.items) || [];
      var body = document.getElementById('accountsBody');
      if (!rows.length) { body.innerHTML = '<tr><td colspan="5" class="muted">No accounts. Sync a server first.</td></tr>'; return; }
      body.innerHTML = rows.map(function (a) {
        var disk = a.diskUsedMb == null ? '—' : (a.diskUsedMb + ' MB');
        var st = a.suspended ? '<span class="badge b-unreachable">Suspended</span>' : '<span class="badge b-active">Active</span>';
        return '<tr><td>' + esc(a.cpanelUser) + '</td><td>' + esc(a.domain || '—') + '</td><td>' +
          esc(a.plan || '—') + '</td><td>' + disk + '</td><td>' + st + '</td></tr>';
      }).join('');
    }).catch(function (e) {
      document.getElementById('accountsBody').innerHTML =
        '<tr><td colspan="5" class="muted">' + esc(e.message) + '</td></tr>';
    });
  }

  // ----- Nav + init -----
  Array.prototype.forEach.call(document.querySelectorAll('nav .tab'), function (tab) {
    tab.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('nav .tab'), function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var name = tab.getAttribute('data-tab');
      document.getElementById('tab-servers').classList.toggle('hide', name !== 'servers');
      document.getElementById('tab-accounts').classList.toggle('hide', name !== 'accounts');
      if (name === 'accounts') loadAccounts();
    });
  });
  document.getElementById('apiSave').addEventListener('click', function () {
    API = document.getElementById('apiBase').value.trim();
    localStorage.setItem('hostingApiBase', API);
    toast('API base set', 'ok'); loadServers();
  });
  document.getElementById('s-add').addEventListener('click', addServer);
  loadServers();
})();
</script>
</body>
</html>`;
