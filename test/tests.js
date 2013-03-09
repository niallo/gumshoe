var expect = require('chai').expect
var fs = require('fs')
var gumshoe = require('../index')
var os = require('os')

describe('gumshoe', function() {

  describe('#jsonKeyExists', function() {
    it('should return true on top-level key presence', function() {
      expect(gumshoe.jsonKeyExists({foo:1}, "foo")).to.be.true
    })

    it('should return false on missing top-level key', function() {
      expect(gumshoe.jsonKeyExists({bar:1}, "foo")).to.be.false
    })

    it('should return true on 1-level-nested key', function() {
      expect(gumshoe.jsonKeyExists({foo:{bar:1}}, "foo.bar")).to.be.true
    })

    it('should return false on missing 1-level-nested key', function() {
      expect(gumshoe.jsonKeyExists({foo:{car:1}}, "foo.bar")).to.be.false
    })

    it('should return true on 2-level-nested key', function() {
      expect(gumshoe.jsonKeyExists({foo:{bar:{bof:1}}}, "foo.bar.bof")).to.be.true
    })

    it('should return false on missing 2-level-nested key', function() {
      expect(gumshoe.jsonKeyExists({foo:{bar:{cof:1}}}, "foo.bar.bof")).to.be.false
    })


  })

  describe('#result', function() {
    it('should strip out reserved properties from rules', function() {
      var rule = {filename:"package.json", exists:true, grep:/connect/i, framework:"connect", language:"node.js"}

      var result = gumshoe.result(rule)

      expect(result).to.eql({framework:"connect", language:"node.js"})

    })
  })

  describe('#run', function() {

    var file = "_test.foobar"
    var file2 = "_test2.foobar"
    var file3 = "_test3.go"

    after(function() {
      try {
        fs.unlinkSync(file)
      } catch(e) {}
    })

    before(function() {
      try {
        fs.unlinkSync(file)
      } catch(e) {}
    })

    it('should support exists predicate', function(done) {
      var rules = [
        {filename:file, exists:true, mystery:"solved"}
      ]

      // First time we run this, file doesn't exist, so should be false
      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.exist
        expect(res).to.be.null
        fs.writeFileSync(file, 'Express', 'utf8')
        gumshoe.run(process.cwd(), rules, function(err, res) {
          expect(err).to.be.null
          expect(res).to.eql({mystery:"solved"})

          done()
        })
      })
    })

    it('should correctly handle matching grep predicate', function(done) {
      var rules = [
        {filename:file, exists:true, grep:/express/i, mystery:"solved"}
      ]

      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.be.null
        expect(res).to.eql({mystery:"solved"})

        done()
      })
    })

    it('should correctly handle not-matching grep predicate', function(done) {
      var rules = [
        {filename:file, exists:true, grep:/express/, mystery:"solved"}
      ]

      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.exist
        expect(res).to.be.null
        done()
      })
    })

    it('should support multiple rules', function(done) {
      var rules = [
        {filename:file, exists:true, grep:/ZZ/, mystery:"unsolved"},
        {filename:file, exists:false, grep:/express/, mystery:"unsolved"},
        {filename:file, exists:true, grep:/express/, mystery:"unsolved"},
        {filename:file, exists:true, mystery:"solved"}
      ]

      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.be.null
        expect(res).to.eql({mystery:"solved"})
        done()
      })
    })

    it('should pick first matching rule', function(done) {
      var rules = [
        {filename:file, exists:true, mystery:"solved"},
        {filename:file, exists:true, grep:/express/i, mystery:"unsolved"},
      ]

      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.be.null
        expect(res).to.eql({mystery:"solved"})
        done()
      })
    })

    it('should process individual rules with implicit AND', function(done) {
      var rules = [
        {filename:file, exists:false, grep:/express/i, mystery:"unsolved"}
      ]

      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.exist
        expect(res).to.be.null

        done()
      })
    })

    it('should fail jsonKeyExists predicate when invalid JSON', function(done) {
      var rules = [
        {filename:file, jsonKeyExists:"foo", mystery:"solved"}
      ]

      fs.writeFileSync(file, '{', 'utf8')
      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.exist
        expect(res).to.be.null

        done()
      })
    })

    it('should pass jsonKeyExists predicate when 1-level-nested key present', function(done) {
      var rules = [
        {filename:file, jsonKeyExists:"foo", mystery:"solved"}
      ]

      fs.writeFileSync(file, '{"foo":"1"}', 'utf8')
      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.be.null
        expect(res).to.eql({mystery:"solved"})

        done()
      })
    })

    it('should pass jsonKeyExists predicate when 2-level-nested key present', function(done) {
      var rules = [
        {filename:file, jsonKeyExists:"foo.bar", mystery:"solved"}
      ]

      fs.writeFileSync(file, '{"foo":{"bar":1}}', 'utf8')
      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.be.null
        expect(res).to.eql({mystery:"solved"})

        done()
      })
    })

    it('should pass jsonKeyExists predicate when 2-level-nested key missing', function(done) {
      var rules = [
        {filename:file, jsonKeyExists:"foo.bar", mystery:"solved"}
      ]

      fs.writeFileSync(file, '{"foo":{"car":1}}', 'utf8')
      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.exist
        expect(res).to.be.null

        done()
      })
    })

    it('should support true jsonKeyExists with grep predicate AND', function(done) {
      var rules = [
        {filename:file, jsonKeyExists:"foo.bar", grep:/foo/, mystery:"solved"}
      ]

      fs.writeFileSync(file, '{"foo":{"bar":1}}', 'utf8')
      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.be.null
        expect(res).to.eql({mystery:"solved"})

        done()
      })
    })

    it('should support false jsonKeyExists with grep predicate AND', function(done) {
      var rules = [
        {filename:file, jsonKeyExists:"foo.bar", grep:/express/, mystery:"solved"}
      ]

      fs.writeFileSync(file, '{"foo":{"bar":1}}', 'utf8')
      gumshoe.run(process.cwd(), rules, function(err, res) {
        expect(err).to.exist
        expect(res).to.be.null

        done()
      })
    })

    it('should return list of matching rules as third argument', function(done) {
      var rules = [
        {filename:file, jsonKeyExists:"foo.bar", grep:/foo/, mystery:"solved"},
        {filename:file, jsonKeyExists:"foo.bar", grep:/foo/, mystery:"solved2"}
      ]

      fs.writeFileSync(file, '{"foo":{"bar":1}}', 'utf8')
      gumshoe.run(process.cwd(), rules, function(err, firstMatch, allMatches) {
        expect(err).to.be.null
        expect(firstMatch).to.eql({mystery:"solved"})
        expect(allMatches[0]).to.eql({mystery:"solved"})
        expect(allMatches[1]).to.eql({mystery:"solved2"})

        done()
      })
    })

    it('should support filename globs', function(done) {
      var rules = [
        {filename:"*.foobar", exists:true, mystery:"solved"},
        {filename:"*.go", exists:true, mystery:"solved2"},
      ]

      fs.writeFileSync(file, '{"foo":{"bar":1}}', 'utf8')
      fs.writeFileSync(file2, '{"foo":{"bar":1}}', 'utf8')
      fs.writeFileSync(file3, '{"foo":{"bar":1}}', 'utf8')
      gumshoe.run(process.cwd(), rules, function(err, firstMatch, allMatches) {
        expect(err).to.be.null
        expect(firstMatch).to.eql({mystery:"solved"})
        done()
      })
    })

    it('should support negative filename globs', function(done) {
      var rules = [
        {filename:"*.go", exists:false, mystery:"solved2"},
      ]

      fs.writeFileSync(file3, '{"foo":{"bar":1}}', 'utf8')
      gumshoe.run(process.cwd(), rules, function(err, firstMatch, allMatches) {
        expect(err).to.exist
        done()
      })
    })

  })

})
