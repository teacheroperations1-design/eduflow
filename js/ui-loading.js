// js/ui-loading.js
(function() {
  "use strict";
  
  window.UILoading = {
    show: function(btn, text) {
      if (!btn) return;
      btn.disabled = true;
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${text || 'جاري...'}`;
    },
    
    hide: function(btn) {
      if (!btn || !btn.dataset.originalText) return;
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  };
})();