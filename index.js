var fs = require('fs');
var path = require('path');
var options = {
  prefix: '@@',
  suffix: '',
  globals: {},
  includesDir: '',
  docroot: '.',
  encoding: 'utf-8'
};

// Variables available in ALL files
var globalVars = options.globals;

// Names of our variables
var globalVarNames = Object.keys(globalVars);

// Cached variable regular expressions
var globalVarRegExps = {};

function replace(contents, localVars) {

  localVars = localVars || {};

  var varNames = Object.keys(localVars);
  var varRegExps = {};

  // Replace local vars
  varNames.forEach(function(varName) {

    varRegExps[varName] = varRegExps[varName] || new RegExp(options.prefix + varName + options.suffix, 'g');

    contents = contents.replace(varRegExps[varName], localVars[varName]);
  });

  // Replace global variables
  globalVarNames.forEach(function(globalVarName) {

    globalVarRegExps[globalVarName] = globalVarRegExps[globalVarName] || new RegExp(options.prefix + globalVarName + options.suffix, 'g');

    contents = contents.replace(globalVarRegExps[globalVarName], globalVars[globalVarName]);
  });

  return contents;
}

var includeRegExp = new RegExp(options.prefix + 'include\\(\\s*["\'](.*?)["\'](,\\s*({[\\s\\S]*?})){0,1}\\s*\\)' + options.suffix);

function include(contents, workingDir) {

  var matches = includeRegExp.exec(contents);

  // Create a function that can be passed to String.replace as the second arg
  function createReplaceFn (replacement) {
    return function () {
      return replacement;
    };
  }

  function getIncludeContents (includePath, localVars) {
    var files = includePath,
      includeContents = '';

    // If files is not an array of at least one element then bad
    if (!files.length) {
      console.warn('Include file(s) not found', includePath);
    }

    files.forEach(function (filePath, index) {
      includeContents += fs.readFileSync(filePath, options.encoding);
      // break a line for every file, except for the last one
      includeContents += index !== files.length-1 ? '\n' : '';

      // Make replacements
      includeContents = replace(includeContents, localVars);

      // Process includes
      includeContents = include(includeContents, path.dirname(filePath));
      if (options.processIncludeContents && typeof options.processIncludeContents === 'function') {
        includeContents = options.processIncludeContents(includeContents, localVars, filePath);
      }
    });

    return includeContents;
  }

  while (matches) {

    var match = matches[0];
    var includePath = matches[1];
    var localVars = matches[3] ? JSON.parse(matches[3]) : {};

    if (!path.isAbsolute(includePath)) {
      includePath = path.resolve(path.join((options.includesDir ? options.includesDir : workingDir), includePath));
    } else {
      if (options.includesDir) {
        console.error('includesDir works only with relative paths. Could not apply includesDir to ' + includePath);
      }
      includePath = path.resolve(includePath);
    }

    var docroot = path.relative(path.dirname(includePath), path.resolve(options.docroot)).replace(/\\/g, '/');

    // Set docroot as local var but don't overwrite if the user has specified
    if (localVars.docroot === undefined) {
      localVars.docroot = docroot ? docroot + '/' : '';
    }

    var includeContents = getIncludeContents(includePath, localVars);
    contents = contents.replace(match, createReplaceFn(includeContents));

    matches = includeRegExp.exec(contents);
  }

  return contents;
}

module.exports = function(src, config){
  // Warn if source files aren't found
  if(!fs.statSync(src).isFile()){
    return console.warn('Source file(s) not found', src);
  }

  // update options
  optionNames = Object.key(config);
  optionNames.forEach(function(name){
    options[name] = config[name];
  });
  globalVars = options.globals;
  globalVarNames = Object.keys(globalVars);

  // read file
  var contents = fs.readFileSync(src, options.encoding);

  var docroot = path.relative(path.dirname(src), path.resolve(options.docroot)).replace(/\\/g, '/');
  var localVars = {docroot: docroot ? docroot + '/' : ''};

  // Make replacements
  contents = replace(contents, localVars);

  // Process includes
  contents = include(contents, path.dirname(src));

  return contents;
}
