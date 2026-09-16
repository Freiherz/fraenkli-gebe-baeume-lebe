// Site configuration.

// The hero donate button opens this Payrexx page (index.html carries the
// same href statically; keep both in sync).
window.CTA_URL = 'https://bridged.payrexx.com/pay?qrid=b5263244-d60f-4304-a79f-d53c287d6970#cddb5a90ceee104a7f83c2cdf41bf773dd79cf8a#';

// Clicking the QR image opens this Payrexx page (index.html carries the same
// href statically; keep both in sync).
window.QR_LINK = 'https://bridged.payrexx.com/pay?qrid=b8ad2ff0-9c12-4aa9-8f43-ad575dbcc04a';

// Trees planted so far — shown above the countdown. Static for now: update
// by hand as donations come in.
window.TREES_PLANTED = 18;

// Team members shown in the About card. An empty url renders the name as
// plain text instead of a link.
window.TEAM = [
  { name: 'Kelly Ejiofor', url: 'https://www.linkedin.com/in/kelly-ejiofor/' },
  { name: 'Eric Scherrer', url: 'https://www.linkedin.com/in/eric-scherrer-b87355149/' },
  { name: 'Michael Freiherz', url: 'https://www.linkedin.com/in/michael-freiherz/' },
];

// Supporting organisations, shown between the donate and about sections.
// Replace logos in assets/partners/ (SVG or PNG, transparent background) and
// fill in the descriptions. `url` needs the https:// scheme; `tagline` is
// optional and shown under the name in the expanded panel.
window.PARTNERS = [
  { id: 'bridged', name: 'Bridged', logo: 'assets/partners/bridged.png', url: 'https://www.bridged.ch/de/studierende',
    tagline: {
      de: 'Die Brücke zwischen Hörsaal und Wirtschaft',
      fr: 'Le pont entre l’auditoire et l’économie',
      en: 'Between lecture hall and the world of business',
    },
    description: {
      de: 'Bridged ist mehr als nur eine studentisch geführte Unternehmensberatung an der ZHAW. Wir sind ein student-driven Startup Support – ein Raum, in dem Studierende echtes Unternehmertum üben können. Du willst anpacken und Zukunft gestalten? Schreib uns, wir freuen uns auf dich.',
      fr: 'Bridged est bien plus qu’un cabinet de conseil géré par des étudiantes et étudiants de la ZHAW. Nous sommes un soutien aux startups porté par les étudiants – un espace où les étudiantes et étudiants peuvent s’exercer au véritable entrepreneuriat. Tu veux mettre la main à la pâte et façonner l’avenir ? Écris-nous, nous nous réjouissons de faire ta connaissance.',
      en: 'Bridged is more than a student-run consultancy at ZHAW. We are student-driven startup support – a space where students can practise real entrepreneurship. Want to roll up your sleeves and shape the future? Drop us a line – we look forward to meeting you.',
    } },
  { id: 'nakt', name: 'NaKt', logo: 'assets/partners/NaKt.png', url: 'https://alias-zhaw.ch/kommissionen/nakt/',
    tagline: {
      de: 'Die Nachhaltigkeitskommission der Studierenden der ZHAW.',
      fr: 'La commission de durabilité des étudiantes et étudiants de la ZHAW.',
      en: 'The sustainability commission of the students of the ZHAW.',
    },
    description: {
      de: 'Bist du bereit, deine Umweltbewusstsein-Stricknadeln auszupacken, deine Gedankenrecyclinganlage in Gang zu setzen und mit uns auf eine Reise zu gehen, bei der wir die Welt ein bisschen grüner, gesünder und fröhlicher machen? Bei „NaKt“ geht es nicht nur um grüne Daumen, sondern auch um grüne Herzen. Wir organisieren Veranstaltungen, die nicht nur gut für die Erde sind, sondern auch deine Seele zum Lächeln bringen. Von Kleidertauschpartys, bei denen du deinem Schrank eine nachhaltige Frischekur verleihen kannst, bis hin zu Filmabenden, die dich zum Nachdenken anregen werden. Und vergiss nicht unsere legendären Poetry Slams, bei denen wir Nachhaltigkeit in Worte kleiden und das Publikum zum Staunen bringen.',
      fr: 'Prêt·e à sortir tes aiguilles à tricoter de la conscience écologique, à mettre en marche ta station de recyclage des idées et à partir avec nous en voyage pour rendre le monde un peu plus vert, plus sain et plus joyeux ? Chez « NaKt », il ne s’agit pas seulement d’avoir la main verte, mais aussi le cœur vert. Nous organisons des événements qui font du bien à la planète et font sourire ton âme : des trocs de vêtements pour offrir une cure de fraîcheur durable à ta garde-robe, des soirées cinéma qui donnent à réfléchir, sans oublier nos légendaires poetry slams, où nous mettons la durabilité en mots et émerveillons le public.',
      en: 'Are you ready to unpack your environmental awareness knitting needles, set your mind recycling machine in motion and join us on a journey to make the world a little greener, healthier and happier? NaKt is not just about green thumbs, but also about green hearts. We organize events that are not only good for the earth, but also make your soul smile. From clothes swap parties where you can give your wardrobe a sustainable makeover to movie nights that will make you think. And don’t forget our legendary poetry slams, where we put sustainability into words and amaze the audience.' } },
  { id: 'alias', name: 'Alias', logo: 'assets/partners/alias.png', url: 'https://alias-zhaw.ch/',
    tagline: {
      de: 'Studierende der ZHAW',
      fr: 'Les étudiantes et étudiants de la ZHAW',
      en: 'Students of the ZHAW',
    },
    description: {
      de: 'Alias ist das offizielle studentische Mitwirkungsorgan der Zürcher Hochschule für Angewandte Wissenschaften (ZHAW). Wir setzen uns für die Interessen der Studierenden ein und gestalten aktiv das Hochschulleben mit. Wir haben die Möglichkeit zur Mitsprache auf verschiedenen Ebenen. Wir führen zum Beispiel regelmässige Gespräche mit den Studiengangs- und Departementsleitungen. Auch auf Hochschulleitungsebene haben wir die Möglichkeit zur Mitsprache. Somit sind wir auch das Sprachrohr der Studierenden und helfen gerne bei Anliegen und Problemen.',
      fr: 'Alias est l’organe officiel de participation étudiante de la Haute école zurichoise des sciences appliquées (ZHAW). Nous défendons les intérêts des étudiantes et étudiants et participons activement à la vie de la haute école. Nous avons voix au chapitre à différents niveaux : nous menons par exemple des entretiens réguliers avec les directions de filière et de département, et nous pouvons aussi nous exprimer au niveau de la direction de la haute école. Nous sommes ainsi le porte-parole des étudiantes et étudiants et aidons volontiers en cas de demandes ou de problèmes.',
      en: 'Alias is the official student representative body of the Zurich University of Applied Sciences (ZHAW). We stand up for the interests of students and play an active role in shaping university life. We have the opportunity to have a say at various levels. For example, we hold regular discussions with the heads of degree programmes and departments. We also have the opportunity to have a say at university management level. This means that we are also the students’ mouthpiece and are happy to help with concerns and problems.' } },
  { id: 'zhaw-entrepreneurship', name: 'ZHAW Entrepreneurship', logo: 'assets/partners/zhaw-entrepreneurship.svg', url: 'https://www.entrepreneurship.zhaw.ch/',
    tagline: {
      de: 'Dein #1 Partner für unternehmerischen Fortschritt.',
      fr: 'Ton partenaire n° 1 pour ton progrès entrepreneurial.',
      en: 'Your #1 partner for your entrepreneurial progress.',
    },
    description: {
      de: 'Erhalte kostenlosen Zugang zu Ressourcen, Inspirationen und der Unterstützung, die du benötigst, um deine unternehmerische Karriere anzukurbeln oder voranzutreiben. Bleib auf dem Laufenden und folge uns für alle Neuigkeiten rund um unsere unternehmerischen Programme, Events, Kurse und Aktivitäten.',
      fr: 'Accède gratuitement aux ressources, à l’inspiration et au soutien dont tu as besoin pour lancer ou faire avancer ta carrière entrepreneuriale. Reste informé·e et suis-nous pour toutes les nouveautés concernant nos programmes, événements, cours et activités entrepreneuriales.',
      en: 'Get free access to resources, inspiration, and the support you need to kickstart or boost your entrepreneurial career. Stay up to date and follow us for all the news around our entrepreneurial programs, events, courses, and activities.' } },
];
