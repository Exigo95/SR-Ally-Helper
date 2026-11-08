// Regeldaten für die Verbündeten-Schmiede (SR5, Straßengrimoire / Grundregelwerk)
// Hinweis: Die deutschen Begriffe orientieren sich an den Pegasus-Übersetzungen;
// der englische Originalbegriff steht jeweils dabei, damit man nachschlagen kann.

window.SR = (function () {
  // Karmakosten laut Straßengrimoire (Verbündetengeister)
  const COST = {
    perForce: 8,          // Kraft × 8 Karma
    extraForm: 2,         // jede zusätzliche Gestalt
    extraPower: 5,        // jede Kraft über die Gratiskräfte (1 pro Kraftpunkt) hinaus
    extraSkill: 5,        // jede zusätzliche Fertigkeit
    spellKnown: 3,        // Zauber, den der Beschwörer kennt
    spellUnknown: 5,      // Zauber, den der Beschwörer nicht kennt (Formel nötig)
    changeForce: 16       // Ritual der Wandlung: je Kraftpunkt über die Anfangskraft
  };

  // Kräfte, die jeder Verbündete automatisch besitzt
  const BASE_POWERS = [
    { de: 'Astralgestalt', en: 'Astral Form' },
    { de: 'Bannwiderstand', en: 'Banishing Resistance' },
    { de: 'Realistische Gestalt', en: 'Realistic Form' },
    { de: 'Bewusstsein', en: 'Sapience' },
    { de: 'Sinnesverbindung', en: 'Sense Link' }
  ];

  // Gestalt-Kräfte (genau eine)
  const FORMS = {
    materialization: {
      de: 'Materialisierung', en: 'Materialization',
      text: 'Der Verbündete erhält eine Grundgestalt (meist passend zur Tradition). Zusätzliche Gestalten kosten je 2 Karma; der Wechsel ist eine Komplexe Handlung. Materialisiert genießt er Immunität gegen normale Waffen.'
    },
    inhabitation: {
      de: 'Innewohnen', en: 'Inhabitation',
      text: 'Benötigt ein vorbereitetes Gefäß, das vor dem Ritual existieren muss. Der Geist muss sofort Innewohnen einsetzen; das dauert Kraft in Tagen und ist Teil des Rituals (der Beschwörer muss das Gefäß ständig betreuen). Mehrere Gestalten nur, wenn daraus eine echte Gestalt entsteht. Ein innewohnender Verbündeter kann nicht astral projizieren.'
    },
    possession: {
      de: 'Besessenheit', en: 'Possession',
      text: 'Keine eigene materielle Gestalt. Der Verbündete kann aber vorbereitete Gefäße erhalten, die er in Besitz nimmt.'
    }
  };

  // Geisterkräfte (Auswahl für Verbündete)
  // detail: Kraft verlangt eine Festlegung (z. B. Element)
  const ELEMENTS = ['Feuer', 'Elektrizität', 'Kälte', 'Säure', 'Luft', 'Wasser', 'Erde', 'Sonstiges'];
  const POWERS = {
    accident:        { de: 'Unfall', en: 'Accident' },
    animal_control:  { de: 'Tierbeherrschung', en: 'Animal Control', detail: 'text', hint: 'Tierart' },
    binding:         { de: 'Fesseln', en: 'Binding' },
    concealment:     { de: 'Verschleierung', en: 'Concealment' },
    confusion:       { de: 'Verwirrung', en: 'Confusion' },
    divining:        { de: 'Weissagung', en: 'Divining' },
    elemental_attack:{ de: 'Elementarangriff', en: 'Elemental Attack', detail: 'element', needsSkill: 'Exotische Fernkampfwaffe' },
    energy_aura:     { de: 'Energieaura', en: 'Energy Aura', detail: 'element' },
    engulf:          { de: 'Verschlingen', en: 'Engulf', detail: 'element' },
    enhanced_senses: { de: 'Verbesserte Sinne', en: 'Enhanced Senses', detail: 'text', hint: 'z. B. Restlicht, Thermosicht, Geruch' },
    fear:            { de: 'Furcht', en: 'Fear' },
    guard:           { de: 'Schutz', en: 'Guard' },
    influence:       { de: 'Einfluss', en: 'Influence' },
    innate_spell:    { de: 'Angeborener Zauber', en: 'Innate Spell', detail: 'text', hint: 'Zaubername' },
    magical_guard:   { de: 'Magischer Schutz', en: 'Magical Guard', needsSkill: 'Antimagie' },
    movement:        { de: 'Bewegung', en: 'Movement' },
    natural_weapon:  { de: 'Natürliche Waffe', en: 'Natural Weapon', detail: 'text', hint: 'z. B. Klauen, Biss' },
    noxious_breath:  { de: 'Giftiger Atem', en: 'Noxious Breath' },
    psychokinesis:   { de: 'Psychokinese', en: 'Psychokinesis' },
    search:          { de: 'Suche', en: 'Search' },
    shadow_cloak:    { de: 'Schattenmantel', en: 'Shadow Cloak' },
    silence:         { de: 'Stille', en: 'Silence' },
    venom:           { de: 'Gift', en: 'Venom' },
    weather_control: { de: 'Wetterkontrolle', en: 'Weather Control' }
  };

  // Geistertypen mit Standard- und optionalen Kräften (ohne Basis-/Gestaltkräfte)
  const SPIRITS = {
    air:      { de: 'Luftgeist', src: 'GRW',
                std: ['accident', 'concealment', 'confusion', 'engulf', 'movement', 'search'],
                opt: ['elemental_attack', 'energy_aura', 'fear', 'guard', 'noxious_breath', 'psychokinesis'] },
    earth:    { de: 'Erdgeist', src: 'GRW',
                std: ['binding', 'guard', 'movement', 'search'],
                opt: ['concealment', 'confusion', 'engulf', 'elemental_attack', 'fear'] },
    fire:     { de: 'Feuergeist', src: 'GRW',
                std: ['accident', 'confusion', 'elemental_attack', 'energy_aura', 'engulf'],
                opt: ['fear', 'guard', 'noxious_breath', 'search'] },
    water:    { de: 'Wassergeist', src: 'GRW',
                std: ['concealment', 'confusion', 'engulf', 'movement', 'search'],
                opt: ['accident', 'binding', 'elemental_attack', 'energy_aura', 'weather_control'] },
    man:      { de: 'Geist des Menschen', src: 'GRW',
                std: ['accident', 'concealment', 'confusion', 'enhanced_senses', 'guard', 'influence', 'search'],
                opt: ['fear', 'innate_spell', 'movement', 'psychokinesis'] },
    beasts:   { de: 'Tiergeist', src: 'GRW',
                std: ['animal_control', 'enhanced_senses', 'fear', 'movement'],
                opt: ['concealment', 'confusion', 'guard', 'natural_weapon', 'noxious_breath', 'search', 'venom'] },
    guardian: { de: 'Schutzgeist', src: 'SGR',
                std: ['fear', 'guard', 'magical_guard', 'movement'],
                opt: ['animal_control', 'concealment', 'elemental_attack', 'natural_weapon'] },
    guidance: { de: 'Führungsgeist', src: 'SGR',
                std: ['confusion', 'divining', 'guard', 'magical_guard', 'search', 'shadow_cloak'],
                opt: ['engulf', 'enhanced_senses', 'fear', 'influence'] },
    plant:    { de: 'Pflanzengeist', src: 'SGR',
                std: ['concealment', 'engulf', 'guard', 'magical_guard', 'silence'],
                opt: ['accident', 'confusion', 'fear', 'movement', 'noxious_breath', 'search'] },
    task:     { de: 'Aufgabengeist', src: 'SGR',
                std: ['accident', 'binding', 'movement', 'search'],
                opt: ['concealment', 'enhanced_senses', 'influence', 'psychokinesis'] }
  };

  const CATEGORIES = [
    { id: 'kampf', de: 'Kampf' },
    { id: 'wahrnehmung', de: 'Wahrnehmung' },
    { id: 'heilung', de: 'Heilung' },
    { id: 'illusion', de: 'Illusion' },
    { id: 'manipulation', de: 'Manipulation' }
  ];

  // Traditionen: Zuordnung Zauberkategorie → Geistertyp (editierbar in der App)
  const TRADITIONS = {
    hermetic:  { de: 'Hermetische Magie', src: 'GRW', drain: 'Logik + Willenskraft',
                 spirits: { kampf: 'fire', wahrnehmung: 'air', heilung: 'man', illusion: 'water', manipulation: 'earth' } },
    shamanic:  { de: 'Schamanismus', src: 'GRW', drain: 'Charisma + Willenskraft',
                 spirits: { kampf: 'beasts', wahrnehmung: 'water', heilung: 'earth', illusion: 'air', manipulation: 'man' } },
    blackmagic:{ de: 'Schwarze Magie', src: 'SGR', drain: 'Charisma + Willenskraft',
                 spirits: { kampf: 'fire', wahrnehmung: 'water', heilung: 'earth', illusion: 'air', manipulation: 'man' } },
    chaos:     { de: 'Chaosmagie', src: 'SGR', drain: 'Intuition + Willenskraft',
                 spirits: { kampf: 'fire', wahrnehmung: 'earth', heilung: 'air', illusion: 'man', manipulation: 'water' } },
    druid:     { de: 'Druidentum', src: 'SGR', drain: 'Intuition + Willenskraft',
                 spirits: { kampf: 'beasts', wahrnehmung: 'water', heilung: 'plant', illusion: 'air', manipulation: 'earth' } },
    buddhism:  { de: 'Buddhismus', src: 'SGR', drain: 'Intuition + Willenskraft',
                 spirits: { kampf: 'air', wahrnehmung: 'guidance', heilung: 'earth', illusion: 'fire', manipulation: 'water' } },
    custom:    { de: 'Eigene Tradition', src: '—', drain: 'frei wählbar',
                 spirits: { kampf: 'fire', wahrnehmung: 'air', heilung: 'man', illusion: 'water', manipulation: 'earth' } }
  };

  // Fertigkeiten
  const BASE_SKILLS = ['Askennen', 'Astralkampf', 'Wahrnehmung', 'Waffenloser Kampf'];
  const FORBIDDEN_SKILLS = ['Herbeirufen', 'Binden', 'Verbannen'];
  const SKILL_SUGGESTIONS = [
    { name: 'Spruchzauberei', magic: true, note: 'nötig, um gelernte Zauber zu wirken' },
    { name: 'Antimagie', magic: true, note: 'nötig für Magischen Schutz' },
    { name: 'Ritualzauberei', magic: true },
    { name: 'Arkana', magic: true },
    { name: 'Alchemie', magic: true },
    { name: 'Artefakte bauen', magic: true },
    { name: 'Entzaubern', magic: true },
    { name: 'Exotische Fernkampfwaffe', note: 'nötig für Elementarangriff' },
    { name: 'Fliegen', note: 'nur wenn es zur Gestalt passt' },
    { name: 'Laufen' },
    { name: 'Schwimmen' },
    { name: 'Klingenwaffen' },
    { name: 'Knüppel' },
    { name: 'Gymnastik' },
    { name: 'Schleichen' },
    { name: 'Verkleiden' },
    { name: 'Spurenlesen' },
    { name: 'Erste Hilfe' },
    { name: 'Gebräuche' },
    { name: 'Einschüchtern' }
  ];

  const SPELL_CATEGORIES = ['Kampf', 'Wahrnehmung', 'Heilung', 'Illusion', 'Manipulation'];

  return { COST, BASE_POWERS, FORMS, ELEMENTS, POWERS, SPIRITS, CATEGORIES, TRADITIONS,
           BASE_SKILLS, FORBIDDEN_SKILLS, SKILL_SUGGESTIONS, SPELL_CATEGORIES };
})();
