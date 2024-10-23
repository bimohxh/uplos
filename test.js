const ignore = require('ignore');

const  whiteList = ignore().add(['download.zip']);
console.log(!whiteList.ignores('products\\404-illustration\\download.zip'))