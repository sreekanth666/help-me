# Quarterly Engineering Review

A short paragraph with **bold text**, *italic text*, ~~struck-through text~~,
`inline code`, and [a link](https://example.com).

## Summary

> Shipping fewer things, more completely, beat shipping more things partially.

### Highlights

- Reduced p99 latency by 40%
  - Query planner rewrite
  - Connection pool tuning
- Cut build times in half
- Retired two legacy services

### Release Checklist

- [x] Migrations applied
- [x] Feature flags configured
- [ ] Runbook updated
- [ ] Postmortem scheduled

## Numbers

| Metric | Q1 | Q2 | Change |
| --- | --- | --- | --- |
| p99 latency (ms) | 840 | 504 | -40% |
| Build time (min) | 12 | 6 | -50% |
| Error rate (%) | 0.42 | 0.31 | -26% |

## Implementation Notes

The retry helper now caps total elapsed time rather than attempt count[^1]:

```js
async function withRetry(operation, budgetMs = 5000) {
  const deadline = Date.now() + budgetMs
  let delay = 100

  while (Date.now() < deadline) {
    try {
      return await operation()
    } catch (error) {
      if (Date.now() + delay >= deadline) throw error
      await sleep(delay)
      delay *= 2
    }
  }
}
```

Configuration lives in a plain block with no language tag:

```
RETRY_BUDGET_MS=5000
RETRY_BASE_DELAY_MS=100
```

---

## Next Steps

1. Finish the runbook
2. Schedule the postmortem
3. Start the caching spike

[^1]: Attempt counts let a slow dependency exceed any latency budget.
