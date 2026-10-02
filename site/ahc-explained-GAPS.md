# Gaps between our agent and AHC, found while illustrating

## ✅ FIXED (reference-agent@832c38a) — saved replies leaked across customers (found via AHC-0068; verified in code, reproduced by the agent in a temporary test)
- Fixed: the delivery key is now named `customer_id:key` (entrypoint/__init__.py:161), so another customer's key reads nothing.
- The /chat idempotency-key header becomes delivery_id (serve/__init__.py:177). req.once(..., delivery_id, scope=DELIVERY) files the saved answer under that key alone (entrypoint/__init__.py:158), and AlreadyAnswered returns the saved outcome to whoever resends the key (serve/__init__.py:263-266), with no identity check. Reproduced: C-1042 sent key shared-key-1 and asked about AB-10002; C-9999 sent "hello" with the same key and got C-1042's reply and conversation id.
- Fix direction: scope the delivery key by the verified identity (e.g. customer_id + key), or check that the stored outcome's owner matches before returning it.


## AHC-0018 (policy decisions recorded)
- The record has no rule version.
- A "yes" is recorded once per checkpoint, not once per rule, so an empty rule list looks the same as every rule passing.
- When a block happens inside the AI's run, the result's reason is just "refused" (loop/__init__.py:406) and the rule's own explanation is dropped. The final-reply check keeps it.

## AHC-0093 (policies compose in order)
- The record doesn't say what order the rules ran in.
- The code stops at the first "no"; the spec suggests running every rule and acting on the first "no".

## AHC-0008 (one enforcement position, fail closed)
- Every rule blocks when it breaks. That default is the same for all rules rather than chosen per rule, as the spec's design notes ask.

## AHC-0008 / AHC-0094
- The single "exit" is a function inside our own code, not a shared gateway in front of it (harness-profile.yaml:341 says there is no gateway).

## AHC-0035 (secrets never enter context)
- Our agent only partly meets this spec. When a call to the order system fails, the error message reaches the AI as it is: fenced, but not scrubbed (tools/mcp.py:154-155). R-008 in REVIEW.md is still open. The page says so.

## AHC-0011 (untrusted content fenced)
- The spec wants a random per-request marker, or a fixed marker plus rejecting input that contains it. We use a fixed marker and change any copy found inside the text instead. The spec's third question leaves that option open but gives no answer.
- telemetry/contract.py:59 and REVIEW.md:89 cite "AHC-0011" to mean "complete trace", which looks like an old catalog number.

## AHC-0109 (summary provenance)
- harness-profile.yaml:104 says trimming "loses the earliest exchange", but context/__init__.py keeps the first exchange and drops from the middle. The profile text is wrong.

## AHC-0033 (what serves traffic is what was assessed)
- Not met: this is an accepted gap because the agent isn't deployed yet, due for review 2026-12-01 (harness-profile.yaml:326-331). The page says so.
- The settings fingerprint covers `prompt_version`, which is only a label ("v1"), not the prompt text. A prompt edit that doesn't bump the label keeps the same fingerprint. Possibly worth a finding (it also affects AHC-0003).

## AHC-0019 (redaction)
- F-057 is still open: names, addresses, passport numbers, and phone numbers in formats other than Indian mobile are not blanked.

## AHC-0025 (partial results are typed)
- When the AI hits its length limit but still writes some text, the partial reply goes out as Completed. The loop never reads the stop reason (llm/__init__.py:327), so only the empty-answer case (F-031) is caught.

## AHC-0005 (degradation path)
- evals/assurance-map.json lists test_a_refused_call_does_not_put_the_gateway_on_cooldown as failed (it skips when the gateway holds a working key).

## AHC-0092 (region pinned)
- The A6 blueprint says we owe it, but harness-profile.yaml:276 marks it not applicable. Region is not recorded per call, and no residency rule is declared.

## AHC-0021 (throttling)
- The random spread between retries runs alongside the wait the service asks for, so after a "too busy" the actual pause is roughly whichever of the two is longer. That's a minor point, stated loosely on the page.

## AHC-0115 (erasure)
- The erase call can't reach replies stored under the support inbox's own message ids (erasure/__init__.py:78-83).

## AHC-0039 (reversibility classes)
- cancel_order is irreversible but needs no approval. Only the "customer asked about this order" consent check stands between the AI and cancelling.

