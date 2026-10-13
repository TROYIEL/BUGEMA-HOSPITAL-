# Staging acceptance checklist

Use separate admin, editor, request-handler and unlabelled accounts. Use only fictional test contact details.

1. Run schema setup twice: both runs finish without changing existing content. Inspect collection permissions: empty; documentSecurity enabled; all indexes available. Inspect private bucket: no public reads.
2. Log in as editor. Create a draft department. Anonymous `/departments` and direct Appwrite GET cannot retrieve it. Preview is visible only inside the authenticated dashboard.
3. Publish the department and load the website in a fresh anonymous session. It appears immediately. Create related service/doctor with a department selection. Verify directory search/filter and individual pages. Set draft/archived and verify disappearance from list, detail URL and sitemap.
4. Upload JPG, PNG, WebP and PDF below 5 MB. Replace an image via its copied URL; require alt text. Reject executable/SVG, oversized files and mismatched signatures. Check no private file endpoint is exposed.
5. As editor, call GET/PATCH `/api/requests/appointments`, GET `/api/requests/enquiries`, and PATCH `/api/access` directly. Expect 403. Request handlers must receive 403 for content/access endpoints. Anonymous callers must receive 401. Test current role revocation with an already-open session.
6. Submit appointment with completed Turnstile, consent, valid contact, published preferences and a future date. Confirm the private Appwrite record and user success message. Repeat in ten minutes: 429. Invalid/honeypot/security-token submissions must be rejected. Validate published doctor/department pairing. Verify failure states for disabled Appwrite and wrong Origin.
7. Review as authorised request staff. Add private notes and advance New, Contacted, Confirmed, Completed/Cancelled. Neither records nor notes must be anonymously readable. Mark enquiries read and verify real dashboard counts.
8. Change staff access as admin. Self-role mutation is refused. Editors can archive but cannot permanently delete. Confirm destructive dialogs and audit entries with actor and target. An audit entry describes an attempted operation; examine the target record to confirm success.
9. Logout; reuse old cookie against Appwrite and application: rejected. Check production cookie Secure, HttpOnly, SameSite=Lax, bounded expiry. Test repeated failed login with Turnstile and cooldown.
10. Test widths 375, 768 and 1440 pixels, keyboard-only navigation, visible focus, labelled controls, long email/phone/body strings, reduced motion, error/loading/empty states and draft preview. Check all public pages, internal links and download links. Confirm real map address with hospital staff.
11. Approve privacy retention/contact responsibilities, opening/visiting hours, emergency designation and clinical statements before enabling production submissions. Replace illustrative photography with approved hospital photos.
