# Definition of Done

Before any feature or screen correction is merged, it must pass this strict checklist:

- [ ] **Full source file read:** The canonical design file under `marg-design-system/project/ui_kits/app/*.jsx` was read line-by-line before writing any code.
- [ ] **Real data wired everywhere:** Zero hardcoded mock arrays or fake display variables. Everything maps to real Supabase tables or derived state.
- [ ] **Every judgment call disclosed:** Any deviations from the design (e.g. dropping a button, marking a feature "coming soon") are explicitly noted in the PR description.
- [ ] **Live-verified in an actual browser:** The feature was run locally and the specific buttons/flows clicked are listed in the PR description.
- [ ] **Typecheck clean:** `npm run build` or `tsc` shows no TypeScript errors for the changed files.
- [ ] **Production build clean:** The Next.js production build succeeds without static generation errors.
- [ ] **No orphaned components:** Old mock components, duplicated views, or unused layout wrappers have been permanently deleted, not just commented out.
