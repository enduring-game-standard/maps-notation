# Test corpus

Each file is one net with no coordinates. The layout engine sees only this.

```json
{
  "name": "producer-consumer",
  "source": "Peterson fig 3.29",
  "places": [
    { "id": "p1", "label": "ready to produce", "tokens": 1 }
  ],
  "transitions": [
    { "id": "t1", "label": "Produce" }
  ],
  "arcs": [
    { "from": "p1", "to": "t1" },
    { "from": "t1", "to": "p2", "weight": 2 },
    { "from": "p3", "to": "t1", "inhibitor": true }
  ]
}
```

- `label` is optional. When the figure prints no name, use the id only.
- `tokens` defaults to 0. Write a number even when the figure writes a symbol such as `s` or `n`; record the symbol in `note`.
- `weight` defaults to 1. A figure that draws two parallel arcs or a bundle labeled 3 has weight 2 or 3.
- An optional `note` holds anything the structure can't express.
- `book/` holds nets transcribed from Peterson's figures, named `fig-CC-NN.json`. `heldout/` holds nets the rules were not derived from.
