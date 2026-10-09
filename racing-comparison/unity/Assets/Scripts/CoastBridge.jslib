mergeInto(LibraryManager.library, {
  CoastReady: function() {
    window.dispatchEvent(new CustomEvent('coast-ready'));
  },
  CoastState: function(json) {
    window.dispatchEvent(new CustomEvent('coast-state', {detail: JSON.parse(UTF8ToString(json))}));
  }
});
