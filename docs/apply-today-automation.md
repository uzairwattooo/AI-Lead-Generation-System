# Apply Today proposal preparation

1. Apply `202611030003_apply_today_ready.sql` after the existing Apply Today migrations.
2. Deploy with the existing `OPENAI_API_KEY` and `N8N_WEBHOOK_SECRET`. Optionally set `APPLY_TODAY_MODEL`.
3. In the Job Platforms discovery worker, after saving each candidate, POST to
   `/api/internal/apply-today/prepare` with JSON `{"candidateId":"<saved candidate UUID>"}`.
   Supply the configured intake secret in `x-codenativex-intake-key` using a credential or secret variable.
   Run this after persistence and handle its failures separately from discovery.
4. A ready response means the draft is in **Apply Today → Ready to apply**.
   Already tracked records are not overwritten. Missing details or a detected U.S.-only restriction return a review reason.
   If desired, branch on the ready response to notify the team using your existing internal notification channel.

Saved listing text can be stale. Check the original post, eligibility, cost and bid before applying.
The feature does not submit proposals or spend Connects. No Upwork account connection is required.