## AHC-0024 (retries bounded)
- The 3-try limit applies to each AI call, not to the whole task: the worst case is 12 × 3 = 36 calls. The task's record has no "tries for this task" total (resilience/__init__.py:258 resets the count each call; loop/__init__.py:79-90 keeps no tries field).
- The try counter is shared by every conversation on the same AI client, so the try number on retry entries can be wrong when two run at once (resilience/__init__.py:258,274,295).

## AHC-0101 (price table)
- The price list's date is only a code comment (cost/__init__.py:60). test_the_default_price_map_is_dated_and_flagged only checks model names (tests/test_cost.py:242-249). The list lives in code, not in configuration.

## AHC-0007 (spend per unit of work)
- Cost per successful task exists only in a saved test figure (tests/test_golden.py:270). Production neither reports successful and failed tasks separately nor sends any metrics (harness-profile.yaml:296-299).

## AHC-0031 (context size per release)
- Not met (declared). The size is never split into parts, tool descriptions are never counted, and the saved between-versions figure is measured on stand-in text (tests/test_golden.py:257).

## AHC-0016 (input validated before model call)
- The chat-widget (Chatwoot) door reads the message with no size limit (channel/__init__.py:194,226). A 9 MB paste would reach the AI, and the context trim can't help because it never drops the latest exchange (context/__init__.py:173).

