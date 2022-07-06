
var N = 100, K = 4
var G = {}
for(var i = 0; i < N; i++) {
  G[Math.random()] = {}
}
var peers = Object.keys(G)
for(var k in G) {
  for(var i = 0; i < K; i++) {
    var j
    while((j = peers[~~(Math.random()*N)]) == k) ;

//    if(k == j) throw new Error('self')
    G[k][j] = G[j][k] = true
  }
}

//console.log(G)

function search(k, target, hops=0) {
  console.log('search', target, k+":{"+Object.keys(G[k]) + '}')
  if(hops > 5) return Infinity

  if(k === target) return 0
  if(G[k][target])
    return 1
  var closest
  for(var j in G[k])
    if(!closest || Math.abs(j - target) < Math.abs(closest - target))
      closest = j

//  if(Math.abs(k - target) < Math.abs(closest - target))
  //  throw new Error('not closer:'+closest)

  if(closest == k) throw new Error('self loop')

  console.log('closer:', (closest - target), k-target)
  return search(closest, target, hops+1) + 1
}

console.log(peers[0], G[peers[0]], peers[1])
console.log(search(peers[0], peers[1]))
