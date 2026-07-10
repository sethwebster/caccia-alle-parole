# Svelte → React + Expo Web Migration Documentation

Complete migration plan for converting Caccia alle Parole from SvelteKit to Expo Web with React and NativeWind.

## 📁 Documents

### [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
**Main comprehensive migration plan** (45KB, 1,858 lines)

Complete 10-phase strategy including:
- Detailed architecture translation (Svelte stores → Zustand)
- File-by-file migration guide
- Cloudflare Workers deployment configuration
- Plausible analytics integration
- Vitest + ESLint setup
- Gitflow workflow
- Performance targets and risk mitigation

**Start here** for full understanding of the migration.

### [MIGRATION_QUICK_START.md](./MIGRATION_QUICK_START.md)
**TL;DR quick reference guide** (10KB, 500+ lines)

Quick start with:
- Immediate setup commands
- Architecture comparison table
- Key translation patterns
- Zustand store templates
- Platform-specific code examples
- Troubleshooting guide

**Use this** when you need quick answers during implementation.

### [COMPONENT_MAPPING.md](./COMPONENT_MAPPING.md)
**Line-by-line component translations** (21KB, 800+ lines)

Detailed Svelte → React conversions for:
- WordSearchGame component (657 lines)
- WordleGame component (264 lines)
- All 8 UI components
- Gesture handling (web + native)
- Animation patterns with Reanimated
- Platform-specific implementations

**Reference this** when converting specific components.

### [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)
**Phase-by-phase task tracking** (12KB, 405 lines)

131 specific tasks broken into:
- 10 phases with daily breakdowns
- Checkboxes for progress tracking
- Command examples for each step
- Testing validation points
- Progress metrics

**Use this** to track day-by-day execution.

## 🎯 Migration Summary

- **Timeline:** 3-4 weeks (solo developer)
- **Risk Level:** Low (proven migration path)
- **Bundle Impact:** +150KB gzipped
- **Zero functionality loss**

## 📋 Configuration Decisions (Resolved)

All ambiguities resolved:

1. ✅ **Hosting:** Cloudflare Workers
2. ✅ **Strategy:** Web-first, incremental mobile later
3. ✅ **Analytics:** Plausible (plausible.projects.sethwebster.com)
4. ✅ **Error tracking:** None for now
5. ✅ **Fonts:** System fonts with fallback
6. ✅ **Icons:** Expo Vector Icons
7. ✅ **Testing:** Vitest + React Testing Library
8. ✅ **Linting:** ESLint standards
9. ✅ **Git:** Gitflow workflow
10. ✅ **Data:** Fresh start (no legacy migration)

## 🚀 Quick Start

```bash
# 1. Create new project
npx create-expo-app caccia-parole-expo --template blank-typescript

# 2. Install dependencies
cd caccia-parole-expo
npx expo install expo-router react-native-web react-dom
npm install nativewind@next tailwindcss@4 zustand

# 3. Follow MIGRATION_PLAN.md Phase 1

# 4. Track progress in IMPLEMENTATION_CHECKLIST.md
```

## 📖 Reading Order

1. **MIGRATION_PLAN.md** - Read once for complete understanding
2. **IMPLEMENTATION_CHECKLIST.md** - Open in editor, check off tasks daily
3. **MIGRATION_QUICK_START.md** - Keep open for quick reference
4. **COMPONENT_MAPPING.md** - Reference when converting specific components

## ✅ Plan Status

**100% complete** with zero ambiguities. Ready for immediate execution.
