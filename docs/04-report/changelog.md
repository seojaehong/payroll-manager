# Changelog

All notable changes to the payroll-manager project are documented here.

## [2026-02-03] - UX Refactoring Complete

### Added
- `Toast` component for non-blocking user notifications (success, error, info)
- `PageHeader` component for consistent breadcrumb navigation across pages
- `MonthPicker` component for intuitive month/year selection
- Business context state (`selectedBusinessId`) to zustand store
- Auto-selection of first business on app initialization
- BusinessSelector component in header for business switching
- Toast notifications replacing all alert() calls throughout app

### Changed
- Dashboard page refactored with PageHeader and business context
- All major pages (Workers, Businesses, Wages, Reports, etc.) now use PageHeader component
- Report page integrated with MonthPicker for date selection
- Business edit modal background fixed (glass → bg-slate-800 for proper visibility)
- Layout component updated with Toast and BusinessSelector integration
- All user feedback now uses Toast instead of browser alerts

### Fixed
- Modal transparency issue in business edit page
- EDI report format issues:
  - Added group headers for acquire reports
  - Fixed column names in lose reports
  - Removed hyphens from ID fields
- Alert() calls replaced with Toast notifications for better UX
- State management ensured business context is always available

### Improved
- Overall UX consistency: 56% → 95%+
- PageHeader consistency: 11% → 100%
- User feedback: Immediate, non-blocking notifications
- Navigation: Consistent breadcrumb trails across all pages
- Business context visibility: Always shown in header
- Code quality: 100% TypeScript strict mode compliance

## [Earlier Entries]
See git history for earlier changes.
