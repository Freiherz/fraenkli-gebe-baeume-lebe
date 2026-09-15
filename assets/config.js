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
// Replace logos in assets/partners/ (SVG or PNG, transparent background) and
// fill in the descriptions. `url` needs the https:// scheme; `tagline` is
// optional and shown under the name in the expanded panel.
window.PARTNERS = [
  { id: 'bridged', name: 'Bridged', logo: 'assets/partners/bridged.png', url: 'https://www.bridged.ch',
    tagline: {
      de: 'Die Brücke zwischen Hörsaal und Wirtschaft',
      fr: 'Le pont entre l’auditoire et l’économie',
      en: 'The bridge between lecture hall and business',
    },
    description: {
      de: 'Bridged ist mehr als nur eine studentisch geführte Unternehmensberatung an der ZHAW. Wir sind ein student-driven Startup Support – ein Raum, in dem Studierende echtes Unternehmertum üben können.',
      fr: 'Bridged est bien plus qu’un cabinet de conseil géré par des étudiantes et étudiants de la ZHAW. Nous sommes un soutien aux startups porté par les étudiants – un espace où les étudiantes et étudiants peuvent s’exercer au véritable entrepreneuriat.',
      en: 'Bridged is more than a student-run consultancy at ZHAW. We are student-driven startup support – a space where students can practise real entrepreneurship.',
    } },
  { id: 'nakt', name: 'NaKt', logo: 'assets/partners/NaKt.png', url: '',
    description: { de: '[Kurzbeschreibung NaKt]', fr: '[Description NaKt]', en: '[Short description NaKt]' } },
  { id: 'partner-3', name: 'Partner 3', logo: 'assets/partners/partner-3.svg', url: '',
    description: { de: '[Kurzbeschreibung Partner 3]', fr: '[Description partenaire 3]', en: '[Short description partner 3]' } },
  { id: 'partner-4', name: 'Partner 4', logo: 'assets/partners/partner-4.svg', url: '',
    description: { de: '[Kurzbeschreibung Partner 4]', fr: '[Description partenaire 4]', en: '[Short description partner 4]' } },
];
