//test a swarm
//3 peers
//then peer connects with seeds
//all peers should connect to each other

var tape = require('tape')
var {Node,Network} = require('@socketsupply/netsim')
var {createId} = require('../util')
var createPeer = require('../')

var A = '1.1.1.1'
var B = '2.2.2.2'
var C = '3.3.3.3'
var D = '4.4.4.4'

var P = ":100"

function short (id) {
  return id.substring(0, 8)
}

function getNats (net) {
  var nats = {}

  for(var k in net.subnet) {
    for(var j in net.subnet[k].data.peers) {
      var nat = net.subnet[k].data.peers[j].nat
      nats[nat] = (nats[nat] || 0) + 1
    }
  }

  return nats
}

var peers = []

function addrFromInt(i) {
  return [1, 2, (i & 0xff00) >> 8, i & 0xff].join('.')
}
//generate a new peer, and give it some seeds of previously created peers gaurantees a connected network 
function newPeer (network, seed_count, salt='') {
  var addr = addrFromInt(peers.length) //[1, 2, (peers.length & 0xff00) >> 8, peers.length & 0xff].join('.')
  var id = createId(addr+salt)
  var seeds = []
  peers.push(addr+P)
  var n = 0
  function rand_int (m) {
    if(m == 0) throw new Error('cannot rand_int(0)')
    if(isNaN(m)) throw new Error('must not be called with NaN: rand_int(NaN)')
    if(n > id.length - 8) //shouldn't need this many...
      throw new Error('requested more than:'+id.length-8+' random ints from the same id')
    var r = id.substring(n, (n++)+8)
    var R = Number.parseInt(r, 16)
//    console.log('rand', r, m, R, R%m)
    return Number.parseInt(id.substring(n, (n++)+8), 16) % m
  }
  //randomly seed peers with the peers that were before them only.
  //first peer will have no seeds.
  //this gaurantees connected but acyclic network and no peers seeded with themselves
  //resembles peers joining.
  if(seed_count)
    for(var i = 0; i < Math.min(rand_int(seed_count)+1, peers.length) ; i++) {
      var R = rand_int(peers.length-1) //-1 so never include yourself as seed peer
      var p = peers[R]
      console.log('SEED', p, R, peers.length)
      seeds.push(p)
    }
  console.log(seeds)
  network.add(addr, new Node(createPeer(100, seeds, id)))
  return network
}

tape('generate', function (t) {
  var net = new Network()
  for(var i = 0; i < 10; i++)
    newPeer(net, i, 2)
  net.iterate(-1)
//  console.log(net)
  console.log(getNats(net))
  t.end()
})