# Design: KSEB household bill calculator

Date: 2026-10-18
Status: Approved

## Problem

`idea/KSEB_Household_Bill_Calculator_Spec.md` specifies how a Kerala State Electricity Board
LT-I Domestic bill is built: telescopic slabs that switch to an all-units rate, banded fixed
charges, an all-or-nothing subsidy, a per-period fuel surcharge, duty on the gross energy charge,
rupee rounding and a separate account settlement. Getting any of these wrong by a paisa produces a
total that does not match the bill. People also struggle to see *why* their bill changed.

## Goals

- Reproduce the spec's seven reference bills exactly, plus its boundary and assessed-reading cases.
- Show every line with its working, and where the user sits on the slab ladder.
- Say plainly when a result is an estimate, incomplete or unsupported, rather than guessing.

## Non-goals

BPL, NPG, time-of-day and solar-prosumer pricing. They can be selected, but the engine returns
`unsupported`, and the UI says so. Each is a follow-up cycle.

## Decisions

| Area | Decision | Rationale |
|---|---|---|
| Placement | `libs/kseb/domain` + `libs/kseb/feature-calculator`, mounted at `/kseb` in `helpme-shell` | Thin apps (`CLAUDE.md` rule 1); one deploy until a second zone is worth its cost |
| Tags | `scope:kseb` with `type:util` / `type:feature`; shell may depend on `scope:kseb` | Keeps the kseb scope isolated from future micro-apps |
| Arithmetic | `decimal.js`, `ROUND_HALF_UP`, lines rounded before summing | Spec §10.2 |
| Tariff data | Effective-dated config objects; rates as strings | Rates change every order; strings avoid float entry |
| Bi-monthly | Monthly tables with thresholds and fixed charges ×2 | Matches spec §4.3 and §5.2 exactly; one table to maintain |
| Fuel surcharge | Seeded per bill month; missing → `incomplete` until entered | Spec §8 forbids assuming zero |
| Persistence | `localStorage`, restored after mount | Returning users keep their profile; no hydration mismatch |

## Assumption

The spec states the fixed-charge subsidy only for bi-monthly bills (₹40). Monthly bills use ₹20.
The figure is a single config value in `lt1-domestic-2025.ts`.

## Verification

`nx test kseb-domain` covers all seven reference bills line by line, every §13 boundary, the
assessed-reading case, fuel surcharge (published, entered, refund, missing), settlement signs and
unsupported paths. A component test and a Playwright spec drive the page to the ₹486 and ₹599
reference totals.
