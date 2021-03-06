
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

var ids = {}, id_count = 0

for (var i = 0; i < 1000; i++) {
  var id = createId('_'+i)
  if(!ids[id[0]]) {
    ids[id[0]] = id
    id_count ++
  }
  if(id_count == 16) break;
}

tape('3 servers, 1 peer', function (t) {
  var net = new Network()
  net.add(A, new Node(createPeer(100, [], ids.a)))
  net.add(B, new Node(createPeer(100, [], ids.b)))
  net.add(C, new Node(createPeer(100, [], ids.c)))

  net.add(D, new Node(createPeer(100, [A+P, B+P, C+P], ids.d)))

  net.iterate(-1)

//  console.log(net.subnet)

  console.log(net.subnet[D].data)

  var peer_ids = [net.subnet[D].data.id, ...Object.keys(net.subnet[D].data.peers)].sort()

  t.notOk(net.subnet[D].data.peers[net.subnet[D].data.id], 'self should not be in peers table')

  console.log(net.subnet[D].data.peers)

  function peersOf(peer) {
    return [peer.data.id, ...Object.keys(peer.data.peers)].sort()
  }

  for(var k in net.subnet) {
    console.log(k, net.subnet[k].data.id)
    var nat = net.subnet[k].data.nat
    t.ok(nat === 'easy' || nat === 'static', 'peers know their nat is easy or static')
    //every peer should have received pongs from every other peer
    t.deepEqual(peersOf(net.subnet[k]), peer_ids)
  }

  var nats = {}

  for(var k in net.subnet) {
    console.log(
      short(net.subnet[k].data.id),
      net.subnet[k].data.nat
    )
    for(var j in net.subnet[k].data.peers) {
      var nat = net.subnet[k].data.peers[j].nat
      nats[nat] = (nats[nat] || 0) + 1
      console.log(
        short(net.subnet[k].data.id), 
        short(j),
        net.subnet[k].data.peers[j].nat
      )
    }
  }
  console.log(nats)
  t.notOk(nats.unknown, 'should have decided what the nats are')

  for(var k in net.subnet) {
    console.log(k, short(net.subnet[k].data.id))
  }

  //the first 3 peers receive direct pings from D,
  //so they know they have static nats
  t.equal(net.subnet[A].data.nat, 'static')
  t.equal(net.subnet[B].data.nat, 'static')
  t.equal(net.subnet[C].data.nat, 'static')
  //4th peer (which initiates gossip) only receives replies
  //so they do not know for sure that they are static
  //but they received responses on the same port so they know they are easy at least.
  t.equal(net.subnet[D].data.nat, 'easy')

  //each peer should have sent 3 pings + 3 pongs + peer messages 1, 2, 3
  t.end()
})

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

tape('3 servers, two seeds, similar to NAT check app', function (t) {
  //this test sometimes fails, because peers discovering that they are static
  //is not eventually conistent, like peers discovering each other is.
  //(it depends on another peer you do not know sending you a message)
  for(var i = 0; i < 100; i++) {
    var net = new Network()
    net.add(A, new Node(createPeer(100, [], ids.a)))
    net.add(B, new Node(createPeer(100, [C+P], ids.b)))
    net.add(C, new Node(createPeer(100, [], ids.c)))

    net.add(D, new Node(createPeer(100, [A+P, B+P], ids.d)))

    net.iterate(-1)

    var nats = getNats(net)

    t.ok(nats.static >= 9)
    
    t.equal(nats.static + (nats.easy || 0), 12)
    if(nats.static === 12)
      break;
  }

  t.ok(nats.static >= 9)
  t.equal(nats.unknown, undefined)
  t.end()
})

