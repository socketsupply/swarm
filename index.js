

var {isPeer, createId, toAddress, fromAddress} = require('./util')

function assert(test, message) {
  if(!test) throw new Error(message)
}

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
    this.count = 0
  }
  init (send, timer) {
    this.send = (msg, addr, port) => {
      this.count ++
      send(msg, addr, port)
    }
    this.timer = timer

    this.seeds.forEach(s => {
      this.ping(toAddress(s), this.port)
    })

    return this
  }
  ping (addr, port, id) {
    this.sent[addr.address] = this.sent[addr.address] || {}
    this.sent[addr.address][port] = Date.now()
    assert(id !== this.id, 'must not ping self')
    if(id) {
      this.peers[id] = {id, ...addr, port, nat: addr.nat || 'unknown', pinged: true, pong: null}
    }
    this.send({type: 'ping', id: this.id}, addr, port)
  }
  on_ping (msg, addr, port) {
    //if we have received a ping from an address have not sent to,
    //we must have a static nat (publically addressable)
    //this would happen naturally, if a peer tells other peers about us and they ping
    assert(msg.id, 'ping msg missing id')
    assert(msg.id !== this.id, 'must not ping self')
    if(!this.peers[msg.id]) {
      //check that we really havn't sent anything to this peer (by ip:port)
      //that might open the firewall. If we never sent anything to them
      //it means we have an open (static) nat!
      //(such as: we are vps server, or ports opened manually)
      //(this could also be enabled with upnp
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

//    this.pongs[msg.id] = msg.addr
    assert(msg.id !== this.id, "should not ping self")
    if(!this.peers[msg.id]) //only happns if seed
      this.peers[msg.id] = {id:msg.id, address: addr.address, port: addr.port, nat: msg.nat, pinged: true, recv: Date.now()}

    this.peers[msg.id].pong
      = {ts: Date.now(), ...msg.addr}
    //var peer = {id: msg.id, ...addr, nat: msg.nat || 'unknown', direct: true, recv: Date.now()}
    var new_peer = this.peers[msg.id]
    
    var port, matched = 0
    for(var k in this.peers) {
      var peer = this.peers[k]
      if(peer.pong) {
        this.address = peer.pong.address
        if(!port) port = peer.pong.port
        else if(port != peer.pong.port && (peer.pong.nat === 'easy' || peer.pong.nat === 'static'))
          this.nat = 'hard'
        else
          matched ++
      }
    }
    console.log("NAT?", matched, this.nat)
    if(matched > 1 && this.nat !== 'static')
      this.nat = 'easy'

    //if this peer is new to us, tell it about our other peers
    //also tell the other peers about it.
    //initialize peers list with our own address
    var _peers = [toPeer(this)]
    //announce this new peer to other peers

    //XXX hang on, update the peer but don't ping it again
//    this._update_peers([peer], peer, port)

    //tell all peers about our new peer
    for(var id2 in this.peers) {
      var _peer = this.peers[id2]
      if(_peer.id !== new_peer.id && _peer.pong) {
        _peers.push(toPeer(_peer))
        this.send({type:'peers', peers: [toPeer(new_peer)]}, _peer, port)
      }
    }
  
    //tell this new peer about all other peers
    if(_peers.length) {
      this.send({type:'peers', peers: _peers}, new_peer, port)
    }

  }

  _update_peers (updates, sender, port) {

    var changes = []
    for(var i = 0; i < updates.length; i++) {
      var peer = updates[i]
      assert(peer, 'updated peer is defined')
      var _peer = this.peers[peer.id]
      if(!_peer) {
        this.peers[peer.id] = peer
        //do not add the new peer to changes
        //we need to ping it ourselves before we tell our peers about it
        if((peer.id !== this.id) && isNotHard(peer.nat)) {
          peer.send = Date.now()
          this.ping(peer, port, peer.id)
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
          //console.log('CH', changes)
          this.send({peers: 'peers', peers: changes}, this.peers[k], port)
      }
    }

  }

  on_peers (msg, addr, port) {
    //ping any new peers
    this._update_peers(msg.peers, addr, port)
  }
}

module.exports = function (port, seeds, id, nat = 'unknown') {
  assert(id, 'id must be provided')
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
