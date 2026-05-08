# AI Wardrobe Refactor Survey

## Routes

Current `frontend/app` page routes:

- `/`
- `/ai-demo`
- `/assistant`
- `/closet-analysis`
- `/closet-analysis-new`
- `/dashboard-new`
- `/experience/closet-analysis`
- `/experience/outfit-diary`
- `/experience/smart-wardrobe`
- `/experience/style-profile`
- `/experience/wardrobe-management`
- `/home`
- `/home/third-screen`
- `/landing`
- `/landing-new`
- `/login`
- `/optimized-demo`
- `/outfit-diary`
- `/outfit-diary-new`
- `/privacy`
- `/recommend`
- `/recommend-new`
- `/register`
- `/reset-password`
- `/smart-wardrobe`
- `/style-profile`
- `/style-profile-new`
- `/terms`
- `/try-on`
- `/try-on-new`
- `/ui-demo`
- `/v3`
- `/v3/dashboard`
- `/v3/wardrobe`
- `/wardrobe`
- `/wardrobe-new`

API route:

- `/api/home/current-weather`

## V1 Delete Candidates

Phase 5 removes these V1 route directories:

- `frontend/app/assistant`
- `frontend/app/closet-analysis`
- `frontend/app/home`
- `frontend/app/landing`
- `frontend/app/outfit-diary`
- `frontend/app/recommend`
- `frontend/app/smart-wardrobe`
- `frontend/app/style-profile`
- `frontend/app/try-on`
- `frontend/app/wardrobe`

Phase 5 keeps:

- `frontend/app/v3`
- `frontend/app/v3/dashboard`
- `frontend/app/v3/wardrobe`

## Premium Components

`PremiumButton` is defined in `frontend/components/ui/PremiumButton.tsx`.

Preserved behavior:

- Variants: `primary`, `secondary`, `outline`, `ghost`, `glow-inner`, `glow-outer`
- Pink and peach gradients, white text for filled buttons
- Rounded sizes: `20px`, `28px`, `32px`
- `inline-flex`, `font-medium`, `transition-all duration-300`
- Hover shadow enhancement
- Press scale `0.98`
- Animated inner/outer glow variants

`PremiumTag` is defined in `frontend/components/ui/PremiumTag.tsx`.

Preserved behavior:

- Color variants: `pink`, `purple`, `blue`, `green`, `orange`
- `px-5 py-2.5 rounded-[20px]`
- Border, backdrop blur, `font-medium text-sm`
- Default, selected, hover states
- Hover scale `1.05`
- Press scale `0.95`

## Tokens And Fonts

`frontend/app/layout.tsx` uses `next/font/google` with:

- `Cormorant_Garamond`
- `DM_Sans`

Phase 1 keeps the font choice and adds Chinese fallbacks.

Existing token sources:

- `frontend/app/globals.css`
- `frontend/styles/tokens.css`
- `frontend/styles/design-system.css`

There is no root `frontend/tailwind.config.ts` yet. Phase 1 adds it and maps the new tokens.
