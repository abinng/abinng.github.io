var posts=["posts/37411.html","posts/56777.html","posts/16107.html","posts/8878.html"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };