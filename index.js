var fs = require('fs')
var os = require('os')
var path = require('path')
var Step = require('step')

// Return an object created by removing all special properties from
// a rules object.
function result(rule) {
  var r = {}

  var reserved = ['filename', 'exists', 'grep', 'isFile', 'isDir', 'mode']

  Object.keys(rule).forEach(function(key) {
    if (reserved.indexOf(key) !== -1) return
    r[key] = rule[key]
  })

  return r
}

//
// Run the rules within baseDir
//
// *baseDir* directory within which to evaluate rules
// *rules* an object with a "rules" property which is a list of gumshoe predicates
// *cb* is a function with signature function(err, result)
function run(baseDir, rules, cb) {

  var done = false

  rules.forEach(function(rule, idx) {
    // is this the last rule?
    var last = (idx === rules.length - 1)
    if (done) return
    Step(
      function() {
        // Each rule must have a filename at this time
        if (!rule.filename && !done) {
          done = true
          return cb("Each rule must have a filename property! " + rule)
        }
        this.filename = path.join(baseDir, rule.filename)
        // stat for existance of file
        fs.stat(this.filename, this)
      },
      function(err, stat) {
        // Error means file doesn't exist - rule failed, proceed to next rule
        if (err && (rule.exists || rule.isFile || rule.isDir || rule.grep) && !done) {
          if (last && !done) return cb("no rules matched", null)
          return
        }

        // If file exists, but a file-related predicate is set to false, fail the rule
        if (!err && (rule.exists === false)) {
          if (last && !done) return cb("no rules matched", null)
          return
        }
        // If grep, we must read file & proceed to next step
        if (rule.grep) {
          fs.readFile(this.filename, 'utf8', this)
        } else {
          // Otherwise, if these remaining conditions are true, rule succeeds
          // and we return result of predicate
          if (rule.isDir === true && stat.isDirectory() && !done) {
            done = true
            return cb(null, result(rule))
          }
          if (rule.isFile === true && stat.isFile() && !done) {
            done = true
            return cb(null, result(rule))
          }
          if (rule.exists === true && !done) {
            done = true
            return cb(null, result(rule))
          }

          // Proceed to next rule, unless this is the last one
          if (last && !done) return cb("no rules matched", null)

          return
        }
      },
      function(err, data) {
        // Couldn't read file - rule failed
        if (err) {
          if (last && !done) return cb("no rules matched", null)
          return
        }

        // If the regular expression executes, rule has passed
        if (rule.grep.exec(data) !== null && !done) {
          done = true
          return cb(null, result(rule))
        }

        if (last && !done) return cb("no rules matched a", null)
      }
    )
  })


}

module.exports = {
  result:result,
  run:run,
}
