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

var replace = function(contents, localVars) {

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

var include = function(contents, workingDir) {

  var matches = includeRegExp.exec(contents);

  // Create a function that can be passed to String.replace as the second arg
  function createReplaceFn (replacement) {
    return function () {
      return replacement;
    };
  }

  function getIncludeContents (includePath, localVars) {
    var filePath = includePath,
      includeContents = '';

    includeContents += fs.readFileSync(filePath, options.encoding);
    includeContents += '\n';

    // Make replacements
    includeContents = replace(includeContents, localVars);

    // Process includes
    includeContents = include(includeContents, path.dirname(filePath));
    if (options.processIncludeContents && typeof options.processIncludeContents === 'function') {
      includeContents = options.processIncludeContents(includeContents, localVars, filePath);
    }

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
  var optionNames = Object.keys(config);
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