## AHC-0030 (ceiling stops work in flight)
- No room is held back for the most expensive single call before checking; spend >= ceiling is checked after each call (cost/__init__.py:121-122). The overshoot is bounded only by max_output_tokens = 4096.
- Nothing warns before the gateway's $5 per 30 days runs out. The only cost alert is SpendPerRunDoubled (deploy/prometheus/rules/agent.yml:176).
- At today's prices, 12 steps cost about $0.05 at most, so the $0.50 ceiling can't be reached with the current model. (The agent's own arithmetic.)

## AHC-0041 (budget outside the model's control)
- There is no time limit on a whole run: the DEADLINE_REACHED label exists (contracts/domain.py:75) but nothing uses it.
- Tokens are counted but have no limit of their own. Money is the only spending limit.

## AHC-0042 (no-progress condition)
- Only identical calls are compared, not identical call plus identical result, so a legitimate retry after a brief failure counts toward the 3 (loop/plan.py:70-72).
- A series of different calls that changes nothing is only stopped by the step limit.
- The threshold of 3 can't be changed from the entry point (loop/__init__.py:120).

## AHC-0015 (streaming contract)
- The A6 blueprint says we owe it, but harness-profile.yaml:249-251 marks it not applicable ("does not stream"). One of the two is wrong.
- Nothing stops a turn when the customer closes the tab (no is_disconnected check anywhere), so the AI keeps being paid for that turn.

## AHC-0103 (never separate a call from its result)
- BrokenTranscript is not caught anywhere (loop/__init__.py:234 is outside any try), so the customer likely gets a plain 500 rather than a labelled Failed reply. Not fully traced.

## AHC-0104 (concurrency by class)
- Inside dispatch, answers are matched to requests by list position and the request id is attached afterwards (loop/dispatch.py:52-58, loop/__init__.py:341). Safe today, but the spec prefers carrying the id through every path.
- The rule "look-ups may overlap, changes run one at a time" is written only in code, not in harness-profile.yaml.

## AHC-0113 (synthetic run)
- The 10-minute schedule is the canary script's own loop (scripts/canary.py:62 --every 600). There is no canary service in compose.yaml.
- F-047 is still open: the 4th canary question fails against the simulated shop (tests/test_watching.py:388-395).
- F-048's look-alike hyphen is still open in the replies customers see.

## AHC-0100 (answered without the model)
- The router rules version is written twice, in config/__init__.py:105 and router/__init__.py:37, and nothing checks that they agree. The rules live in code, not in a separate configuration file.

## AHC-0004 (one choke point)
- Only an import build-check stops a second route to the AI. The network isn't locked so that only the choke point can reach the provider.
- The default base URL is api.groq.com directly (config/__init__.py:97), so the gateway's per-caller key and budget don't apply by default.

## AHC-0006 (one span per call, context across hops)
- The trace ID stops at our process: tools/mcp.py:147-152 doesn't pass it on (no traceparent), and the order system has no tracing. This is an accepted gap (harness-profile.yaml:335-345), due for review 2026-12-01.

## AHC-0010 (task entrypoint)
- handle() returns (TurnResult, Conversation) with no trace or trace link; the loop's trace is dropped at entrypoint/__init__.py:292.
- build() takes many separate settings rather than one resolved config record (entrypoint/__init__.py:357-376).
- The assurance map lists test_a_declared_scenario_says_the_same_against_the_real_store as failing.

## AHC-0028 (graders injectable and versioned)
- harness-profile.yaml:282-288 still says "No grader runs in the loop", but watch/ now runs 22 versioned rules. The profile is out of date.
- RULES_VERSION = "1" (watch/__init__.py:35) is supposed to be bumped whenever a rule's version is, yet W-06 is at version 2 (watch/rules.py:116).

## AHC-0029 (production record → dataset row)
- Not met; accepted gap, review 2026-11-01. The record fields and the test-file fields differ, and nothing links a test back to the chat it came from.

## AHC-0112 (late outcomes attached)
- Customers get only a chat ID, not an ID for each reply (serve/__init__.py:280), so feedback is tied to the last reply before the click.
- Outcomes have no event time of their own (watch/outcomes.py:36-43).
- There is no refund-reversal outcome, and a person's verdict on an escalation isn't recorded as an outcome.

## AHC-0114 (evaluation record per unit of work)
- A reply's position in the chat is never recorded. There's no token total per reply.
- The settings fingerprint and how the reply ended are optional on the reply record, so the contract check doesn't enforce them (telemetry/contract.py:97-109).
- Captured words are cut at 4,000 characters (telemetry/__init__.py:259).

## AHC-0032 (rollback restores prompt, model and policy together)
- The routing-rules label (config/__init__.py:105) is separate from the rules actually loaded (router/__init__.py:37), so the two can drift.
- The safety rules (policy/__init__.py:343) have no version and aren't in the settings ID.
- There is no one-action rollback. Accepted gap, review 2026-12-01.
- (The prompt_version label vs prompt text gap is the same one listed under AHC-0033.)

## AHC-0014 (sampling explicit)
- top_p, seed and stop words are never sent or recorded (llm/__init__.py:188-197).
- `request.temperature or self._temperature` (:197) means a call can't ask for 0 when the configured value isn't 0.
- A per-call temperature change isn't written to the call's record.

## AHC-0009 (model set is data)
- The approved list is copied by hand into deploy/litellm/config.yaml and keys.py:24, and no test checks those copies match the settings.

## AHC-0111 (metrics apart from traces)
- There's no link from a metric total to an example chat record.

## AHC-0023 (fixtures carry capture date and re-cut path)
- The replay command is broken: scripts/first_real_call.py:72 plays back without naming its settings, so --replay fails with TrustBoundaryCrossed (confirmed by running it). It has been broken since the F-010 fix (ddedf85).
- The re-make command would write a blank label: scripts/first_real_call.py:76 records without settings, giving "context": "", which tests/test_release_gates.py:127 would then reject.
- No capture date is stored (cassette/__init__.py:187-195).
- The recording's settings list tools: [] although the AI called get_order in it. The settings were filled in by hand during the format-2 upgrade.
- F-010 means two different things: the cassette bug here, and model routing in REVIEW.md:194.

## AHC-0022 (provider substitutable)
- Nothing stops set replies or a recording from being plugged into a live agent; only sealed runs are refused the real AI (config/__init__.py:239). The `resolution` setting is never used to choose which one is plugged in; the startup script's --real flag decides.

## AHC-0105 (replay only against the originating request)
- A replayed run can say "real" on the turn record (from settings, entrypoint/ending.py:46) and "replay" on each call record.
- (Arguable) When the set-replies stand-in runs out, it reports "AI unavailable" (llm/__init__.py:355-356).

## AHC-0013 (standing instruction separable)
- The settings ID is only written when settings are passed in; the demo's set-replies mode records none.

## AHC-0026 (one identifier for the unit of work)
- get_order sends no run ID (accepted gap, harness-profile.yaml:346-354).
- New, not in the profile: calls to the AI gateway carry no run ID, so the gateway's spend can't be joined back to a run (llm/__init__.py:188-197).

## AHC-0090 (segment labels at the boundary)
- Not met; accepted gap, review 2026-12-01. The router works out what a message is about (router/__init__.py:241-262), but that never reaches the trace record or the metric labels.

## AHC-0110 (one failure vocabulary)
- The base class quietly defaults to "refused" (contracts/failures.py:81), and the build test only checks list membership, so a failure that never chose a kind still passes.
- Nothing reads the kind: retries decide by exception type (resilience/__init__.py:278-290), and the metric records the type name, not the kind (llm/__init__.py:201).
- The "exhausted" comment's example (a cassette with nothing left) contradicts the cassette-miss class, which is labelled misconfigured (cassette/__init__.py:63).

## AHC-0043 (tool failure is a loop state)
- The note to the AI doesn't say whether trying again later would help; the only label is how the error came back (contracts/tools.py:66).
- Our code never retries a failed lookup itself (loop/dispatch.py:31-58); the AI has to spend a step.

## AHC-0044 (trajectory checkpointed)
- It saves once per turn, not after every step (harness-profile.yaml:266), and there's no save just before a change that can't be undone. The claim taken before a change lives in memory in the demo (tools/__init__.py:174-189, scripts/run_server.py:285-287).

## AHC-0074 (repeat-safety declared)
- The list of calls still waiting for an answer is in memory (loop/plan.py:49), and each turn gets a new run number (entrypoint/__init__.py:177). So a turn re-run after a crash gives the same change a new name. harness-profile.yaml:134-142 says this isn't tested.
- The order system also remembers names only in memory (order_system/server.py:69-89).

## AHC-0102 (state written whole)
- A half-written record comes back exactly like a missing one (state/__init__.py:375-384, asserted by tests/test_entrypoint_state.py:244-254). The chat channel then silently starts a blank conversation (channel/__init__.py:336-338).
- The start-up check doesn't cover the store of changes that already ran, and nothing checks the order system's claim about its in-memory name list (entrypoint/__init__.py:384-386, order_system/server.py:79).

## AHC-0027 (record states route and why)
- Minor: the replay marker sits on the turn record for live calls but on the call record for playback.

## AHC-0061 / AHC-0063 (not required, but close analogues)
- The fact check does nothing when no tool ran: policy/__init__.py:238 (`if not ctx.tool_results: return ALLOW`). A reply in a turn with no tool calls can state any order number, amount or date.
- There's no "no answer" result kind. "I'm not sure" comes back as Completed prose, and declining is left to the prompt's wording (entrypoint/__init__.py:66-71). AHC-0017's text lists an "abstained" state our agent doesn't have.

## AHC-0064 (analogue)
- The order data's version (worlds/clothing.yaml version: 2) isn't in the settings fingerprint, which deliberately leaves out mcp_base_url.

## AHC-0071 / AHC-0075 (not required; our approval workflow)
- The carry-out and reminder steps are handed the whole Approval record, not just their own input (approvals/durable.py:203,217).
- The order details in each workflow form are an open dict[str, object] (durable.py:78,93), and extra fields aren't rejected, so a renamed field gets through and only fails later as a look-up.
- The workflow's check and carry-out steps each get their own 30 s timeout and 3 tries (durable.py:64-65), with no shared end-to-end limit.

## NEW BUG — direct route treats "not found" as found (found via AHC-0086; verified in code)
- entrypoint/direct.py:70-75 only fails when the result is an error or not a dict. The order system answers {"found": false} for a missing order and for someone else's order (order_system/server.py:117,210-214). That is a dict, so order_status replies "Order AB-10003 is currently unknown." (status falls back to "unknown", direct.py:91), and refund_status replies "There is no refund on order AB-10003." (direct.py:104,120).
- The canary misses this because it only checks that nothing leaks (watch/canary.py:102-110). The F-047 description ("cannot find the order") appears not to match what the code produces.

## NEW GAP — order-number recognition is exact-match only (found via AHC-0089)
- router/__init__.py:29 matches only an upper-case number with a plain hyphen. "ab-10003", or AB‑10003 with a look-alike hyphen (which the agent itself writes, F-048), skips the quick answer and goes to the AI.
- Possibly the same in policy/__init__.py:193: the ungrounded-entity check only recognises the plain hyphen, so an order number the AI writes with a look-alike hyphen isn't checked. Probed from the code only.

## AHC-0088 (scope of refusal declared) — our agent does this anyway, with gaps
- Three of the spec's own example refusals aren't caught by the router rules: "Which colour would suit me better?", "Update my payment method to UPI", and "What did my neighbour order? Her name is Ravi." (confirmed by running the router).
- The refusal list isn't in the standing instruction (entrypoint/__init__.py:66-71).
- The list is copied by hand into the rules and into tests/test_refusals.py:56 rather than read from the spec, so the "every refusal has a rule" test can't catch drift.

## AHC-0085 (not required)
- The reply to the chat page (conversation_id, reply, outcome) carries no schema version (serve/__init__.py:278-284).

## AHC-0020 (concurrency bounded by the harness)
- The code's only citation of AHC-0020 (flow/__init__.py:6) and its test are about the 4-at-once look-up limit within one reply, which isn't a limit on AI calls across the program.
- Nothing caps how many chats wait on the AI at once. The gateway's cap is per minute, and there's no waiting line with a time limit: refused, retried 3 times, then given up.
- With the default address (Groq directly, config/__init__.py:96), none of our limits apply.

## AHC-0095 (policy evaluation budget and timeout) — not met
- Rules have no time limits and run in line with every chat (policy/__init__.py:369), so one stuck rule freezes the whole program. Accepted gap, review 2026-11-01.

## AHC-0096 (deadline propagates) — not met
- There's no overall deadline, and DEADLINE_REACHED (contracts/domain.py:75) is never produced. Worst case ≈ 12 steps × 3 tries × 60 s = 36 min waiting on the AI alone.
- The only test mapped to this spec (tests/test_break_it.py:212) doesn't test a deadline.

## AHC-0097 (fan-out bounded)
- There's no cap on how many calls one reply may ask for, only on how many run at once. A 50-look-up batch counts as 1 of the 12 steps.

## AHC-0098 (admission by priority class) — not met
- The profile's "one class of traffic" (harness-profile.yaml:270-275) is wrong: the canary and eval traffic exist. The canary shares customers' 30 a minute, and its synthetic mark is used only for counting.

## AHC-0066 (session boundary and lifetime)
- Nothing says when a conversation ends: there's no idle expiry.
- The running server keeps conversations in memory (scripts/run_server.py:438), so a restart silently gives the customer a new, empty conversation. The Postgres store exists and is tested but isn't switched on.

## AHC-0067 (history compaction recorded)
- The record never names the rule that did the cutting, or which turns went. The permanent cut on save records only its size (entrypoint/persist.py:40).
- Nothing keeps constraints the customer stated earlier in the chat; the work record keeps only the latest question.

## AHC-0068 (isolation structural)
- The owner check is repeated at each way in rather than built into the store: latest() looks up by conversation number only (state/postgres.py:92-112).

## AHC-0070 (escalation carries context)
- No single screen shows everything. The support-inbox note leaves out why the customer was passed on (channel/__init__.py:297), and the desk page leaves out the work record (reviewer/page.py:114-123).

## AHC-0053 (a trigger produces exactly one run)
- The running server keeps the delivery-id list in memory (scripts/run_server.py:446). The Postgres version (requests/postgres.py) is tested but not wired in.
- A run_server.py:428-433 comment still says the delivery claim lives in Temporal, which T-062 removed.
- (See the SECURITY entry at the top: the saved reply is keyed by delivery id alone.)

## AHC-0054 (operator stop) — partly
- There's no stop-all switch, and the loop checks nothing external between steps. A takeover is only checked when a message arrives, so a reply already in progress still posts (channel/__init__.py:270-293).

## AHC-0055 (silence alertable) — partly
- Only the canary has a silence alarm. Nothing alarms if the approval/escalation worker or the webhook path goes quiet.

## AHC-0056 (record written before the effect) — refunds only
- For cancel, address change and return, nothing durable records what, which order, whose login or why before the call; only the name row is written. The trace span is written when the call ends and is batched in production (telemetry/__init__.py:230). The AI's stated reason is never recorded.

## AHC-0058 (compensating path)
- reverse_refund, reinstate_order and close_return_request exist only as names; the order system has no such tools, and nothing outside tests calls compensation_for.
- change_address is marked reversible by the order system (server.py:159) but has no way back in the list, while cancel_order is marked irreversible (server.py:135) yet the list gives it one.

## AHC-0059 (blast radius by configuration) — partly
- No setting limits how many changes one request may make: one step can plan several calls, so the worst case is 12 steps × any number of calls. The asked-for rule lives in code, not configuration.
