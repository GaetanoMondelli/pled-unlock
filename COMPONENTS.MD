The Queue accepts every incoming token whether it represents a sensor measurement, axw
manual log or an inferred value and holds them in first-in, first-out order. When a module
requests data, the Queue can either:
●
Pop a fixed count of tokens for example, remove the first N tokens in arrival order
●
Return all tokens older than a given timestamp.
●
Pop tokens matching an arbitrary condition for example, a metadata predicate
The queue should enforce a maximum batch size, limiting the number of tokens it can emit
in a single operation.
If only part of a token is consumed, the Queue subtracts the requested amount from the head token’s
value and re-inserts the remainder at the front.
Queue should be used between process nodes to reconcile or prepare inputs.
Internally, the Queue is a simple list of token objects or readings with value, type and
metadata fields, plus methods such as pop(n) and popSince(time) popWhen(condition).
DATA-SOURCES
Data Sources are a special kind of queue that ingest data from external systems (e.g.,
SmartMiner). They accept an Aggregate object structured as follows:
{
"timestamp": "2025-03-16T12:00:00Z"
,
"device
_
id": "Smartminer-001"
,
"aggregation
_
window": {
"start": "2025-03-16T11:00:00Z"
,
"end": "2025-03-16T12:00:00Z"
,
"num
_
readings": 120
},
"data": {
"aggr
_
type": "avg”| “measure”
,
"label": "energy_production
_
kWh"
,
"energy_production
_
kWh": 125.6,
"unit": "kWh"
},
“source
_
id”: “smartminer123”
“validation
_
type”: “ON
_
CHAIN
_
1|OFF
_
CHAIN
_
1|ON
_
CHAIN
_
2…
”
"merkle
_
root": "a94f7d6c8e3b1a2d4f5e"
,
"url": "https://da.network/data/a94f7"
,
“meta
_
data”:{}
}
Each Aggregate includes metadata about the measurement window, the type and unit of
data, the number of readings, and a URL pointing to the raw data. A merkle
_
root is used to
verify the integrity of the raw measures.
To ensure data authenticity, each aggregate is optionally wrapped into a SignedAggregate
{
“aggregate”: object<Aggregate>
,
“signature: sign123
“validation
_
status”: “ON
_
CHAIN
_
SUCCEED” | “OFF
_
CHAIN
_
SUCCEED” | “ON
_
CHAIN
_
FAIL|
NO
_
SIGN”
}
Sources can be manual or automated. The source
_
id (in the aggregate) maps to a registry
storing verified metadata and public keys. The system uses this registry to validate
signatures, either on-chain (via smart contracts) or off-chain, before accepting the data as
verified.
—
Other queues hold tokens before they reach process nodes. They wait until either a set time
has passed or enough tokens have arrived. For example, a process node may start only
when each of its input queues has at least one token.
Inputs: Any token object (value, type, metadata) written by other modules or readings
Outputs: A slice of tokens based on count or time-window requests
Behaviour: FIFO buffering; supports partial consumption and re-queuing of remainders
Implementation details: Underlying array of token objects; methods pop(n), peek(n),
popSince(time), front() and popWhen(condition)
PROCESS NODE:
A Process Node acts like a transition in a Petri net. It accepts tokens from named queues
and may listen for an external event (for example, a delivery receipt or a burn command).
When its trigger fires, the node:
1. Atomically pulls the required tokens from its source queue(s),
2. Applies transformation formulas—such as multiplying by a credit factor or
matching and splitting on receipt amounts,
3. Emits its results into destination queues.
Each Process Node is implemented as a small state machine that locks its source queue
during consumption to prevent race conditions and uses a math-expression library to
evaluate formulas at runtime.
Inputs: Token streams from one or more queues, plus optional event triggers
Outputs: One or more token streams, each routed to a specified destination queue
Behaviour: On trigger: consume tokens, compute formulas, emit results atomically
Implementation details: State-machine per node; queue locking during consume/re-queue;
dynamic formula evaluation
VARIABLE NODE:
A Variable Node holds a single value that can be referenced by Process Nodes during
formula evaluation. This value can represent static constants or dynamic inputs like oracle
data. Initially, it stores a simple value (e.g., a number or string), but it can be extended to
support expressions or maybe reference in the future. Updates to its value follow defined
rules, restricted to authorised roles (e.g., admin or oracle agents).
For example, an oracle agent may periodically update the carbon avoidance price, which is
then used by Process Nodes in credit calculations.
Inputs: No direct tokens; receives updates from authorized agents or systems
Outputs: None directly value is read by Process Nodes only for now
Behaviour: Store and serve a named value; allow controlled updates
Implementation details: Internally stores a key-value pair; enforces update permissions;
exposes value during formula evaluation via lookup. Possible implementation choices one
singleton node per process or a for each step,
AGGREGATOR
An Aggregator component collects a batch of tokens from a queue and reduces them into a
single, reconciled token of a defined type. For instance, to produce a weekly summary of
sensor readings, the Aggregator gets a batch from a queue and configures it to pull all
tokens older than one week. It then applies a reduction formula (for example, summing
values or computing an average) and emits one aggregated token (e.g. WeeklyReading) into
a target queue. Any tokens not consumed because they fall outside the batch or your
parameters can either be discarded or re-queued at the front for the next run. This lets you
reconcile streams without losing unprocessed data.
Inputs: Tokens from a queue (filtered by count or timestamp)
Outputs: One aggregated token of a different type (e.g. WeeklyReading)
Behaviour: Pull N tokens or all tokens in a time window Apply a reduce formula (sum,
average, min/max, etc.) Emit one new token; discard or re-queue leftovers as configured
Implementation details: Use a loop or array-reduce to combine values Optionally call
queue.requeue(tokens) for leftovers Lock the source queue during aggregation to ensure
atomicity
UNIT SPLITTER
The UnitSplitter consumes a single bulk token with a numeric value and a configured unit
size, then breaks it into fixed-size unit tokens. It computes the number of whole units (count
= floor(input.value / unitSize)), emits that many unit tokens, and if a fractional remainder
remains, emits one final remainder token. Each output token preserves the original type and
metadata and may include extra fields (for example, a splitAt timestamp or batchId).
Inputs: Bulk token (e.g., 30 t CO₂)
Outputs: Multiple unit-sized tokens; optional fractional remainder token
Behaviour: Compute integer count and remainder; emit unit tokens; handle leftover
Implementation details: Use Math.floor and modulus; loop to generate discrete tokens;
preserve metadata
SPREAD NODE:
The Spread module takes a bulk token (e.g., 100 L of fuel) and emits smaller, equal-sized
tokens over time. It’s designed to distribute a total quantity evenly across a defined time
window—for example, emitting 100 L of fuel as ~3.33 L per day over 30 days. This ensures
downstream processes receive consistent daily input. The module keeps track of what has
been emitted and what remains. At each interval (e.g., daily), it emits the next portion. Any
remainder from rounding is either emitted at the end or carried forward.
Inputs: One bulk token (e.g. 200 L diesel)
Outputs: Multiple equal-sized tokens; optional fractional remainder token
Behaviour: Evenly divide the input’s value by a configured unit count or size, emit all
resulting unit tokens at once, preserve any leftover fraction as a separate token or keep it
queued
Implementation details:
- UnitSplitter step: use floor division and modulus to determine unit count and
remainder, emit tokens with original metadata plus extra flags (e.g. splitAt, batchId)
- Queue configuration: enqueue all unit tokens and rely on its pop(n),
popSince(time) or popWhen(condition) policies to control when and how many
tokens are released downstream
○
HIGH-LEVEL EXAMPLE:
*possibly this design will require queues between each component