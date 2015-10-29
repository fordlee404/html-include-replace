var htmlReplace = require('../index.js');
var fs = require('fs');
var path = require('path');

describe('Test html replace', function(){
  it('with some options', function(){
    var options = {
      includesDir: 'spec/assets/srcHTML',
      globals: {
        ASSETS: ''
      }
    },
    destFile = fs.readFileSync('spec/assets/HTML/general/faq.html','utf-8'),
    src = path.resolve('spec/assets/srcHTML/general/faq.html');

    expect(htmlReplace(src, options)).toBe(destFile);
  });
});
