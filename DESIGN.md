# DESIGN.md — UI rules for this project. Read before touching any UI.

Reference: editorial product studios and high-end case-study sites: AREA 17, Work & Co, Studio Heyday/COLLINS-style typography, Tide/Solene pacing, and real Unlimited photography from local incubator settings.
Tone in three words: sharp, warm, credible.
Audience: tech recruiters and product-minded reviewers checking whether this is a polished, working prototype, plus local incubator teams documenting activities, feedback, and early impact evidence.

## Approved Brief

Palette:
- `bg`: `#f7f1e6` Warm paper
- `ink`: `#0a3f32` Deep green
- `accent`: `#ff7448` Signal orange

Typefaces:
- Display: Fraunces, because it gives the first screen a stronger editorial point of view and makes the prototype feel more intentional than a generic SaaS mockup.
- Body: Inter, because the app has dense forms, notes, buttons, metrics, and generated report text that need to read cleanly at 17-19px.

Layout:
The page should read like a polished product case study that happens to be fully usable: a slim dark navigation rail, a dramatic asymmetric first screen, real Unlimited photography, and product areas that show working data rather than fake decoration. The journal, surveys, and summary views stay practical, but the About and Prototype Notes views should make the craft, stack, and scope obvious to a recruiter.

Motion:
One motion idea only: content responds when it arrives or changes. Views, real photos, newly added records, and the live entry preview use a short ease-out rise under 280ms. No looping or decorative animation.

How the reference shows up:
AREA 17 and Work & Co show up through restrained product clarity, serious typography, and confidence in whitespace. Tide/Solene shows up through editorial pacing and warm restraint. Unlimited shows up through deep green, real local incubator photography, and the social-impact subject matter; avoid fake proof, decorative blobs, gradients, generic SaaS sections, and stock-like layout patterns.

## Process

1. Before writing any UI code, output a design brief: the palette as
   named tokens with hex values, the two typefaces and why, the layout
   idea in two sentences, the one motion idea, and how the reference
   shows up. Wait for my approval. Do not build from an unapproved brief.
2. Build the whole page from that brief. If you drift from it, say so.
3. When done, run the self-review at the bottom and fix what it finds
   before showing me.

## Banned. Never, without me asking by name.

- Slate-900 or any near-black blue-gray page background.
- Radial gradient blobs, blurred glows, or "orbs" as backgrounds.
- Gradient text. Purple-to-pink, blue-to-cyan, any of it.
- Purple as a primary accent. If the brief needs purple, justify it.
- Icons inside rounded-square or circular badges. Icons in feature lists
  at all, unless the icon carries meaning a word cannot.
- Three-column feature grids with icon, title, two lines of copy.
- Bento grids, unless every cell shows real data from this product.
- Fake charts, fake sparklines, fake toggles, fake cursors, fake
  dashboards. If it isn't real, it doesn't ship.
- Tilted or 3D-perspective screenshots. Screenshots are flat, at 1x,
  and real.
- Drop shadows with a blur over 24px. Glowing borders. Border-beam
  effects.
- A taller, glowing, or "Most Popular" pricing card. All tiers equal;
  recommend with copy, not with height.
- Testimonials, logo bars, star ratings, or "Trusted by N" counts that
  are not literally true with named, real sources. No proof beats fake
  proof.
- Stock photos of people. No Unsplash headshots, ever.
- Pills above the headline. "Now with AI." "New." Sparkle emoji.
- Emoji anywhere in UI text.
- The words: supercharge, seamless, effortless, unlock, elevate,
  empower, revolutionize, next-generation, AI-powered, all-in-one,
  game-changing, unleash. Any headline that could sit on a
  competitor's site unchanged.
- Inter, Roboto, Open Sans, or the system font as the display face.
  Fine for body. Never for the words people read first.
- Bouncing, pulsing, or looping animations that exist to look alive.
- Marquees of anything.
- Rounded-2xl on everything. Pick one radius and mean it.

## Required

- One background color, one ink color, one accent. Tokens named for
  their job (bg, ink, accent), never Tailwind palette names.
- Two typefaces max: a display face with a point of view, and a body
  face built for reading at 17 to 19px. Real type scale: the hero is
  4 to 6 times body size, tight tracking on display, 1.5 to 1.7 line
  height on body.
- Whitespace is a feature. Sections breathe. Nothing is fighting for
  attention because only one thing on each screen deserves it.
- Asymmetry somewhere. A pulled-left headline, an offset image, a
  column that is narrower than the others on purpose.
- The headline names what the product does for whom, in words the
  customer would use. Specific beats clever.
- Every number on the page is true. Every quote has a real name and a
  real company. Otherwise the section does not exist.
- Motion: one idea, used consistently. Ease-out entrances under 400ms.
  Nothing loops. Nothing moves unless the user did something or the
  content just arrived.
- Screenshots and product imagery are real captures from this product,
  flat, with a 1px border or no border.
- Buttons look like buttons: one primary, one secondary, no gradients.
- Mobile is designed, not squeezed. Check it at 390px before showing me.

## Self-review before showing me

Go through the page and list every element that:
1. Appears on the banned list.
2. Could be deleted with zero loss of information.
3. Would look at home on a generic SaaS template.
4. Contains a claim you cannot prove.
5. Uses a color, radius, or shadow not in the brief.
Fix all of it, then show me the page and the list of what you changed.
