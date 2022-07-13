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


function createTable (id) {
}

tape('prefix', function (t) {
  t.equal(util.getPrefixLength('abcf', 'abc0'), 12)
  t.equal(util.getPrefixLength('abf', 'ab0'), 8)
  t.equal(util.getPrefixLength('f', '0'), 0)
  t.equal(util.getPrefixLength('1', '0'), 3)
  t.equal(util.getPrefixLength('2', '0'), 2)
  t.equal(util.getPrefixLength('4', '0'), 1)
  t.equal(util.getPrefixLength('8', '0'), 0)

  var id = util.createId('me')
  var ids = []
  for(var i = 0; i < 100_000; i++) {
    var _id = util.createId(''+i)
    var j = util.getPrefixLength(id, _id)
    ids[j] = ids[j] || []
    if(ids[j].length < 3) {
      ids[j].push(_id)
      //console.log(j)
    }
  }



  console.log(ids)

  console.log(util.createId('foo'), util.nearest(ids, util.createId('foo'), 5))

  t.end()
})

tape('fake network', function (t) {
  var net = {}

  for(var i = 0; i < 1_000; i++) {
    var _id = util.createId(''+i)
    net[_id] = []
  }
  //build an ideal model of the network.
  //here we iterate over the whole network and add the closest to each bucket
  var peers = Object.keys(net)
  for(var id in net) {
    for(var _id in net) {
      if(id == _id) continue
      var ids = net[id]
      var j = util.getPrefixLength(id, _id)
      ids[j] = ids[j] || []
      if(ids[j].length < 1) {
        ids[j].push(_id)
      }
    }
  }

  //simulate routing between any two peers

  var source = util.createId(''+0)
  var target = util.createId(''+999)
  console.log({source, target})

  //return
  while(source !== target) {
    var _source = source
    source = util.nearest(net[source], target, 3)[0]
    console.log(_source.substring(0, 8)+'->', source.substring(0, 8))
  }

//  console.log(net)
  t.end()
})