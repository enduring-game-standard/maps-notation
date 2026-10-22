# Mark Brown's Boss Keys graphs

Research for [issue #5](https://github.com/enduring-game-standard/maps-notation/issues/5). Question: how are Brown's Boss Keys dungeon graphs drawn, and why does a graph's shape reveal the dungeon's design?

## Summary for MAPS layout and comparability

- **Brown built the graphs to make designs comparable.** He wanted "a universal way of representing a dungeon structure so we can clearly see how a dungeon is laid out and how dungeons compare to each other" ([Oracle episode, 2016-09-25][oracle]).
- **The graph is not a room map.** It is a lock-and-key dependency drawing. A horizontal line stands for *everything the player can reach at this phase*. Under it hang the keys (diamonds) and locks (squares) the player can physically touch from there. A lock is always drawn lower than its key. When a lock opens, a small circle under it starts a new horizontal line for the newly reachable region ([Patreon method post, 2017-08-11][patreon]; [Wind Waker episode][ww]).
- **The vertical axis is the only geometry with meaning.** Down means later in the dependency order. Horizontal placement shows which reachable region an item hangs from. Because placement follows from structure and not from the physical map, two dungeons with the same dependency structure come out the same shape.
- **Shape reads as design.** Brown names the readings. Branching is the number of forks off each horizontal line. Choice is several symbols on the same row. Backtracking is a tall line that runs back up to an earlier region. A dungeon with "no major branching and no backtracking" is "tall and thin", and one with "lots of branching, lots of choice and full-on backtracking" is "short and fat". In his words, "three of the four questions can be answered just by looking at the shape of the graph" ([Minish Cap episode, 2016-11-28][mc]).
- **The coherence comes from discipline, not from automation.** Brown draws every graph by hand. What keeps the shapes comparable is a short list of fixed rules: one axis with one meaning, a closed vocabulary of two shapes in paired colors, normalization (draw only the first instance of a repeated obstacle, since later ones are "irrelevant for showing the dungeon's structure"), and heavy abstraction (no enemies, minibosses, compass, map, or optional items). This bears on the warning in the issue: a derived MAPS layout will be comparable only if it fixes axis meanings and normalizes the same way. Deriving the layout is not enough by itself.
- **The scheme assumes progress that is monotone.** It works when anything you open stays open. It fails where MAPS lives. Brown says it cannot show interchangeable small keys that are used up on any door (a consumable resource, which is a `take` arc in MAPS). It cannot show reversible or shifting architecture such as water levels, the Sandship, or Sky Keep. It is "useless" for the any-order terminals in Breath of the Wild, and he calls it impossible as one chart for Hollow Knight. For MAPS, Brown's layout is a model for the monotone unlock part of a net, such as a rank by earliest reachable phase. It is not a general layout for Petri nets.

## Primary sources consulted

| Source | Date | How accessed |
|---|---|---|
| Mark Brown, ["How my Boss Key dungeon graphs work"][patreon], public Patreon post | 2017-08-11 | Full text and all inline figures pulled from the Patreon API (`/api/posts/13801754`). 13 of the 14 figures downloaded and inspected. |
| [Oracle of Ages and Seasons' dungeon design \| Boss Keys][oracle] | 2016-09-25 | YouTube auto-transcript. The graph system is introduced here. |
| [The Wind Waker's dungeon design \| Boss Keys][ww] | 2016-10-17 | YouTube auto-transcript |
| [The Minish Cap's dungeon design \| Boss Keys][mc] | 2016-11-28 | YouTube auto-transcript. The graphs are overhauled here into the version the Patreon post documents. |
| [Skyward Sword's dungeon design \| Boss Keys][ss] | 2017-05-17 | YouTube auto-transcript |
| [Breath of the Wild's dungeon design \| Boss Keys][botw] | 2018-01-19 | YouTube auto-transcript |
| [The World Design of Super Metroid \| Boss Keys][sm] | 2018-09-03 | YouTube auto-transcript |
| [The World Design of Hollow Knight \| Boss Keys][hk] | 2019-10-31 | YouTube auto-transcript |

Quotes from videos come from YouTube's automatic captions. I fixed obvious misspellings of proper nouns but did not check them against the audio.

## Detail

### Purpose

In the Oracle episode Brown says he had "struggled to find a way to talk objectively about the structure and complexity of any given dungeon". Counting keys or backtracking was "useful but imperfect", so he set out to find "a universal way of representing a dungeon structure so we can clearly see how a dungeon is laid out and how dungeons compare to each other" ([oracle] ~1:37). He also says "the nice thing about these graphs is that they can be used across all Zelda games", and he compares the Shadow Temple to Dodongo's Cavern on that basis ([oracle] ~4:12).

### Vocabulary (the Minish Cap overhaul, documented on Patreon)

From [patreon]:

- **Entrance** and **Boss**: white circles at the start and end.
- **Red diamond**: small key. **Red square**: locked door.
- **Orange diamond**: the dungeon's key item. **Orange square**: an obstacle that item overcomes, such as a bombable wall.
- **Blue diamond**: boss key. **Blue square**: boss door.
- **Green diamond with "A"**: a switch. **Green square "A"**: the barrier that switch removes. More switches take the next color and letter (purple B, yellow C, pink D).
- **Small white circle**: the junction under an opened lock, where a new horizontal line of reachable things begins. This shape is visible in the figures and described in the text ("put a circular node underneath the first locked door, another horizontal line across").

Brown sums up the overhaul in [mc] ~9:32: "I've simplified the symbols. A square is a lock and is unlocked by a diamond of the same color and symbol … you don't even need to have played a Zelda game to know how these work anymore." Each pair also carries a matching icon (a key, a bow, a horned boss key), which I saw in the Patreon figures.

### Layout rules

From [patreon], in Brown's words:

1. Start from a map of the dungeon that shows the relevant items. Then ask what Link "can get to at the start of the dungeon. We only care about things he can physically reach, like doors he can touch but can't unlock."
2. "A horizontal line comes out of the entrance node, and lines drop down to show you the things Link can do at this point."
3. "The lock is always lower than the key."
4. If you cannot yet tell how low an item goes, leave it and place it later. Obstacles are moved "down so they are lower than the key item diamond. This shows that while Link can get to the two obstacles earlier in the dungeon, he can't actually get past them until later."
5. After a lock opens, put a circle node under it and draw a new horizontal line with the newly reachable things hanging from it.
6. Draw only the first instance of a repeated obstacle: "it's irrelevant for showing the dungeon's structure." Brown shows a graph that breaks this rule and labels it "wrong".

The meaning of a horizontal line, from [ww] ~4:26: "this part of the graph represents every room you can get to before unlocking this door … so we can see that when you get the power bracelet and when you get the boss key you have to go back to previously explored areas to use them."

The vertical compaction is deliberate. In [mc] ~10:00 he says: "we can shrink this graph and pull it down so that the locks or squares are beneath the necessary key or diamond. When presented like this we can immediately see the sequence of events in the dungeon."

What I observed in the figures, not stated as a rule: an item's column hangs from the horizontal line of the region where it first becomes reachable. Its depth is set only by the constraint that it sit below every key it needs. So in Gnarled Root the boss door hangs from the entrance's line, because the player can touch it from the start, yet it sits at the bottom, below the boss key.

### How shape reveals design

The four questions, from [mc] ~2:40 to 5:50:

1. Does the dungeon branch?
2. Does the player choose the sequence of events?
3. Does the player have to backtrack?
4. Does the player have to do that backtracking themselves, or does the level design lead them straight to where the new item is used?

How each one appears in the graph, from [mc] ~10:46:

> "so now the graph shows branching paths by the number of forks off each horizontal line, backtracking by looking for tall white lines that stretch back to earlier parts of the dungeon, and choice where multiple symbols appear on the same horizontal line. Three of the four questions can be answered just by looking at the shape of the graph. The only thing they don't show is the fourth question … but I guess we can just slap an arrow on."

> "look at how Palace of Winds is tall and thin because it has no major branching and no backtracking, while Fortress is short and fat because it has lots of branching, lots of choice and full-on backtracking."

Brown names the two ends "follow the path" and "find the path" dungeons ([mc] ~6:09 to 6:25, revisited ~14:36).

The same readings in [patreon], on Gnarled Root: three lines off the first horizontal line mean "branching paths, with some dead ends". Two orange squares on one row mean "we can do them at the same time, showing that we have a choice". A line to the boss door that "stretches back to the very start" means backtracking. He compares Dragon Roost Cavern ("no backtracking, no choice, and no major branching": a single vertical spine with keys hanging on short side stubs) with Wind Temple ("branches out like crazy"). I confirmed both by inspecting the figures.

More readings from [oracle] ~3:22:

- several keys open at once, which adds some non-linearity;
- a choice among several locked doors;
- "how large the explorable space is at any point";
- how many places you return to after getting the key item.

How Brown reads a graph, from [patreon]: "the best way to read these graphs is often to go backwards". Start from the boss and follow each lock up to its key.

### What the graphs leave out, and where they break

- **Left out on purpose** ([oracle] ~8:17): enemy difficulty, minibosses, the compass and map, puzzles inside a single room, and optional items. He tried adding them for Stone Tower Temple and took them back out: "let's just strip all that stuff out."
- **Interchangeable small keys** ([patreon]): a small key opens any locked door and is then gone, so the player may choose which door to use it on. "My graphs don't really have a great way of representing this … unless you do the heavy lifting of going through the steps one by one. I'm open to any ideas." The Tail Cave figure shows the problem: three keys float on the top row, separate from the doors.
- **Dynamic architecture** ([patreon]; [ss] ~10:10): dungeons "more about manipulating architecture, time, water, etc can get very complicated … sometimes everything just breaks". The Sandship graph "is a mess". Sky Keep, where rooms can be rearranged, is "impossible to depict with my graph system". He adds that "all the best dungeons in Zelda either stress the limits of my graphs or outright break them."
- **Any-order objectives** ([botw] ~1:57): the Divine Beasts have no keys or locks, only terminals done in any order. "You might as well chuck my graphs in the ocean for this game because they're useless."
- **Very open worlds** ([hk] ~19:21): Hollow Knight's sequence is so flexible that "creating a single, monolithic chart for the game's structure is just not possible". He shows one route instead.

### The Metroidvania variant (season 2)

In [sm] ~4:15 Brown calls it "a dependency chart, which is something I came up with during the first season of Boss Keys". It keeps diamonds for upgrades, squares for obstacles, a horizontal line for "all the places we can visit right now", and locks below upgrades. It adds:

- triangles for non-essential pickups;
- dotted lines for locks you can see but not yet reach;
- a red line marking where the game lets the player pass back over its point of no return, after which "the game gets very wide" ([sm] ~17:32).

### Implications for MAPS (my inference, not Brown's claims)

- Brown gets "same structure, same shape" from a layered drawing in which depth is a function of dependency, roughly the first phase in which something becomes reachable. In MAPS terms, the closest analogue is to rank each verb by the earliest point in the reachability graph where it can fire, and to group states by the phase in which they first gain marks.
- His comparability also depends on what he leaves out and on how he normalizes. Repeated structure is collapsed: only the first obstacle is drawn. That is the same problem as MAPS's open "folding" item. A derived layout without equivalent rules for abstraction and normalization would not give comparable shapes, which matches the user's warning.
- Every case where his graphs fail is a non-monotone net: consumable keys, reversible water levels, moving rooms, and any-order sets. A Petri net expresses all of these natively. So Brown's scheme can lay out the monotone parts of a MAPS net, but MAPS needs another rule for cycles and consumption.

## What I could not verify

- **The video graphs themselves.** YouTube blocked video download, so I inspected no frames. Every claim about on-screen graphs rests on the transcripts and on the Patreon figures. I did not check whether the Minish Cap on-screen graphs match the Patreon figures exactly, or how the pre-overhaul graphs from the Oracle and Wind Waker episodes looked.
- **The 14th Patreon figure**, which appears to be the Sandship, failed to download.
- **The Dropbox symbol kit** linked in the post (<https://www.dropbox.com/sh/0arnq2gf89e8hem/AAAJYLhV8VT7o4meCTa-hRdVa?dl=0>) was not opened.
- **A rule for horizontal order within a row.** Brown states none. In the figures, keys tend to sit to the right of their doors.
- **Any algorithm or tool.** I found no evidence of either. The post implies hand construction ("It can get a bit tricky … keep at it!").
- **Influences.** Brown cites no prior art, such as Dormans's mission graphs or other lock-and-key graphs, in any source I read.
- **The transcripts are auto-generated.** The quotes are close but not checked against the audio.
- **The Fortress of Winds correction.** A web search snippet says Brown noted an error in the Fortress of Winds graph. I did not find the primary source for this.

[patreon]: https://www.patreon.com/GameMakersToolkit/posts/how-my-boss-key-13801754
[oracle]: https://www.youtube.com/watch?v=fqKGl6exyyY
[ww]: https://www.youtube.com/watch?v=DuU6ojvBIic
[mc]: https://www.youtube.com/watch?v=KEVJXqV7XMc
[ss]: https://www.youtube.com/watch?v=1ewa26q76fE
[botw]: https://www.youtube.com/watch?v=GudeeRVNo5U
[sm]: https://www.youtube.com/watch?v=nn2MXwplMZA
[hk]: https://www.youtube.com/watch?v=7ITtPPE-pXE
