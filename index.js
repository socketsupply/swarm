

var {isPeer, createId, toAddress, fromAddress} = require('./util')
//idea: a static peer can seek for a particular node by routing through
//      send a message to a peer, and it's forwarded towards that peer
//      each peer sending it to the closest node it knows that is closer
//      than itself. Will this get stuck?
//      what about: a peer always connects to the closest N(==5) peers to it's id
//      and then the rest to random peers

// Kademlia
//  - has an array of buckets
//  - each bucket represents nodes in that differ to your key
//    by that particular bit, but match preceding bits
//    if peers always try to stay in communication with at least 1 peer in each bucket
//    then we are good.
//    hmm, probably try to have at least one static peer in each bucket if possible

// comms patterns

//   flood: forward a message if it's new to us
//          peer can request full dump

//   for peers: only advertise peers you trust.
//              i.e. you have received a packet from
//              so your peers know one hop away.
//              any peer can still find a distant peer
//              by asking, connecting, asking, etc

// idea: estimate network size by sampling. traverse network randomly and track how many peers you now in common with other peers you meet. this is gonna be effected by the way that peers are introduced, but can create models and then compare measured results to the models.


/*
ping seeds

save pongs
announce to pongs

broadcast pongs - peers that are new.
to a new pong, broadcast all known peers.

just rely on gossip flood ta handle dropped packets?
except randomly resend things if you don't know many peers

*/



module.exports = function (port, seeds, id) {
  if(!id) throw new Error('id must be provided')
  var peers = {}
  var pongs = {}
  var nat = 'unknown'
  var address = null
  return function (send, timer, node) {
    node.data = {id, peers, pongs, nat}
    seeds.forEach(s => {
      send({type: 'ping', id}, toAddress(s), port)
    })

    //every second, send the peers that we have received messages from
    //within the last 30 seconds
    /*
    timer(0, 1024, (ts) => {
      var id = rand_peer()
      var announce = {
        type:'announce',
        peers: Object.keys(peers).map(id => peers[id]).filter(p => p.recv + 30_000 > ts && p.id != id)

      }
      send(announce, peers[id], port) 
   })
    */
    //XXX also when resume after suspend, send some pings to check if our ip is the same

    //on an interval, transmit our peers to some random peer

    //pings seeds
    //announce self
    //periodically emit peers
    return (msg, addr, port) => {
      var s = fromAddress(addr)
      if('ping' === msg.type) {
        //if we have received a ping from an address have not sent to,
        //we must have a static nat (publically addressable)
        //this would happen naturally, if a peer tells other peers about us and they ping
        if(!msg.id) throw new Error('ping requires id')
        if(!peers[msg.id]) { //TODO, double check that we have not sent anything to this peer yet
          node.data.nat = nat = 'static'
        }

        send({type: 'pong', id, addr, nat: node.data.nat}, addr, port)
      }
      else if('pong' === msg.type) {
        var announce = false
        pongs[msg.id] = msg.addr

        if(!peers[msg.id]) {
          peers[msg.id] = {id: msg.id, addr:addr, nat: msg.nat || 'unknown', direct: true, recv: Date.now()}
          announce = true
        }
        else {
          var peer = peers[msg.id]
          if(msg.nat != peer.nat)
            peer.nat = msg.nat
        }
        var port, matched = 0
        for(var k in pongs) {
          address = pongs[k].address
          if(!port) port = pongs[k].port
          else if(port != pongs[k].port && (pong[k].nat === 'easy' || pong[k].nat === 'static'))
            node.data.nat = nat = 'hard'
          else
            matched ++
        }

        if(matched > 1 && node.data.nat !== 'static')
          node.data.nat = nat = 'easy'

        //if this peer is new to us, tell it about our other peers
        //also tell the other peers about it.
        if(announce) {
          //initialize peers list with our own address
          var _peers = [{id, address, port, nat: node.data.nat}]
          //announce this new peer to other peers
          for(var id2 in peers) {
            if(id2 != msg.id) {
              _peers.push({id: id2, ...peers[id2].addr, nat: peers[id2].nat})
              send({type:'peers', peers: [{id: msg.id, ...peers[msg.id].addr, nat: peers[msg.id].nat}]}, peers[id2].addr, port)
            }
          }
        
          //send peers list to this new peer
          if(_peers.length) {
            send({type:'peers', peers: _peers}, peers[msg.id].addr, port)
          }
        }
      }
      //announcements are verified to only be from direct peers.
      //so they are therefore trusted (by this peer)
      //save peers, but don't trust them until we know they are real
      else if('peers' === msg.type) {
    
        for(var i = 0; i < msg.peers.length; i++) {
          var peer = msg.peers[i] 
          if(isPeer(peer)) {
            if(!peers[peer.id]) {
              peers[peer.id] = peer
              //static peers can be directly pinged
              //or peers which we have received this message from
              //also send to easy nat peers because they might actually be static
              if((peer.id !== id) && (/^(static|easy|unknown)$/.exec(peer.nat)) /*peer.nat === 'static' || peer.nat === 'easy' /*|| peer.address == addr.address*/) {
                peer.send = Date.now()
                send({type: 'ping', id}, msg.peers[i], port)
              }
              //if it's a easy nat, we could ping it and route a ping request via the node that told us about it
            }
          }
        }
      }
    }
  }
}

/*
  start all peers connected to central node
  then every peer requests peers
  send 5 closest random peers and 5 random peers
*/