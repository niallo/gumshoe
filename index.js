var async = require('async')
var fs = require('fs')
var glob = require('glob')
var os = require('os')
var path = require('path')
var Step = require('step')

// Return an object created by removing all special properties from
// a rules object.
function result(rule) {
  var r = {}

  var reserved = ['filename', 'exists', 'grep', 'jsonKeyExists']

  Object.keys(rule).forEach(function(key) {
    if (reserved.indexOf(key) !== -1) return
    r[key] = rule[key]
  })

  return r
}

// Search a JSON object for a key.
// Nested keys can be specified via a '.' in the string.
// E.g. "scripts.test" would test for json[scripts][test].
function jsonKeyExists(json, key) {
  var keys = key.split('.')
  var cur = json

  for (var i = 0; i < keys.length; i++) {
    try {
      cur = cur[keys[i]]
      if (cur === undefined) return false
    } catch(e) {
      return false
    }
  }

  return true
}

//
// Run the rules within baseDir
//
// *baseDir* directory within which to evaluate rules
// *rules* an object with a "rules" property which is a list of gumshoe predicates
// *cb* is a function with signature function(err, firstResult, sortedResults)
function run(baseDir, rules, cb) {

  var ruleFunctions = []

  rules.forEach(function(rule, idx) {
    var f = function(cb) {
      if (!rule.filename) return cb("Each rule must have a filename property: " + rule, {idx:idx, result:null})
      Step(
        function() {
          glob(rule.filename, {cwd:baseDir}, this)
        },
        function(err, matches) {
          this.matches = matches
          if (matches.length === 0) {
            err = "no files found"
          }
          // Error means file doesn't exist - rule failed, proceed to next rule
          if (err && (rule.exists || rule.grep)) {
            return cb(null, {idx: idx, result:null})
          }
          if (!err && (rule.exists === false)) {
            return cb("no rules matched", null)
          }
          if (rule.grep || rule.jsonKeyExists) {
            fs.readFile(path.join(baseDir, matches[0]), 'utf8', this)
          } else {
            // Otherwise, if these remaining conditions are true, rule succeeds
            // and we return result of predicate
            if (rule.exists === true) {
              return cb(null, {idx: idx, result:result(rule)})
            }

            // Fallthru
            return cb(null, {idx: idx, result:null})
          }
        },
        function(err, data) {
          // Couldn't read file - rule failed
          if (err) return cb(null, {idx:idx, result:null})

          var grepPassed = (rule.grep && rule.grep.exec(data) !== null)
          // If the regular expression executes, rule has passed
          if (grepPassed) {
            // If no further predicates, rule has passed
            if (rule.jsonKeyExists === undefined) {
              return cb(null, {idx:idx, result:result(rule)})
            }
          }
          // If there is a grep and it failed, rule fails
          if (rule.grep && !grepPassed) {
              return cb(null, {idx:idx, result:null})
          }
          
          // If the specified json key exists, rule has passed
          if (rule.jsonKeyExists) {
            try {
              var json = JSON.parse(data)
            } catch(e) {
              return cb(null, {idx:idx, result:null})
            }
            if (jsonKeyExists(json, rule.jsonKeyExists)) {
              return cb(null, {idx:idx, result:result(rule)})
            } else {
              return cb(null, {idx:idx, result:null})
            }

          }

          // Fallthru
          return cb(null, {idx: idx, result:null})
        }
      )
    }
    ruleFunctions.push(f)
  })

  async.parallel(ruleFunctions, function(err, results) {
    if (err) return cb(err, null)

    var sorted = results.sort(function(a, b) {
      return a.idx - b.idx
    })

    var allRules = []
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].result !== null) {
        allRules.push(sorted[i].result)
      }
    }
    for (var i=0; i < sorted.length; i++) {
      if (sorted[i].result !== null)
        // error, first matched rule, all rules
        return cb(null, sorted[i].result, allRules)
    }

    return cb("no rules matched", null)

  })


}

module.exports = {
  jsonKeyExists:jsonKeyExists,
  result:result,
  run:run,
}
