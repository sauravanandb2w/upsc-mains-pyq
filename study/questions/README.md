# GS study folders — per-question images

One folder per **PYQ id**. Use when a diagram, map, or scan belongs to **that question only** (not the whole theme).

**Full guide:** [`ADDING_IMAGES.md`](../../ADDING_IMAGES.md) → section **2. GS — images on a single PYQ**

---

## Question ID format

`gs{paper}-{year}-q{number}`

Examples: `gs1-2024-q1` · `gs2-2024-q5` · `gs4-2023-q7`

Match the `"id"` field in `data/gs-paper-N.json`.

Math optional uses `study/modules/` instead — see [`study/modules/README.md`](../modules/README.md).

---

## Setup

```bash
mkdir -p study/questions/gs1-2024-q1
```

```text
study/questions/gs1-2024-q1/
├── manifest.json
└── my-diagram.png
```

`manifest.json`:

```json
{
  "images": ["my-diagram.png"]
}
```

```bash
git add study/questions/gs1-2024-q1/
git commit -m "Add GS1 2024 Q1 diagram"
git push
```

---

## Where it shows in the app

**General Studies** → **Questions** → find the PYQ → expand **Diagrams & images**

---

## Examples in this repo

| Folder | Content |
|--------|---------|
| `gs1-2024-q1/` | Rig vs Later Vedic comparison PNG |
| `gs2-2024-q1/` | 2024 Q1 answer structure |
