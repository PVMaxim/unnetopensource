(function() {
  var h = window.location.hostname;
  if (h.indexOf('.web.app') !== -1 || h.indexOf('.firebaseapp.com') !== -1) {
    try { window.stop(); } catch (e) {}
    document.documentElement.innerHTML = '<head><title>403 Forbidden</title></head><body style="background:#fff;color:#222;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><h1 style="font-weight:500;font-size:24px;">403 Forbidden</h1></body>';
  }
})();
