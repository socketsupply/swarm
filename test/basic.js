
//test a swarm
//3 peers
//then peer connects with seeds
//all peers should connect to each other

var tape = require('tape')
var {Node,Network} = require('@socketsupply/netsim')
var createPeer = require('../')

var A = '1.1.1.1'
var B = '2.2.2.2'
var C = '3.3.3.3'
var D = '4.4.4.4'

var P = ":100"


tape('3 servers, 1 peer', function (t) {
  var net = new Network()
  net.add(A, new Node(createPeer(100, [])))
  net.add(B, new Node(createPeer(100, [])))
  net.add(C, new Node(createPeer(100, [])))

  net.add(D, new Node(createPeer(100, [A+P, B+P, C+P])))

  net.iterate(-1)

  console.log(net.subnet)

  console.log(net.subnet[D].data)

  for(var k in net.subnet)
    t.equal(net.subnet[k].data.nat, 'easy')

  t.end()
})