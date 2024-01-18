# Changelog of the Coverflow Alt-Tab Extension

## [Coverflow Alt-Tab 70](https://github.com/dmo60/CoverflowAltTab/releases/tag/v70)

**Release Date:** 2023-12-27

#### Summary of Changes
* Ignore built files by @QuentiumYT in https://github.com/dmo60/CoverflowAltTab/pull/211

* Allow attached icons in any mode as an option, not just on app switcher.

* Broke up app switcher tint color into a color and a blend setting
instead of a color with alpha.

* Saved background color in a setting so it can be used in prefs.js to set
the tint color.

* Just one size for attached and overlay icons instead of sizes for each.

* Maybe better placement of coverflow side previews when
preview_to_monitor_ratio gets small. Scale the distance from the
middle preview based on it.

* Listen for gnome-shell theme changes and update the background
color setting to match the new theme.

* Reorganized preferences. Fixed some subtle bugs.

* Some code cleanup.

* Added github and paypal to preferences donation page.
* Added some logic to get attached icons to fade in / out correctly in timeline switcher.
* Minor fix for overlay icon going  behind previews in timeline switcher.
 
**Full Changelog**: https://github.com/dmo60/CoverflowAltTab/compare/v69...v70

## [Coverflow Alt-Tab 69](https://github.com/dmo60/CoverflowAltTab/releases/tag/v69)

**Release Date:** 2023-11-23

#### Summary of Changes

- Found a trick to make off-center monitor windows redraw without artifacts.
- Re-introduced the timeline switcher.
- Added optional icons over the previews in application switcher mode.

**Full Changelog**: https://github.com/dmo60/CoverflowAltTab/compare/v68...v69

## [Coverflow Alt-Tab 68](https://github.com/dmo60/CoverflowAltTab/releases/tag/v68)

**Release Date:** 2023-11-10

#### Summary of Changes

- GNOME 45 support
- Added sub-switchers when in application switcher mode
- Added initial support for multi-touch swiping (tested with an apple magic trackpad)
- Removed Timeline switcher (too hard to maintain, for now)
- Changed the flip animation to just move windows from one side to the other
- Files cleanup and improved make processes
- Added Polish translation
- Added Optional carousel mode
- Preferences reorganization
- Added blur, desaturate, glitch, and colorize effects on application switcher while subswitcher active
- Added Spanish translation
- Updated Turkish translation
- Adopting version numbering that matches those versions assigned by the official extension website
