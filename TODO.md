# E-FIR Module Implementation TODO

## Plan Overview
Implement full FIR filing with complainant details, auto FIR#, file upload, OTP confirmation, e-signature. Remove existing E-FIR profile code.

## Steps (to complete iteratively):

- [ ] 1. Update `prisma/schema.prisma`: Add FIR and Otp models, remove E-FIR fields from User.
- [ ] 2. Update `prisma/seed.ts`: Adjust for schema changes, add demo FIR data.
- [ ] 3. Update `src/app/api/user/fir/route.ts`: Full POST handler with auth, Zod, Prisma save, file upload to public/uploads, OTP generate/save.
- [ ] 4. Create `src/app/api/user/fir/verify/route.ts`: PATCH for OTP verification.
- [x] 5. Enhance `src/app/dashboard/user/fir/page.tsx`: Add complainant fields, multi-file, 2-step form (submit -> OTP -> verify/sign).
- [ ] 6. Update `src/app/dashboard/user/fir/success/page.tsx`: Fetch and display full FIR details.
- [ ] 7. Remove/disable `src/app/api/user/efir/route.ts`.
- [ ] 8. Run `npx prisma db push && npx prisma generate && npm run db:seed`.
- [ ] 9. Test FIR flow.

Progress tracked here after each step.
