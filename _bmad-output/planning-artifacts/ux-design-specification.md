---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ["prd.md", "product_context.md"]
---

# UX Design Specification co-founder

**Author:** Oswald
**Date:** 2026-02-01

---

## Executive Summary

### Project Vision
Une plateforme web et PWA "Premium" pour le Cameroun qui professionnalise la recherche de co-fondateurs. Elle repose sur un modèle Freemium sécurisé par l'IA et une esthétique "Glassmorphic" qui inspire la confiance.

### Target Users
1.  **Project Founders** : Visionnaires, pressés, prêts à payer pour la qualité.
2.  **Candidates** : Talents techniques/business cherchant à valider leurs compétences.
3.  **System Admin** : Le "Gardien". A besoin d'une interface ultra-sécurisée et distincte pour modérer sans risque d'erreur.

### Key Design Challenges
1.  **La "Preuve de Valeur" (The Hook)** : Comment convaincre de payer *avant* de voir le contact ?
    *   *Solution :* Mettre en avant les "Hard Skills" et un "Teaser Bio" rédigé par l'IA qui prouve la compétence sans donner l'identité.
2.  **Perception de Sécurité** : L'utilisateur doit sentir que ses données sont blindées (ex: Cadenas visuels, Badges "Vérifié par IA").
3.  **Performance Mobile (Cameroun)** : Le "Glassmorphism" doit être léger (CSS pur) pour ne pas laguer sur les téléphones modestes.

### Design Opportunities
*   **Onboarding "Magique"** : Utiliser l'IA pour pré-remplir les profils (LinkedIn import) et réduire la friction d'inscription.
*   **Gamification de la Confiance** : Jauge de "Complétude du Profil" qui incite à donner plus d'infos pour être mieux classé.

## Core User Experience

### Defining Experience
The heartbeat of the app is **"The Reveal"**. Everything leads to the moment a Founder decides "This candidate is worth paying for" and clicks unlock. This action must feel weighty but frictionless.

### Platform Strategy
*   **Primary:** Mobile Web (PWA). 80%+ traffic will likely be mobile.
*   **Constraint:** "Glassmorphism" must be optimized. On low-end devices, we degrade to solid, semi-transparent colors to keep 60fps scrolling.
*   **Admin:** Desktop-first focus for complex data grids, but mobile-accessible for emergencies.

### Effortless Interactions
*   **Auto-Save Everywhere:** Founders writing pitches often get interrupted. Drafts must save locally instantly.
*   **Smart Inputs:** Instead of "Select Skills", type "React" and it smart-matches "React Native", "Next.js", etc.

### Critical Success Moments
*   **The "Trust" Badge:** When a profile goes from "Pending" to "Verified by AI", the user should get a notification that feels like a reward.
*   **The Payment Success:** It shouldn't just say "Paid". It should explode with confetti and immediately show the phone number/email with a "Copy" button.

### Experience Principles
1.  **Trust by Default:** If it's not verified, it doesn't show. If it's not secure, it doesn't happen.
2.  **Performance is Luxury:** A slow "premium" app feels cheap. Speed > Blur effects.
3.  **Respect the Hustle:** Founders and Candidates are busy. Don't ask for data we can infer or import.

## Desired Emotional Response

### Primary Emotional Goals
**"Professional Confidence"**.
Users (Camerounais) often mistrust local platforms ("Is this legit?"). Co-founder must make them feel: *"This is serious business. The people here are verified pros."*

### Micro-Emotions
*   **Skepticism → Reassurance:** High-end visuals, no ads, clean typography.
*   **Anxiety → Relief:** Clear "Secure Transaction" animations during payment.
*   **Pride:** Candidates should feel proud to share their Co-founder link (Digital Business Card).
*   **Control (Admin):** The Admin feels like a pilot in a cockpit. Dark mode, high-contrast alerts.

### Design Implications
*   **Stability over Hype:** Use steady animations, not jumpy ones.
*   **Color Psychology:** Deep Blues and Teals for stability, avoiding "Danger Red" unless it's a critical error.

## UX Pattern Analysis & Inspiration

### Transferable UX Patterns
*   **LinkedIn Identity Header:** Standardization of Name/Photo/Headline to build professional trust.
*   **Dating App Card Decks:** High-fidelity "Card" discovery for candidates instead of boring lists.
*   **Fintech Glass:** Frosted glass aesthetic for premium feel, borrowed from banking/crypto apps.

### Anti-Patterns to Avoid
*   **Infinite Scroll (without footer):** Bad for trust. Users need to see footers with "About Us" / "Legal".
*   **Mystery Meat Navigation:** All icons must have labels.

## Design System Recommendation

### Selected Stack
**shadcn/ui + Tailwind CSS + Framer Motion**

### Why?
*   **shadcn/ui:** Best-in-class accessibility and customization. It's not a library, but copy-paste components we can modify for our "Glass" look.
*   **Tailwind CSS:** Essential for performance and rapid styling of the glassmorphism utilities (`backdrop-blur`).
*   **Framer Motion:** For the "smooth, professional" animations (Confetti, Modals) without heavy load.

### Visual Identity (Brief)
*   **Font:** Inter (Clean, legible, modern).
*   **Radius:** `rounded-xl` (Friendly but pro).
*   **Glass Strategy:** Use `bg-white/10` with `backdrop-blur-md` for cards. Fallback to `bg-slate-900` on low-power devices.
