// Site configuration.

// URL encoded in the TWINT QR code. On phones the QR (and an "open TWINT"
// button) link here so the TWINT app opens directly. Empty = plain image.
window.DONATE_URL = '';

// Team members shown in the About card. An empty url renders the name as
// plain text instead of a link.
window.TEAM = [
  { name: 'Kelly Ejiofor', url: '' },
  { name: 'Eric Scherrer', url: '' },
  { name: 'Michael Freiherz', url: '' },
];

// Supporting organisations, shown between the donate and about sections.
// Replace logos in assets/partners/ (SVG or PNG, roughly 5:2, transparent
// background) and fill in the descriptions; url is optional.
window.PARTNERS = [
  { id: 'bridged', name: 'Bridged', logo: 'assets/partners/bridged.png', url: '',
    description: { de: '[Kurzbeschreibung Bridged]', fr: '[Description Bridged]', en: '[Short description Bridged]' } },
  { id: 'partner-2', name: 'Partner 2', logo: 'assets/partners/partner-2.svg', url: '',
    description: { de: '[Kurzbeschreibung Partner 2]', fr: '[Description partenaire 2]', en: '[Short description partner 2]' } },
  { id: 'partner-3', name: 'Partner 3', logo: 'assets/partners/partner-3.svg', url: '',
    description: { de: '[Kurzbeschreibung Partner 3]', fr: '[Description partenaire 3]', en: '[Short description partner 3]' } },
  { id: 'partner-4', name: 'Partner 4', logo: 'assets/partners/partner-4.svg', url: '',
    description: { de: '[Kurzbeschreibung Partner 4]', fr: '[Description partenaire 4]', en: '[Short description partner 4]' } },
];
