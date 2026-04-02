// Toast notification helper
function showToast(message, type) {
  type = type || 'success';
  var container = document.getElementById('toast-container');
  if (!container) return;

  var toast = document.createElement('div');
  var bgColors = { success: 'bg-accent-success', error: 'bg-accent-danger', warning: 'bg-accent-warning', info: 'bg-accent-info' };
  var bgColor = bgColors[type] || bgColors.info;

  toast.className = bgColor + ' text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full';
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(function() {
    requestAnimationFrame(function() { toast.classList.remove('translate-x-full'); });
  });

  setTimeout(function() {
    toast.classList.add('translate-x-full');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

// Read toast from data-attribute (set by server on redirect)
(function() {
  var el = document.querySelector('[data-toast-message]');
  if (el) {
    showToast(el.getAttribute('data-toast-message'));
    el.remove();
  }
})();

// Init Lucide icons (guard against missing lib)
try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) { console.warn('[lucide]', e); }

// Theme toggle
var _themeTimeout = 0;
function toggleTheme() {
  var doc = document.documentElement;
  clearTimeout(_themeTimeout);
  doc.classList.add('theme-transitioning');
  var next = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  doc.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch(e) { console.warn('[theme]', e); }
  _themeTimeout = setTimeout(function() { doc.classList.remove('theme-transitioning'); }, 300);
}

// Mobile menu toggle
function toggleMobileMenu() {
  var menu = document.getElementById('mobile-menu');
  var btn = document.getElementById('mobile-menu-btn');
  if (!menu || !btn) return;
  var isOpen = !menu.classList.contains('hidden');
  menu.classList.toggle('hidden');
  btn.setAttribute('aria-expanded', String(!isOpen));
  var iconOpen = btn.querySelector('.mobile-menu-icon-open');
  var iconClose = btn.querySelector('.mobile-menu-icon-close');
  if (iconOpen) iconOpen.classList.toggle('hidden');
  if (iconClose) iconClose.classList.toggle('hidden');
}

// Attach global listeners once (guard against HTMX full-page nav)
if (!window.__freaListenersAttached) {
  window.__freaListenersAttached = true;

  // HTMX: toast on success + error feedback
  document.body.addEventListener('htmx:afterRequest', function(event) {
    if (event.detail.successful) {
      var message = event.detail.xhr.getResponseHeader('X-Toast-Message');
      if (message) showToast(message);
    } else if (event.detail.xhr && event.detail.xhr.status >= 400) {
      showToast('Anfrage fehlgeschlagen (' + event.detail.xhr.status + ')', 'error');
    }
  });

  document.body.addEventListener('htmx:sendError', function() {
    showToast('Netzwerkfehler \u2014 Server nicht erreichbar', 'error');
  });

  // Lucide re-init after HTMX swap
  document.body.addEventListener('htmx:afterSwap', function(event) {
    try { if (typeof lucide !== 'undefined') lucide.createIcons({ root: event.detail.target }); } catch(e) { console.warn('[lucide]', e); }
  });

  // Confirm dialogs for delete actions
  document.body.addEventListener('htmx:confirm', function(event) {
    if (event.detail.question) {
      event.preventDefault();
      if (confirm(event.detail.question)) event.detail.issueRequest(true);
    }
  });

  // Close mobile menu on outside click
  document.addEventListener('click', function(e) {
    var mobileMenu = document.getElementById('mobile-menu');
    var mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenu && mobileBtn && !mobileMenu.contains(e.target) && !mobileBtn.contains(e.target) && !mobileMenu.classList.contains('hidden')) {
      toggleMobileMenu();
    }
  });

  // Toggle all time entry checkboxes for a project
  window.toggleAllEntries = function(selectAllCheckbox, projectId) {
    var checkboxes = document.querySelectorAll('input.entry-checkbox[data-project="' + projectId + '"]');
    checkboxes.forEach(function(cb) {
      cb.checked = selectAllCheckbox.checked;
    });
  };

  // Respect OS preference changes (only if no manual theme set)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    var hasManualTheme = false;
    try { hasManualTheme = !!localStorage.getItem('theme'); } catch(ex) { console.warn('[theme]', ex); }
    if (hasManualTheme) return;
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });
}
