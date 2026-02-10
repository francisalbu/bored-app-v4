# 🎨 Design System Overhaul - Matching boredtourist.com

## Changes Made

### 1. ✅ Typography System
- **Installed Inter font** (weights: 300, 400, 600, 800, 900)
- Created `constants/typography.ts` with predefined text styles
- Configured font loading in `app/_layout.tsx`

### 2. ✅ Color Palette Update
Updated `constants/colors.ts` to match website vibe:
- **Primary color**: Changed from `#00FF8C` (mint green) to `#CFFF04` (neon lime/chartreuse)
- **Background**: Changed from `#0A0A0A` to pure `#000000` for maximum contrast
- **Card backgrounds**: Darker shades for elevation
- More vibrant, high-contrast scheme matching the website

### 3. 🔄 Component Updates Needed

#### Priority 1 - Core Screens:
- [ ] `app/(tabs)/index.tsx` - Home feed with experience cards
- [ ] `app/(tabs)/explore.tsx` - Explore/search screen  
- [ ] `app/experience/[id].tsx` - Experience details (DONE - loading fix)
- [ ] `app/(tabs)/profile.tsx` - Profile screen

#### Priority 2 - Auth & Booking:
- [ ] `app/auth/login.tsx` - Login screen
- [ ] `app/booking/[id].tsx` - Booking flow
- [ ] `app/booking/payment.tsx` - Payment screen

#### Priority 3 - Components:
- [ ] `components/AuthBottomSheet.tsx` - Auth modal
- [ ] Experience cards styling
- [ ] Button components
- [ ] Input fields

### 4. Design Principles from Website

**Typography:**
- Headlines: Inter Black/ExtraBold (uppercase, high impact)
- Body: Inter Regular (clean, readable)
- Buttons: Inter SemiBold (uppercase, slightly letter-spaced)

**Colors:**
- Black backgrounds (#000000)
- Neon lime accents (#CFFF04) for CTAs and highlights
- High contrast white text
- Minimal use of grays

**Layout:**
- Bold, centered headlines
- Generous whitespace
- Strong visual hierarchy
- Energy and movement

### Next Steps

1. Update home screen (index.tsx) with new typography
2. Refresh explore screen styling
3. Update all buttons to use new style
4. Polish auth screens
5. Test on device

---

**Note**: This is a living document. Update as we make changes!
