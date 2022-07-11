

var {isPeer, createId, toAddress, fromAddress} = require('./util')

function isNotHard (nat) {
  return 'hard' != nat
}

function toPeer(p) {
  var {id, address, port, nat} = p
  return {id, address, port, nat}
}

module.exports = function (port, seeds, id, nat = 'unknown') {
  if(!id) throw new Error('id must be provided')
  var peers = {}
  var pongs = {}
  var sent = {}
  var address = null
  return function (send, timer, node) {
    node.data = {id, peers, pongs, nat, sent}
    seeds.forEach(s => {
      ping(toAddress(s), port)
    })

    //XXX also when resume after suspend, send some pings to check if our ip is the same
    //model this as a peer that changes it's ip address

    function ping (addr, port) {
      sent[addr.address] = sent[addr.address] || {}
      sent[addr.address][port] = Date.now()
      send({type: 'ping', id}, addr, port)
    }
  
    function update_peers (updates, sender) {
      var changes = []
      for(var i = 0; i < updates.length; i++) {
        var peer = updates[i]
        if(!peer) throw new Error('missing peer')
        var _peer = peers[peer.id]
        if(!_peer) {
          peers[peer.id] = peer
          changes.push(peer)
          if((peer.id !== id) && isNotHard(peer.nat)) {
            peer.send = Date.now()
            ping(peer, port)
          }
      
        }
        else {
          if(_peer.nat != peer.nat && peer.nat != 'unknown') {
            _peer.nat = peer.nat
            changes.push(toPeer(_peer))
          }
          else continue; //TODO handle peers that change ip (such as join another wifi)
        }
      }
      //emit changes to all peers, except the sender (if provided)
      if(changes.length) {
        for(var k in peers) {
          if(sender && sender.id != k)
            send({peers: 'peers', peers: changes}, peers[k], port)
        }
      }
    }

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
          if(!(sent[addr.address] && sent[addr.address][addr.port])) {
            //knowing that we are static depends on receiving a ping from an unknown peer
            //theirfore it depends on message order, which is unpredictable.
            //maybe we could make it so that peers wouldn't try to message _every_ peer
            //if we learn our nat has changed, we should tell everyone
            if(nat !== 'static') {
              node.data.nat = nat = 'static'
              for(var k in peers) {
                send({type:'peers', peers: [{id, address, port, nat}]}, peers[k], port)
              }
            }
          }
        }

        send({type: 'pong', id, addr, nat: node.data.nat}, addr, port)
      }
      else if('pong' === msg.type) {
        pongs[msg.id] = msg.addr

        var peer = {id: msg.id, ...addr, nat: msg.nat || 'unknown', direct: true, recv: Date.now()}
        
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
        //initialize peers list with our own address
        var _peers = [{id, address, port, nat: node.data.nat}]
        //announce this new peer to other peers

        update_peers([peer], peer, port)

        for(var id2 in peers) {
          var _peer = peers[id2]
          if(id2 != msg.id) {
            _peers.push(toPeer(_peer))
          }
        }
      
        //send peers list to this new peer
        if(_peers.length) {
          send({type:'peers', peers: _peers}, peer, port)
        }
      }
      //announcements are verified to only be from direct peers.
      //so they are therefore trusted (by this peer)
      //save peers, but don't trust them until we know they are real
      else if('peers' === msg.type) {
        update_peers(msg.peers, addr, port)
      }
    }
  }
}
