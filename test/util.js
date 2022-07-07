var tape = require('tape')
var util = require('../util')

var A = '1.1.1.1'
var B = '2.2.2.2'
var C = '3.3.3.3'
var D = '4.4.4.4'

var P = ":100"

tape ('isPeer', (t) => {
  t.ok(util.isId(util.createId('a')), 'isId')
  t.notEqual(util.createId('a'), util.createId('b'))
  t.equal(util.createId('a'), util.createId('a'))
  t.ok(util.isPort(100), 'isPort')
  t.ok(util.isIp(A), 'isIp')
  t.ok(util.isPeer({id: util.createId('a'), port:100, address: A, nat: 'easy'}))
  t.end()  
})