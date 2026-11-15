// Theme toggle: auto (follow OS) -> light -> dark -> auto. Choice saved in localStorage.
(function () {
  var root = document.documentElement;
  var order = ['auto', 'light', 'dark'];
  function get() { try { return localStorage.getItem('theme') || 'auto'; } catch (e) { return 'auto'; } }
  function apply(t) {
    if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
    var b = document.getElementById('theme-toggle');
    if (b) b.textContent = 'Theme: ' + t;
  }
  apply(get());
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('theme-toggle');
    if (!b) return;
    apply(get());
    b.addEventListener('click', function () {
      var next = order[(order.indexOf(get()) + 1) % order.length];
      try { localStorage.setItem('theme', next); } catch (e) {}
      apply(next);
    });
  });
})();
