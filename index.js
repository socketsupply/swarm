

var {isPeer, createId, toAddress, fromAddress} = require('./util')

function isNotHard (nat) {
  return 'hard' != nat
}

function toPeer(p) {
  var {id, address, port, nat} = p
  return {id, address, port, nat}
}

class PingPongPeers {
  
  constructor ({seeds, id, nat, port}) {
    this.seeds = seeds
    this.id = id
    this.nat = nat
    this.peers = {}
    this.pongs = {}
    this.sent = {}
    this.address = null
    this.port = port
  }
  init (send, timer) {
    this.send = (msg, addr, port) => {
      //console.log(msg, addr, port);
      send(msg, addr, port)
    }
    this.timer = timer

    this.seeds.forEach(s => {
      this.ping(toAddress(s), this.port)
    })

    return this
  }
  ping (addr, port) {
    this.sent[addr.address] = this.sent[addr.address] || {}
    this.sent[addr.address][port] = Date.now()
    this.send({type: 'ping', id: this.id}, addr, port)
  }
  on_ping (msg, addr, port) {
    //if we have received a ping from an address have not sent to,
    //we must have a static nat (publically addressable)
    //this would happen naturally, if a peer tells other peers about us and they ping
    if(!msg.id) throw new Error('ping requires id')
    if(!this.peers[msg.id]) { //TODO, double check that we have not sent anything to this peer yet
      if(!(this.sent[addr.address] && this.sent[addr.address][addr.port])) {
        //knowing that we are static depends on receiving a ping from an unknown peer
        //theirfore it depends on message order, which is unpredictable.
        //maybe we could make it so that peers wouldn't try to message _every_ peer
        //if we learn our nat has changed, we should tell everyone
        if(this.nat !== 'static') {
          this.nat = 'static'
          for(var k in this.peers) {
            this.send({type:'peers', peers: [{id: this.id, address:this.address, port, nat:this.nat}]}, this.peers[k], port)
          }
        }
      }
    }

    this.send({type: 'pong', id:this.id, addr, nat: this.nat}, addr, port)
  }
  on_pong (msg, addr, port) {

    this.pongs[msg.id] = msg.addr

    var peer = {id: msg.id, ...addr, nat: msg.nat || 'unknown', direct: true, recv: Date.now()}
    
    var port, matched = 0
    for(var k in this.pongs) {
      this.address = this.pongs[k].address
      if(!port) port = this.pongs[k].port
      else if(port != this.pongs[k].port && (this.pong[k].nat === 'easy' || this.pong[k].nat === 'static'))
        this.nat = nat = 'hard'
      else
        matched ++
    }

    if(matched > 1 && this.nat !== 'static')
      this.nat = 'easy'

    //if this peer is new to us, tell it about our other peers
    //also tell the other peers about it.
    //initialize peers list with our own address
    var _peers = [toPeer(this)]
    //announce this new peer to other peers

    this._update_peers([peer], peer, port)

    for(var id2 in this.peers) {
      var _peer = this.peers[id2]
      if(id2 != msg.id) {
        _peers.push(toPeer(_peer))
      }
    }
  
    //send peers list to this new peer
    if(_peers.length) {
      this.send({type:'peers', peers: _peers}, peer, port)
    }

  }

  _update_peers (updates, sender, port) {

    var changes = []
    for(var i = 0; i < updates.length; i++) {
      var peer = updates[i]
      if(!peer) throw new Error('missing peer')
      var _peer = this.peers[peer.id]
      if(!_peer) {
        this.peers[peer.id] = peer
        //do not add the new peer to changes
        //we need to ping it ourselves before we tell our peers about it
        if((peer.id !== this.id) && isNotHard(peer.nat)) {
          peer.send = Date.now()
          this.ping(peer, port)
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
      for(var k in this.peers) {
        if(sender && sender.id != k)
          this.send({peers: 'peers', peers: changes}, this.peers[k], port)
      }
    }


  }

  on_peers (msg, addr, port) {
    this._update_peers(msg.peers, addr, port)
  }
}

module.exports = function (port, seeds, id, nat = 'unknown') {
  if(!id) throw new Error('id must be provided')
  var ppp = new PingPongPeers({seeds, id, nat, port})
  return function (send, timer, node) {
    node.data = ppp//{id, peers, pongs, nat, sent}
    ppp.init(send, timer)
    //XXX also when resume after suspend, send some pings to check if our ip is the same
    //model this as a peer that changes it's ip address
    return (msg, addr, port) => {
      var fn
      if(fn = ppp['on_'+msg.type])
          fn.call(ppp, msg, addr, port)
    }
  }
}
