# Design direction

The dashboard and the app share one look.

## Where it comes from

Listora is a local classifieds marketplace. The identity borrows from the printed classified column: a newsprint-grey frame around a white page, near-black ink, and a single teal that is kept for data and for the price tag.

The mark is a price tag. Every listing has a price, and a tag reads as "for sale" without any words.

## Tokens

`tokens.json` is the source for colour. `node design/build-tokens.mjs` writes it to `web/src/app/tokens.css` and `mobile/lib/app/theme/tokens.dart`. Change a colour in the JSON, never in the generated files.

| Role | Light | Use |
| --- | --- | --- |
| ground | `#f4f4f1` | The dashboard frame; wells in the app |
| surface | `#ffffff` | The page |
| text | `#131416` | Running text, the primary button |
| muted | `#5d5f60` | Labels and meta, 4.5:1 or better on every ground |
| accent | `#1b6c80` | Data, the mark, the price tag. Never chrome |

Status colours (positive, negative, warning) are for status only.

## Type

IBM Plex Sans at 400, 500 and 600, on both platforms. The dashboard loads it through `next/font`; the app bundles the TTF files.

| | Dashboard | App |
| --- | --- | --- |
| Title | 22 / 28, 600 | 28 / 32 and 20 / 26, 600 |
| Section | 16 / 24, 600 | 16 / 24, 600 |
| Body | 14 / 20 | 16 / 24 |
| Small | 12 / 16 | 12 / 16 |

Numbers in tables and anywhere they update use tabular figures.

## Dashboard

A framed sheet. The sidebar and the 48px top bar share the tinted ground with no rule between them. The page is a white sheet inset 8px from the right and bottom, 16px corners, a 1px edge and no shadow. Below 1024px the frame folds into a top bar with a full-screen menu.

Rules that hold on every screen:

- Colour goes on data, status and one primary action. The chrome stays grey.
- The primary button is near-black.
- Flat surfaces: a 1px border or one tone step, never a shadow on something at rest.
- Icons are Lucide, 16px at a 1.5 stroke, in the text colour.
- Radius is 8 for cards, 6 for controls, 4 for chips.

## App

The same palette and typeface, with a true-black dark theme. Controls are 48px tall with an 8px radius. Screens are checked against golden images in `mobile/test/goldens`.
