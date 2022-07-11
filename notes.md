
## first step

//flooding gossip. every peer connects to every other peer.

### idea: simple gossip routing

idea: a static peer can seek for a particular node by routing through the network
send a message to a peer, and it's forwarded towards that peer
each peer sending it to the closest node it knows that is closer
than itself. Will this get stuck?
what about: a peer always connects to the closest N(==5) peers to it's id
and then the rest to random peers

I tested this idea, and it didn't work.
A peer that has a closer hash might not actually connect to to the target.

It would work if you distinguished between close but higher and lower,
and required peers to keep say 3 closest peers above and below their hash,
that would create a ring like model again, but passing a message would be O(N/2)

## notes: Kademlia

  - has an array of buckets
  - each bucket represents nodes in that differ to your key
    by that particular bit, but match preceding bits
    if peers always try to stay in communication with at least 1 peer in each bucket
    then we are good.
    hmm, probably try to have at least one static peer in each bucket if possible

## thought: comms patterns

### flood: forward a message if it's new to us

peer can request full dump

## peer broadcast


for peers: only advertise peers you trust.
i.e. you have received a packet from
so your peers know one hop away.
any peer can still find a distant peer
by asking, connecting, asking, etc

## idea: network size estimate

traverse network randomly and track how many peers you now in common with other peers you meet.
this is gonna be effected by the way that peers are introduced, but can create models and then compare measured results to the models.

