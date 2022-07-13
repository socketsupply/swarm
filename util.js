var crypto = require('crypto')

function isIp (s) {
  return 'string' === typeof s && s.split('.').every(e => +e === +e && 0xff)
}

function createId(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex')
  //return crypto.randomBytes(32).toString('hex')
}

function isPort (p) {
  return p === p & 0xffff
}

function isId (id) {
  return /^[0-9a-fA-F]{64}$/.exec(id)
}

function isNat (nat) {
  return (nat === 'static' || nat === 'easy' || nat === 'hard' || nat === 'unknown')

}

function fromAddress (s) {
  return s.address + ':'+s.port  
}

function toAddress (s) {
  var [address, port] = s.split(':')
  return {address, port: +port}
}

//check that object 
function isPeer (p) {
  return (p.address && p.id && p.nat) && (
      isIp(p.address) && isPort(p.port) && isNat(p.nat) && isId(p.id)
    )
}

function nearest(ids, target, n) {
  var found = [], max = 256
  for(var i = 0; i < ids.length; i++)
    if(ids[i])
      for(var j = 0; j < ids[i].length; j++) {      
        if(ids[i][j] === target)
          return [target]
        var dist = getPrefixLength(target, ids[i][j])
        if(dist < max) {
  //          max = dist
          found.push(ids[i][j])
          found.sort((a, b) => getPrefixLength(target, b) - getPrefixLength(target, a))
          if(found.length > n)
            found.pop() 
        }
      }
  return found
}

function getPrefixLength (a,b) {
  var match = 0
  var i = 0
  while(i < a.length && a[i] === b[i]) {
      match += 4
      i++
  }
  var _a = Number.parseInt(a[i], 16)
  var _b = Number.parseInt(b[i], 16)
  //check if the first 3 bits match.
  //since we know the values are different,
  //then they can't all match so we only need
  //to check 3
  if((_a & 8) === (_b & 8)) {
    match ++
    if((_a & 4) === (_b & 4)) {
      match ++
      if((_a & 2) === (_b & 2)) {
        match ++
      }
    }
  }
  return match
}

function addPeer(table, id, peer_id, max = 3) {
  var dist = getPrefixLength(id, peer_id)
  var t = table[dist] = table[dist] || []
  if(t.length < max) {
    t.push(peer_id)
    return t
  }
  return false
}

function removePeer (tabel, id, peer_id) {
  var dist = getPrefixLength(id, peer_id)
  var t = table[dist] = table[dist] || []
  var i = t.indexOf(peer_id)
  if(~i) {
    t.splice(i, 1)
    return true
  }
  return false
}


module.exports = {isIp, createId, isPort, isId, isNat, fromAddress, toAddress, isPeer, getPrefixLength, nearest, addPeer, removePeer}