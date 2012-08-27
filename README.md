Gumshoe
=======

![Gumshoe picture](http://farm6.staticflickr.com/5201/5328211162_e57dae4d0b_z.jpg)

Project type detection library using declarative heuristic predicates. 

Say you have a Git repo on disk, and you want to figure out what kind of
language it is written in, what framework it uses, etc. With simple heuristics
such as looking for a `package.json` file in the project root, this can be
easily deduced.

Gumshoe makes it easy to specify these heuristics declaritively using predicates:

```javascript

// Detect a node.js project
var rules = [
    {filename:"package.json", exists:true, language:"node.js"}
]
```

More complicated example:

```javascript

// Detect a node.js project using connect, express or null frameworks
var rules = [
    {filename:"package.json", grep:/express/i, language:"node.js", framework:"express"},
    {filename:"package.json", grep:/connect/i, language:"node.js", framework:"connect"},
    {filename:"package.json", exists:true, language:"node.js", framework:null}
]

```


Installation
============

Gumshoe is available in NPM. `npm install gumshoe`


Example
=======
```javascript
  var gumshoe = require('gumshoe')

  // Use current working dir
  var baseDir = process.cwd()
  // Detect a node.js project
  var rules = [
      {filename:"package.json", exists:true, language:"node.js"}
  ]

  gumshoe.run(baseDir, rules, function(err, res) {
    if (err) {
        console.log("Detection error: %s", err)
        process.exit(1)
    }
    console.log("Detected language: %s", res.language)
  })
```

Tests
=====

Gumshoe comes with tests. To run, simply execute `npm test`.

License
=======

Gumshoe is released under a BSD license.

Credits
=======

Picture of Legoman gumshoe CC-BY David Anderson from http://www.flickr.com/photos/venndiagram/5328211162/
