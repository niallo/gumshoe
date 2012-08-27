var expect = require('chai').expect
var fs = require('fs')
var gumshoe = require('../index')
var os = require('os')

describe('gumshoe', function() {

  describe('#result', function() {
    it('should strip out reserved properties from rules', function() {
      var rule = {filename:"package.json", exists:true, grep:/connect/i, framework:"connect", language:"node.js"}

      var result = gumshoe.result(rule)

      expect(result).to.eql({framework:"connect", language:"node.js"})

    })
  })

  describe('#run', function() {

    var file = "_test.foobar"

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
        {filename:file, exists:true, grep:/express/i, mystery:"unsolved"}
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
  })

})
