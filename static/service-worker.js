if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

self.addEventListener('fetch', function(event) {
event.respondWith(async function() {
   try{
     var res = await fetch(event.request);
     var cache = await caches.open('cache');
     cache.put(event.request.url, res.clone());
     return res;
   }
   catch(error){
     return caches.match(event.request);
    }
  }());
});
