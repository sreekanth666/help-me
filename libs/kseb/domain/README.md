# @helpme/kseb-domain

Pure TypeScript engine for KSEB LT-I Domestic bills. `calculateBill(input)` returns every line
with its working, the bill total, the account settlement and a status
(`exact` / `estimate` / `incomplete` / `unsupported`).

Rates live in `src/lib/tariffs/` as effective-dated config, and fuel surcharges per bill month in
`src/lib/fuel-surcharge.ts`. Add a new tariff or month there; no code changes needed.

Run `pnpm nx test kseb-domain` before touching either. The spec's reference bills must still pass.
