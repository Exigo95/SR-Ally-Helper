// Regeldaten für die Verbündeten-Schmiede (SR5, Straßengrimoire / Grundregelwerk)
// verified: true  = Namen, Kräfte und Attributsmodifikatoren stammen aus dem Straßengrimoire (S. 223 ff.) bzw. dem Grundregelwerk (S. 302 f.)
// verified: false = aus dem Gedächtnis, bitte mit dem Buch abgleichen (derzeit keiner)

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
    { de: 'Astrale Gestalt', en: 'Astral Form' },
    { de: 'Verbannungsresistenz', en: 'Banishing Resistance' },
    { de: 'Realistische Gestalt', en: 'Realistic Form' },
    { de: 'Bewusstsein', en: 'Sapience' },
    { de: 'Sinnesverbindung', en: 'Sense Link' }
  ];

  // Gestalt-Kräfte (genau eine)
  const FORMS = {
    materialization: {
      de: 'Materialisierung', en: 'Materialization',
      text: 'Der Verbündete erhält eine Grundgestalt (meist passend zur Tradition). Zusätzliche Gestalten kosten je 2 Karma; der Wechsel ist eine Komplexe Handlung. Materialisiert besitzt er Immunität gegen Normale Waffen.'
    },
    inhabitation: {
      de: 'Bewohnung', en: 'Inhabitation',
      text: 'Der Geist verschmilzt dauerhaft mit einem vorbereiteten Gefäß in einem Magischen Refugium (Kraftstufe mindestens so hoch wie seine eigene). Das dauert Kraft in Tagen und ist Teil des Rituals; der Beschwörer muss das Gefäß ständig betreuen. Vergleichende Probe Kraft × 2 gegen Willenskraft + Intuition des Gefäßes (unbelebt: Objektwiderstand), der Beschwörer kann Binden als Bonus auf eine Seite legen. Ergebnis: Wahre Gestalt, Mischgestalt oder Fleischgestalt. Ein bewohnender Verbündeter kann nicht astral projizieren.'
    },
    possession: {
      de: 'Besessenheit', en: 'Possession',
      text: 'Keine eigene materielle Gestalt. Der Geist übernimmt vorübergehend ein Gefäß (Probe Kraft × 2 gegen Intuition + Willenskraft des Gefäßes bzw. Objektwiderstand; ein vorbereitetes Gefäß gibt +6 Würfel). Gefäße können für den Verbündeten vorbereitet werden.'
    }
  };

  const ELEMENTS = ['Feuer', 'Elektrizität', 'Kälte', 'Säure', 'Luft', 'Wasser', 'Erde', 'Schadstoff', 'Strahlung', 'Sonstiges'];

  // Geisterkräfte (ohne Basis- und Gestaltkräfte)
  // detail: Kraft verlangt eine Festlegung · needsSkill: setzt eine Fertigkeit voraus · src: SGR = neu im Straßengrimoire
  const POWERS = {
    accident:        { de: 'Unfall', en: 'Accident' },
    animal_control:  { de: 'Tierbeherrschung', en: 'Animal Control', detail: 'text', hint: 'Tierart' },
    binding:         { de: 'Bindung', en: 'Binding' },
    concealment:     { de: 'Verschleierung', en: 'Concealment' },
    confusion:       { de: 'Verwirrung', en: 'Confusion' },
    divining:        { de: 'Weissagung', en: 'Divining' },
    elemental_attack:{ de: 'Elementarer Angriff', en: 'Elemental Attack', detail: 'element', needsSkill: 'Exotische Fernkampfwaffe' },
    energy_aura:     { de: 'Energieaura', en: 'Energy Aura', detail: 'element' },
    engulf:          { de: 'Verschlingen', en: 'Engulf', detail: 'element' },
    enhanced_senses: { de: 'Gesteigerte Sinne', en: 'Enhanced Senses', detail: 'text', hint: 'Gehör, Geruchssinn, Infrarotsicht oder Restlichtverstärkung' },
    fear:            { de: 'Grauen', en: 'Fear' },
    guard:           { de: 'Schutz', en: 'Guard' },
    influence:       { de: 'Einfluss', en: 'Influence' },
    innate_spell:    { de: 'Natürlicher Zauberspruch', en: 'Innate Spell', detail: 'text', hint: 'Zaubername (ein dem Beschwörer bekannter Zauber, Kraft höchstens Magie des Geistes)', needsSkill: 'Spruchzauberei' },
    magical_guard:   { de: 'Magischer Schutz', en: 'Magical Guard', needsSkill: 'Antimagie' },
    movement:        { de: 'Bewegung', en: 'Movement' },
    natural_weapon:  { de: 'Natürliche Waffe', en: 'Natural Weapon', detail: 'text', hint: 'z. B. Klauen, Biss (Geist des Tieres: Schaden = Kraft, körperlich, DK –)' },
    noxious_breath:  { de: 'Gifthauch', en: 'Noxious Breath', needsSkill: 'Exotische Fernkampfwaffe' },
    psychokinesis:   { de: 'Psychokinese', en: 'Psychokinesis' },
    search:          { de: 'Suche', en: 'Search' },
    shadow:          { de: 'Schatten', src: 'SGR' },
    silence:         { de: 'Stille', en: 'Silence' },
    skill_power:     { de: 'Fertigkeit', en: 'Skill', detail: 'text', hint: 'welche Fertigkeit (nach Wahl des Beschwörers)' },
    venom:           { de: 'Gift', en: 'Venom' },
    weather_control: { de: 'Wetterbeherrschung', en: 'Weather Control' },
    // Neue Geisterkräfte im Straßengrimoire (S. 224 ff.)
    anaphylaxis:     { de: 'Anaphylaxie', src: 'SGR' },
    astral_gate:     { de: 'Astrales Tor', src: 'SGR' },
    aura_masking:    { de: 'Auramaskierung', src: 'SGR' },
    desire_mirror:   { de: 'Begierdenspiegelung', src: 'SGR' },
    devour:          { de: 'Fressen', src: 'SGR' },
    earthquake:      { de: 'Erdbeben', src: 'SGR' },
    energy_drain:    { de: 'Energieentzug', src: 'SGR' },
    hardening:       { de: 'Härtung', src: 'SGR' },
    mutagen:         { de: 'Mutagen', src: 'SGR' },
    pestilence:      { de: 'Pestilenz', src: 'SGR' },
    power_transfer:  { de: 'Kraftübertragung', src: 'SGR' },
    sonic_blast:     { de: 'Schallentladung', src: 'SGR' },
    storm:           { de: 'Sturm', src: 'SGR' },
    swarm_mind:      { de: 'Schwarmbewusstsein', src: 'SGR' },
    telepathy:       { de: 'Telepathie', src: 'SGR' },
    death_aura:      { de: 'Todesaura', src: 'SGR' }
  };

  // Geistertypen
  // mods: Attributsmodifikatoren relativ zur Kraftstufe (K G R S W L I C), ini: Zuschlag auf (Kraft × 2)
  // std = "Kräfte" des Typs, opt = "Zusätzliche Kräfte" (jeweils ohne Basis- und Gestaltkräfte)
  const SPIRITS = {
    air:      { de: 'Luftgeist', src: 'GRW', verified: true,
                mods: { K: -2, G: 3, R: 4, S: -3, W: 0, L: 0, I: 0, C: 0, ini: 4 },
                skills: ['Askennen', 'Astralkampf', 'Exotische Fernkampfwaffe', 'Laufen', 'Waffenloser Kampf', 'Wahrnehmung'],
                special: 'Sprinten: +10 Meter pro Erfolg',
                std: ['movement', 'search', 'accident', 'concealment', 'engulf', 'confusion'],
                opt: ['elemental_attack', 'energy_aura', 'noxious_breath', 'fear', 'psychokinesis', 'guard'] },
    earth:    { de: 'Erdgeist', src: 'GRW', verified: true,
                mods: { K: 4, G: -2, R: -1, S: 4, W: 0, L: -1, I: 0, C: 0, ini: -1 },
                skills: ['Askennen', 'Astralkampf', 'Exotische Fernkampfwaffe', 'Waffenloser Kampf', 'Wahrnehmung'],
                std: ['movement', 'binding', 'guard', 'search'],
                opt: ['elemental_attack', 'fear', 'concealment', 'engulf', 'confusion'] },
    fire:     { de: 'Feuergeist', src: 'GRW', verified: true,
                mods: { K: 1, G: 2, R: 3, S: -2, W: 0, L: 0, I: 1, C: 0, ini: 3 },
                skills: ['Askennen', 'Astralkampf', 'Exotische Fernkampfwaffe', 'Laufen', 'Waffenloser Kampf', 'Wahrnehmung'],
                special: 'Sprinten: +5 Meter pro Erfolg',
                weakness: 'Allergie (Wasser, schwer)',
                std: ['elemental_attack', 'energy_aura', 'accident', 'engulf', 'confusion'],
                opt: ['noxious_breath', 'fear', 'guard', 'search'] },
    water:    { de: 'Wassergeist', src: 'GRW', verified: true,
                mods: { K: 0, G: 1, R: 2, S: 0, W: 0, L: 0, I: 0, C: 0, ini: 2 },
                skills: ['Askennen', 'Astralkampf', 'Exotische Fernkampfwaffe', 'Waffenloser Kampf', 'Wahrnehmung'],
                special: 'bewegt sich im Wasser doppelt so schnell',
                weakness: 'Allergie (Feuer, schwer)',
                std: ['movement', 'search', 'concealment', 'engulf', 'confusion'],
                opt: ['binding', 'elemental_attack', 'energy_aura', 'guard', 'accident', 'weather_control'] },
    man:      { de: 'Geist des Menschen', src: 'GRW', verified: true,
                mods: { K: 1, G: 0, R: 2, S: -2, W: 0, L: 0, I: 1, C: 0, ini: 2 },
                skills: ['Askennen', 'Astralkampf', 'Spruchzauberei', 'Waffenloser Kampf', 'Wahrnehmung'],
                std: ['influence', 'guard', 'search', 'accident', 'concealment', 'confusion'],
                opt: ['movement', 'fear', 'innate_spell', 'psychokinesis'] },
    beasts:   { de: 'Geist des Tieres', src: 'GRW', verified: true,
                mods: { K: 2, G: 1, R: 0, S: 2, W: 0, L: 0, I: 0, C: 0, ini: 0 },
                skills: ['Askennen', 'Astralkampf', 'Waffenloser Kampf', 'Wahrnehmung'],
                std: ['movement', 'fear', 'animal_control'],
                opt: ['venom', 'noxious_breath', 'natural_weapon', 'guard', 'search', 'concealment', 'confusion'] },
    // --- geprüft: Straßengrimoire S. 223 f. ---
    guardian: { de: 'Beschützergeist', src: 'SGR', verified: true,
                mods: { K: 1, G: 2, R: 3, S: 2, W: 0, L: 0, I: 0, C: 0, ini: 3 },
                skills: ['Antimagie', 'Askennen', 'Astralkampf', 'Exotische Fernkampfwaffe', 'Klingenwaffen', 'Knüppel', 'Waffenloser Kampf', 'Wahrnehmung'],
                std: ['movement', 'fear', 'magical_guard', 'guard'],
                opt: ['elemental_attack', 'natural_weapon', 'skill_power', 'psychokinesis', 'animal_control', 'concealment'] },
    helper:   { de: 'Helfergeist', src: 'SGR', verified: true,
                mods: { K: 0, G: 0, R: 2, S: 2, W: 0, L: 0, I: 0, C: 0, ini: 2 },
                skills: ['Askennen', 'Astralkampf', 'Handwerk', 'Waffenloser Kampf', 'Wahrnehmung'],
                std: ['movement', 'binding', 'search', 'accident'],
                opt: ['influence', 'skill_power', 'enhanced_senses', 'psychokinesis', 'concealment'] },
    plant:    { de: 'Pflanzengeist', src: 'SGR', verified: true,
                mods: { K: 2, G: -1, R: 0, S: 1, W: 0, L: -1, I: 0, C: 0, ini: 0 },
                skills: ['Antimagie', 'Askennen', 'Astralkampf', 'Exotische Fernkampfwaffe', 'Waffenloser Kampf', 'Wahrnehmung'],
                std: ['fear', 'magical_guard', 'guard', 'silence', 'concealment', 'engulf'],
                opt: ['movement', 'noxious_breath', 'search', 'accident', 'confusion'] },
    advisor:  { de: 'Ratgebergeist', src: 'SGR', verified: true,
                mods: { K: 3, G: -1, R: 2, S: 1, W: 0, L: 0, I: 0, C: 0, ini: 2 },
                skills: ['Antimagie', 'Arkana', 'Askennen', 'Astralkampf', 'Waffenloser Kampf', 'Wahrnehmung'],
                std: ['magical_guard', 'shadow', 'guard', 'search', 'confusion', 'divining'],
                opt: ['influence', 'enhanced_senses', 'fear', 'engulf'] }
  };

  const CATEGORIES = [
    { id: 'kampf', de: 'Kampf' },
    { id: 'wahrnehmung', de: 'Wahrnehmung' },
    { id: 'heilung', de: 'Heilung' },
    { id: 'illusion', de: 'Illusion' },
    { id: 'manipulation', de: 'Manipulation' }
  ];

  // Traditionen: Zuordnung Zauberkategorie → Geistertyp (frei änderbar in der App)
  // verified: false = Zuordnung aus dem Gedächtnis (Hermetik, Schamanismus, Buddhismus)
  const TRADITIONS = {
    hermetic:  { de: 'Hermetische Magie', src: 'GRW', verified: false, drain: 'Logik + Willenskraft',
                 spirits: { kampf: 'fire', wahrnehmung: 'air', heilung: 'man', illusion: 'water', manipulation: 'earth' } },
    shamanic:  { de: 'Schamanismus', src: 'GRW', verified: false, drain: 'Charisma + Willenskraft',
                 spirits: { kampf: 'beasts', wahrnehmung: 'water', heilung: 'earth', illusion: 'air', manipulation: 'man' } },
    voodoo:    { de: 'Voodoo', src: 'SGR', verified: true, possession: true, drain: 'Willenskraft + Charisma',
                 spirits: { kampf: 'guardian', wahrnehmung: 'water', heilung: 'man', illusion: 'advisor', manipulation: 'helper' },
                 spells: ['Betäubungsblitz', 'Geistessonde', 'Hellsicht', 'Mob-Bewusstsein', 'Unterhaltung'] },
    witches:   { de: 'Straßenhexen', src: 'SGR', verified: true, drain: 'Willenskraft + Charisma',
                 spirits: { kampf: 'fire', wahrnehmung: 'man', heilung: 'advisor', illusion: 'water', manipulation: 'air' },
                 spells: ['Chaos', 'Maske', 'Poltergeist', 'Prophylaxe', 'Unterhaltung'] },
    wheel:     { de: 'Pfad des Rades', src: 'SGR', verified: true, drain: 'Willenskraft + Charisma',
                 spirits: { kampf: 'earth', wahrnehmung: 'advisor', heilung: 'air', illusion: 'water', manipulation: 'fire' },
                 spells: ['Beeinflussen', 'Verdrängen', 'Verbesserte Unsichtbarkeit', 'Feinde entdecken', 'Kugelblitz'] },
    blackmagic:{ de: 'Schwarze Magie', src: 'SGR', verified: true, drain: 'Willenskraft + Charisma',
                 spirits: { kampf: 'fire', wahrnehmung: 'water', heilung: 'earth', illusion: 'air', manipulation: 'man' },
                 spells: ['Chaotische Welt', 'Gedanken beherrschen', 'Handlungen beherrschen', 'Opiumhöhle', 'Todeshand'] },
    druid:     { de: 'Druidische Tradition', src: 'SGR', verified: true, drain: 'Willenskraft + Intuition',
                 spirits: { kampf: 'beasts', wahrnehmung: 'water', heilung: 'plant', illusion: 'air', manipulation: 'earth' },
                 spells: ['Betäubungsball', 'Meute beherrschen', 'Schmerzresistenz', 'Tarnung', 'Unsichtbarkeit'] },
    theurgy:   { de: 'Christliche Theurgie', src: 'SGR', verified: true, drain: 'Willenskraft + Charisma',
                 spirits: { kampf: 'fire', wahrnehmung: 'water', heilung: 'air', illusion: 'earth', manipulation: 'advisor' },
                 spells: ['Beeinflussen', 'Heilen', 'Natürliche Limits erhöhen', 'Blitzstrahl', 'Leben entdecken'] },
    chaos:     { de: 'Chaosmagie', src: 'SGR', verified: true, drain: 'Willenskraft + Intuition',
                 spirits: { kampf: 'fire', wahrnehmung: 'air', heilung: 'earth', illusion: 'man', manipulation: 'water' },
                 spells: ['Chaotische Welt (natürlich)', 'Flammenwerfer', 'Manastörung', 'Massenbelebung', '[Material] formen'] },
    buddhism:  { de: 'Buddhismus', src: 'SGR', verified: false, drain: 'Intuition + Willenskraft',
                 spirits: { kampf: 'guardian', wahrnehmung: 'advisor', heilung: 'earth', illusion: 'fire', manipulation: 'water' } },
    custom:    { de: 'Eigene Tradition', src: '—', verified: true, drain: 'frei wählbar',
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
    { name: 'Exotische Fernkampfwaffe', note: 'nötig für Elementarer Angriff' },
    { name: 'Handwerk' },
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
