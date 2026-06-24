// Design tokens extracted from "Care for Mutti - Design System.dc.html"
// Palette: warm paper canvas + sage accent. Font: Hanken Grotesk.

export const theme = {

  colors: {
    // Canvas & surfaces
    canvas:          '#e9e7e2', // page / screen background
    surface:         '#fbfaf7', // cards, bottom nav, sheets
    surfaceElevated: '#ffffff', // option cards, inputs
    surfaceNote:     '#f4f1ea', // progress note / inset note
    surfaceInfo:     '#eef1ec', // sage info panel (confirmation, hints)

    // Sage — the single accent; all primary actions live here
    sage:            '#7c9885', // primary buttons, FAB, active checkboxes
    sageDark:        '#5a7060', // text on sage backgrounds, active nav label
    sageMid:         '#9bb0a3', // appointment icon border
    sageLight:       '#b8cabd', // ghost button border, progress bar empty
    sageTint:        '#dfe7e0', // avatar bg, chip selected bg, appointment badge bg

    // Overdue / amber — used only for genuinely overdue items
    overdueFg:       '#9a6f33', // overdue badge text, today section header
    overdueBg:       '#f1e4d2', // overdue badge background, amber avatar bg

    // Waiting / slate — secondary status
    waitingFg:       '#69757f', // waiting badge text
    waitingBg:       '#e2e6ea', // waiting badge background

    // Dividers & borders
    divider:         '#efece6', // row separators, nav border top
    border:          '#e3e0d8', // card borders, input borders
    borderMid:       '#cbc8c1', // device frame, heavier borders

    // Disabled states
    disabledBg:      '#e0ded8',
    disabledFg:      '#b4b1a9',

    // Text
    textPrimary:     '#2f2e2b', // body text, headings
    textSecondary:   '#6f6c65', // subtitles, descriptions
    textMuted:       '#9a978f', // labels, placeholders, timestamps
    textFaint:       '#b4b1a9', // counts, very secondary info
    textHairline:    '#c4c1ba', // chevrons, ornamental elements

    // Semantic aliases used across the codebase
    background:      '#e9e7e2', // alias for canvas (used in navigation theme)
    primary:         '#7c9885', // alias for sage (used in generic button components)
  },

  spacing: {
    xxs:  2,
    xs:   4,
    sm:   6,  // badge gap, chip gap
    md:  12,  // task row vertical padding, component gap
    lg:  18,  // section padding, screen horizontal padding
    xl:  24,
    xxl: 40,
    screen: 18, // standard horizontal screen padding
  },

  fontSize: {
    micro:     11, // uppercase labels, badge text, avatar initials
    small:     12, // timestamps, spec values, secondary counts
    label:     13, // section headers, segmented control, chips
    body:      15, // task titles, primary body text
    subhead:   19, // card/section headings
    title:     23, // screen titles (Tasks, Calendar, etc.)
    display:   34, // design system header — not used in app
  },

  fontWeight: {
    regular: '400',
    medium:  '500', // body text, task titles
    semibold:'600', // labels, captions, segmented control
    bold:    '700', // headings, badge text, button labels
  },

  // Hanken Grotesk via expo-google-fonts (@expo-google-fonts/hanken-grotesk)
  // Fall back to system sans-serif until font loading is wired up.
  fontFamily: {
    sans: 'HankenGrotesk_400Regular',
    sansMedium: 'HankenGrotesk_500Medium',
    sansSemiBold: 'HankenGrotesk_600SemiBold',
    sansBold: 'HankenGrotesk_700Bold',
  },

  letterSpacing: {
    tight:  -0.15, // screen titles
    normal:  0,
    wide:    1.4,  // uppercase micro labels (fontSize 11–12)
    wider:   1.7,  // section rule labels
  },

  borderRadius: {
    badge:   5,  // status badges, small chips
    chip:    9,  // choice chips (recurrence, assignee)
    input:  12,  // note surface, add affordance
    card:   13,  // info panel, task compose sheet
    cardLg: 16,  // option cards, detail sheet
    modal:  20,  // bottom sheets, design system panels
    button: 13,  // primary / dark button
    buttonSm: 10, // ghost / link button
    avatar: 9999, // circle avatars
    fab:    9999, // floating action button (54px circle)
  },

  shadow: {
    // Sage glow — used on FAB and primary button
    sage: {
      shadowColor:   '#7c9885',
      shadowOffset:  { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius:  16,
      elevation:     8,
    },
    // Subtle lift — used on segmented control active pill
    lift: {
      shadowColor:   '#000',
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius:  3,
      elevation:     2,
    },
    // Card shadow — used on phone frame and sheets
    card: {
      shadowColor:   '#3c3830',
      shadowOffset:  { width: 0, height: 18 },
      shadowOpacity: 0.14,
      shadowRadius:  50,
      elevation:     10,
    },
  },

} as const;

export type Theme = typeof theme;
