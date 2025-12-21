# Final Step: Deploy Cloud Functions

You have updated the database, but the **Edge Functions** (the code that runs the logic) are likely outdated on the server. This is why the error wasn't saved.

**To fix this, run the following command in your terminal:**

```bash
npx supabase functions deploy check-scheduled-posts --no-verify-jwt
npx supabase functions deploy publish-instagram-post --no-verify-jwt
```

_(If asked for a project, select `jjrfayfncwljjcdwumho`)_

## Why?

- `db push` only updates the database (tables, columns).
- `functions deploy` updates the actual code (TypeScript) that processes the posts.
- Your local code has the error logging logic, but the server doesn't have it yet!
