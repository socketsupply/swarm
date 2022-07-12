
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


## idea: extention pattern

in my p2p protocol so far, I have ping/pong and peers messages.
when new peers are discovered it pings them. when a pong is received it treansmits it's known peers to them.

the next step will be to track peers in a dht distance table, and filter out peers that don't fit in the table.

after that, I'll want a way to route messages through the dht.
so to make a direct p2p connection, we'll first forward a hello message through the dht.

maybe i'll want to create other app oriented extentions following this also

for example, pub/sub, epidemic broadcast trees.

or to index that some list of peers have a given resource.

## idea: base for p2p app

app model is a chat room. of course, a chat room demo is easy to change into a game, or a wiki, or other apps.

it's most important characteristic is that there is a mutable resource (the chatroom) and a group of peers
are either in the room or not.

(this is a big distinction to ssb where every peer has total authority over a single resource, and a network
is built up of overlapping replication sets)

my idea is to represent the app state as a reduce(state, update_msg) function. peers broadcast update messages
to all other peers, who then update the state. the max size of the state is capped (say, 5mb, but many app won't need that much).

When a peer first joins, or is away for a long time, they download the entire state.
(or detect that their cache is still valid) then they process any updates in real time,
after joining the pub/sub swarm. (it would also be necessary to rerequest recent messages, incase of dropped packets, but only within minutes)

leaning towards implementing this as an event-emitter? with methods (to send a message)
and event listeners to receive them.

## idea: use a shared private (sign) key as write access

then the pub (verify) key becomes read access.

admin can be another sign/verify pair be "admin" can be used to cycle the keys,
aka, to boot someone.

### subidea: each message applies to state hash h1 -> produces new state hash h2

If you have a known state hash, and then some messages, you can use the message transform hashes
to reconstruct the order the messages are applied (even if they branch)

If a packet is dropped we don't have that message, but we can rerequest it.
Or we just request the state hash object again, from a peer.

---

what happens if too many packets get dropped?
oh what if you request a message, and provide a known good hash,
then the peer sends you a stream of messages that branch back to that hash.
then it doesn't require a roundtrip per hash.

this would only be a problem if the doc updates faster than the network can handle.
there are some cases where it might be more important to have the latest messages than to be 100% sure about the state. (such as high frequency trading)

in other cases we could slow down messages to allow the network to cope. for example, by dropping messages from a particular peer if they are comming in too fast
