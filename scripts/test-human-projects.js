/**
 * Script Testeurs Humains — Création de 30 projets via API
 * Simule 10 testeurs avec des profils variés
 */
const path = require('path');
const apiDir = path.join(__dirname, '..', 'api');
require(path.join(apiDir, 'node_modules', 'dotenv')).config({ path: path.join(apiDir, '.env') });
const admin = require(path.join(apiDir, 'node_modules', 'firebase-admin'));

const API = 'http://localhost:5001';
const FIREBASE_API_KEY = 'AIzaSyCuHdt6qaERPtsrvG1h1Ho58bJ0kFEjQqA';

// Init Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

// ── Les 10 testeurs ──
const TESTEURS = [
  { uid: 'test-amadou-01', name: 'Amadou Diallo', email: 'amadou.test@mojirax.dev', role: 'admin' },
  { uid: 'test-fatou-02', name: 'Fatou Mbaye', email: 'fatou.test@mojirax.dev', role: 'founder' },
  { uid: 'test-jean-03', name: 'Jean Kamga', email: 'jean.test@mojirax.dev', role: 'founder' },
  { uid: 'test-moussa-04', name: 'Moussa Ouédraogo', email: 'moussa.test@mojirax.dev', role: 'founder' },
  { uid: 'test-aisha-05', name: 'Aisha Ndam', email: 'aisha.test@mojirax.dev', role: 'admin' },
  { uid: 'test-paul-06', name: 'Paul Essomba', email: 'paul.test@mojirax.dev', role: 'founder' },
  { uid: 'test-marie-07', name: 'Marie Tchinda', email: 'marie.test@mojirax.dev', role: 'founder' },
  { uid: 'test-olivier-08', name: 'Olivier Fotso', email: 'olivier.test@mojirax.dev', role: 'founder' },
  { uid: 'test-sandrine-09', name: 'Sandrine Ateba', email: 'sandrine.test@mojirax.dev', role: 'founder' },
  { uid: 'test-ibrahim-10', name: 'Ibrahim Njoya', email: 'ibrahim.test@mojirax.dev', role: 'founder' },
];

// ── 30 projets réalistes camerounais ──
const PROJETS = [
  // Amadou — 3 projets (CRUD nominal)
  { testeur: 0, name: 'AgroTrack CM', pitch: 'Suivi GPS des récoltes et livraisons agricoles en temps réel', sector: 'AGRITECH', stage: 'MVP_BUILD', scope: 'LOCAL', country: 'Cameroun', city: 'Bafoussam', problem: 'Les agriculteurs camerounais perdent 30% de leurs récoltes entre le champ et le marché par manque de traçabilité. Les intermédiaires profitent de l\'opacité des prix pour sous-payer les producteurs.', target: 'Petits exploitants agricoles de l\'Ouest Cameroun, environ 500 000 producteurs', solution_current: 'Cahiers papier, appels téléphoniques, bouche-à-oreille pour les prix du marché', solution_desc: 'Application mobile légère (fonctionne en 3G) qui géolocalise chaque lot de récolte du champ au marché. Intègre les prix du marché en temps réel et connecte directement producteur-acheteur.', uvp: 'Premier outil de traçabilité agricole pensé pour le réseau 3G camerounais', anti_scope: 'Pas de financement agricole, pas de vente d\'intrants, pas de conseil agronomique', market_type: 'B2B', business_model: 'FREEMIUM', competitors: 'Agritech Solutions (Nigeria) ne couvre pas le Cameroun. Les coopératives locales utilisent encore le papier.', founder_role: 'CEO', time_availability: 'FULLTIME', traction: '200 agriculteurs en phase pilote à Bafoussam, 3 coopératives partenaires', looking_for_role: 'TECH', collab_type: 'EQUITY', vision: 'D\'ici 3 ans, devenir la plateforme de référence pour la traçabilité agricole en Afrique Centrale avec 50 000 utilisateurs actifs.', requiredSkills: ['React Native', 'Node.js', 'PostgreSQL', 'GPS/Maps API'] },

  { testeur: 0, name: 'MedAlert Cameroun', pitch: 'Alertes médicales et rappels de traitements via SMS et WhatsApp', sector: 'HEALTH', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Yaoundé', problem: 'Au Cameroun, 60% des patients chroniques oublient ou arrêtent prématurément leur traitement. Les médecins n\'ont aucun moyen de suivi entre les consultations.', target: 'Patients chroniques (diabète, hypertension) et centres de santé, environ 2 millions de patients', solution_current: 'Les patients comptent sur leur mémoire ou un proche. Certains collent des post-its.', solution_desc: 'Système de rappels automatisés via SMS et WhatsApp pour les prises de médicaments. Le médecin programme le protocole, le patient reçoit les rappels sans avoir besoin de smartphone.', uvp: 'Fonctionne par SMS basique — pas besoin de smartphone ni d\'internet', anti_scope: 'Pas de téléconsultation, pas de pharmacie en ligne, pas de diagnostic', market_type: 'B2B', business_model: 'SUBSCRIPTION', competitors: 'MyDawa (Kenya) nécessite un smartphone. Aucune solution SMS-first au Cameroun.', founder_role: 'CEO', time_availability: '10-20H', traction: 'Discussions avec 5 centres de santé à Yaoundé', looking_for_role: 'TECH,BIZ', collab_type: 'EQUITY', vision: 'Couvrir 100 centres de santé au Cameroun en 2 ans et réduire l\'abandon de traitement de 40%.', requiredSkills: ['Twilio/SMS API', 'WhatsApp Business API', 'Node.js', 'Dashboard React'] },

  { testeur: 0, name: 'EduPlus Academy', pitch: 'Formation professionnelle en ligne adaptée au contexte africain', sector: 'EDTECH', stage: 'PROTOTYPE', scope: 'HYBRID', country: 'Cameroun', city: 'Douala', problem: 'Les formations en ligne existantes (Coursera, Udemy) ne sont pas adaptées au contexte africain : contenu en anglais, exemples occidentaux, tarifs en USD.', target: 'Jeunes diplômés camerounais 18-30 ans cherchant à se former en tech et business, environ 300 000 personnes', solution_current: 'YouTube gratuit, formations piratées, ou formations en présentiel coûteuses (50 000-200 000 FCFA)', solution_desc: 'Plateforme de cours vidéo en français avec des formateurs africains. Contenu téléchargeable offline. Paiement mobile money.', uvp: 'Contenu 100% africain, 100% offline-first, paiement en FCFA via mobile money', anti_scope: 'Pas de certification universitaire, pas de placement en entreprise', market_type: 'B2C', business_model: 'SUBSCRIPTION', competitors: 'OpenClassrooms (trop cher), Gomycode (présentiel uniquement à Douala)', founder_role: 'CPO', time_availability: 'FULLTIME', traction: '15 vidéos enregistrées, 500 abonnés sur la page Facebook', looking_for_role: 'TECH,PRODUCT', collab_type: 'HYBRID', vision: 'Devenir le Coursera de l\'Afrique francophone avec 100 000 étudiants actifs.', requiredSkills: ['Next.js', 'Video Streaming', 'Mobile Money API', 'React Native'] },

  // Fatou — 3 projets (champs incomplets volontairement)
  { testeur: 1, name: 'QuickWash Douala', pitch: 'Pressing à domicile via app mobile', sector: 'OTHER', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Les habitants de Douala perdent 2-3h par semaine pour aller au pressing. Les pressings traditionnels sont souvent en retard.', target: 'Classes moyennes et supérieures de Douala, environ 200 000 foyers', solution_desc: 'Application de commande de pressing avec collecte et livraison à domicile en 24h.', uvp: 'Livraison garantie en 24h ou c\'est gratuit', market_type: 'B2C', business_model: 'COMMISSION', founder_role: 'CEO', time_availability: '5-10H', looking_for_role: 'TECH', collab_type: 'PAID', vision: 'Couvrir les 5 plus grandes villes du Cameroun.', requiredSkills: ['Flutter', 'Firebase', 'Google Maps API'] },

  { testeur: 1, name: 'CasaFind', pitch: 'Trouver un logement au Cameroun sans arnaque', sector: 'REAL_ESTATE', stage: 'MVP_BUILD', scope: 'LOCAL', country: 'Cameroun', city: 'Yaoundé', problem: 'Le marché immobilier camerounais est opaque. Les arnaques aux faux bailleurs sont fréquentes. Pas de plateforme fiable pour trouver un logement.', target: 'Locataires et propriétaires des grandes villes camerounaises', solution_desc: 'Plateforme de petites annonces immobilières avec vérification des bailleurs par pièce d\'identité et visite virtuelle 360°.', uvp: 'Chaque bailleur est vérifié par CNI et chaque logement a une visite virtuelle', market_type: 'MARKETPLACE', business_model: 'FREEMIUM', founder_role: 'CEO', time_availability: 'FULLTIME', looking_for_role: 'TECH,FINANCE', collab_type: 'EQUITY', vision: 'Devenir le LeBonCoin immobilier de l\'Afrique Centrale.', requiredSkills: ['React', 'Node.js', 'WebGL/360', 'Payment Gateway'] },

  { testeur: 1, name: 'TontineDigital', pitch: 'Tontines sécurisées et digitalisées', sector: 'FINTECH', stage: 'IDEA', scope: 'HYBRID', country: 'Cameroun', city: 'Douala', problem: 'Les tontines traditionnelles souffrent de défauts de paiement et d\'opacité. 40% des conflits familiaux au Cameroun sont liés aux tontines.', target: 'Membres de tontines au Cameroun et diaspora, environ 5 millions de personnes', solution_desc: 'Application qui digitalise le cycle de tontine : cotisations automatiques par mobile money, règles transparentes, pénalités automatiques.', uvp: 'Cotisations automatiques et transparence totale — plus de conflits', market_type: 'B2C', business_model: 'COMMISSION', founder_role: 'CEO', time_availability: '10-20H', looking_for_role: 'TECH,BIZ', collab_type: 'EQUITY', vision: 'Digitaliser 1 million de tontines en Afrique francophone d\'ici 3 ans.', requiredSkills: ['React Native', 'Mobile Money API', 'Node.js', 'Security'] },

  // Jean — 3 projets (cohérence financière)
  { testeur: 2, name: 'ComptaSimple', pitch: 'Comptabilité simplifiée pour PME camerounaises', sector: 'FINTECH', stage: 'PROTOTYPE', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Les PME camerounaises tiennent leur comptabilité sur papier ou Excel. 80% ne sont pas conformes fiscalement, risquant des amendes de 500 000 à 5 000 000 FCFA.', target: 'PME et micro-entreprises camerounaises, environ 200 000 structures formelles', solution_current: 'Excel, cahiers papier, ou comptables freelance à 50 000 FCFA/mois', solution_desc: 'Application web et mobile de comptabilité simplifiée conforme au plan OHADA. Génération automatique des déclarations fiscales DGI.', uvp: 'Conforme OHADA nativement, génère les déclarations DGI en 1 clic', anti_scope: 'Pas de conseil fiscal personnalisé, pas d\'audit comptable', market_type: 'B2B', business_model: 'SAAS', competitors: 'QuickBooks trop complexe et en anglais. Wave pas adapté au plan OHADA.', founder_role: 'CEO', time_availability: 'FULLTIME', traction: '30 PME en beta test à Douala, taux de rétention 85%', looking_for_role: 'TECH', collab_type: 'EQUITY', vision: 'Digitaliser la comptabilité de 50 000 PME en zone CEMAC en 3 ans.', requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'Comptabilité OHADA'] },

  { testeur: 2, name: 'PayFlow Africa', pitch: 'Agrégateur de paiements mobile money pour e-commerce', sector: 'FINTECH', stage: 'MVP_BUILD', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Les e-commerçants camerounais doivent intégrer séparément Orange Money, MTN MoMo, et les cartes bancaires. L\'intégration technique est un cauchemar.', target: 'E-commerçants et développeurs d\'applications au Cameroun', solution_current: 'Intégration manuelle de chaque opérateur (3-6 mois de dev) ou transferts manuels via WhatsApp', solution_desc: 'API unique qui agrège Orange Money, MTN MoMo, Express Union et cartes Visa/Mastercard. SDK plug-and-play en 30 minutes.', uvp: 'Une seule API pour tous les moyens de paiement camerounais, intégration en 30 min', anti_scope: 'Pas de wallet propriétaire, pas de crédit, pas de crypto', market_type: 'B2B', business_model: 'COMMISSION', competitors: 'CinetPay (Côte d\'Ivoire) peu présent au Cameroun. Flutterwave focalisé Nigeria.', founder_role: 'CTO', time_availability: 'FULLTIME', traction: '5 marchands intégrés, 2 millions FCFA de transactions/mois', looking_for_role: 'BIZ', collab_type: 'EQUITY', vision: 'Traiter 10 milliards FCFA de transactions mensuelles en zone CEMAC.', requiredSkills: ['API Design', 'Node.js', 'Mobile Money APIs', 'Security/PCI'] },

  { testeur: 2, name: 'FretExpress', pitch: 'Mise en relation expéditeurs et transporteurs routiers', sector: 'LOGISTICS', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Les camions circulent à 40% vides entre Douala et les autres villes. Les expéditeurs ne trouvent pas de transporteurs fiables et les prix varient du simple au triple.', target: 'Expéditeurs (grossistes, industriels) et transporteurs routiers au Cameroun', solution_desc: 'Marketplace de fret routier avec géolocalisation des camions disponibles, tarification standardisée et suivi en temps réel.', uvp: 'Tarification transparente et suivi GPS du fret en temps réel', market_type: 'MARKETPLACE', business_model: 'COMMISSION', founder_role: 'CEO', time_availability: '10-20H', looking_for_role: 'TECH,BIZ', collab_type: 'HYBRID', vision: 'Réduire le taux de camions vides de 40% à 15% sur l\'axe Douala-Yaoundé.', requiredSkills: ['React Native', 'Maps/GPS', 'Node.js', 'Growth Marketing'] },

  // Moussa — 3 projets (erreurs de saisie — certains volontairement mal remplis)
  { testeur: 3, name: 'ChopTime', pitch: 'Livraison de repas locaux camerounais', sector: 'FOODTECH', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Les travailleurs de Douala n\'ont pas le temps de cuisiner et les options de livraison sont limitées aux pizzas et burgers. La cuisine camerounaise n\'est pas représentée.', target: 'Salariés des zones d\'affaires de Douala et Yaoundé, 200 000 personnes', solution_current: 'Restaurants de rue (pas d\'hygiène contrôlée) ou manger froid', solution_desc: 'Plateforme de commande de plats camerounais (ndolé, eru, poisson braisé) préparés par des cuisinières vérifiées à domicile.', uvp: 'Cuisine camerounaise authentique livrée en 45 min avec traçabilité hygiénique', market_type: 'B2C', business_model: 'COMMISSION', founder_role: 'CMO', time_availability: '5-10H', looking_for_role: 'TECH', collab_type: 'PAID', vision: 'Devenir le Uber Eats de la cuisine africaine authentique.', requiredSkills: ['Flutter', 'Firebase', 'Google Maps', 'UI/UX Design'] },

  { testeur: 3, name: 'SchoolPay', pitch: 'Paiement de scolarité par mobile money en plusieurs fois', sector: 'EDTECH', stage: 'PROTOTYPE', scope: 'LOCAL', country: 'Cameroun', city: 'Yaoundé', problem: 'Les parents camerounais peinent à payer la scolarité en une fois (100 000 à 500 000 FCFA). Les écoles souffrent d\'impayés chroniques.', target: 'Parents d\'élèves et établissements scolaires privés, environ 3 000 écoles', solution_current: 'Paiements en espèces fragmentés, nombreux conflits et exclusions d\'élèves', solution_desc: 'Plateforme de paiement de scolarité en plusieurs versements par mobile money. L\'école reçoit un paiement consolidé mensuel.', uvp: 'Paiement en 3-10 fois sans frais pour les parents, consolidation pour les écoles', anti_scope: 'Pas de crédit scolaire, pas de gestion pédagogique', market_type: 'B2B', business_model: 'COMMISSION', founder_role: 'CEO', time_availability: 'FULLTIME', traction: '2 écoles pilotes, 150 parents inscrits', looking_for_role: 'TECH,FINANCE', collab_type: 'EQUITY', vision: 'Couvrir 1000 écoles au Cameroun et réduire les impayés de 50%.', requiredSkills: ['Mobile Money API', 'React', 'Node.js', 'Accounting'] },

  { testeur: 3, name: 'KmerJobs', pitch: 'Plateforme d\'emploi locale avec matching IA', sector: 'OTHER', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Le taux de chômage des jeunes dépasse 60% au Cameroun alors que les entreprises peinent à recruter des profils qualifiés. Les plateformes existantes sont inadaptées.', target: 'Jeunes diplômés et PME camerounaises', solution_desc: 'Plateforme de matching emploi utilisant l\'IA pour connecter candidats et entreprises selon les compétences réelles, pas juste les diplômes.', uvp: 'Matching basé sur les compétences démontrées, pas les diplômes', market_type: 'MARKETPLACE', business_model: 'FREEMIUM', founder_role: 'CEO', time_availability: '10-20H', looking_for_role: 'TECH,PRODUCT', collab_type: 'EQUITY', vision: 'Réduire le temps moyen de recrutement de 3 mois à 2 semaines au Cameroun.', requiredSkills: ['Machine Learning', 'React', 'Python', 'NLP'] },

  // Aisha — 3 projets (sécurité / multi-tenant)
  { testeur: 4, name: 'SecureID Cameroun', pitch: 'Vérification d\'identité digitale pour entreprises', sector: 'FINTECH', stage: 'MVP_BUILD', scope: 'LOCAL', country: 'Cameroun', city: 'Yaoundé', problem: 'La fraude à l\'identité coûte 50 milliards FCFA par an aux entreprises camerounaises. Aucune API locale ne permet la vérification KYC.', target: 'Banques, assurances, fintechs et opérateurs télécom au Cameroun', solution_current: 'Vérification manuelle des CNI (3-5 jours), coûteuse et peu fiable', solution_desc: 'API de vérification d\'identité instantanée : OCR de la CNI camerounaise, selfie matching, vérification croisée avec les bases officielles.', uvp: 'Seule API KYC optimisée pour la CNI camerounaise avec OCR local', anti_scope: 'Pas de stockage de données personnelles, pas de scoring crédit', market_type: 'B2B', business_model: 'PAY_PER_USE', competitors: 'Smile Identity (Nigeria-centric), Onfido (pas de couverture Cameroun)', founder_role: 'CTO', time_availability: 'FULLTIME', traction: '3 fintechs en discussion, POC avec une banque locale', looking_for_role: 'BIZ,FINANCE', collab_type: 'EQUITY', vision: 'Devenir l\'API KYC de référence en zone CEMAC avec 50 clients enterprise.', requiredSkills: ['Computer Vision', 'Python', 'API Security', 'Cloud Infrastructure'] },

  { testeur: 4, name: 'AlertCity', pitch: 'Signalement citoyen des incidents urbains en temps réel', sector: 'OTHER', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Les routes inondées, coupures d\'eau et pannes d\'électricité ne sont signalées nulle part. Les citoyens n\'ont aucun moyen de prévenir les autres.', target: 'Habitants des grandes villes camerounaises, environ 5 millions de personnes', solution_desc: 'Application de signalement d\'incidents géolocalisés avec photo. Les citoyens préviennent en temps réel des problèmes dans leur quartier.', uvp: 'Waze des incidents urbains — chaque citoyen est un capteur', market_type: 'B2G', business_model: 'FREEMIUM', founder_role: 'CPO', time_availability: '5-10H', looking_for_role: 'TECH', collab_type: 'HYBRID', vision: 'Couvrir 10 villes africaines et devenir l\'outil de référence pour la smart city en Afrique.', requiredSkills: ['React Native', 'Maps API', 'Node.js', 'Firebase'] },

  { testeur: 4, name: 'DiaspoInvest', pitch: 'Plateforme d\'investissement pour la diaspora camerounaise', sector: 'FINTECH', stage: 'IDEA', scope: 'DIASPORA', country: 'Cameroun', city: 'Yaoundé', problem: 'La diaspora camerounaise envoie 500 milliards FCFA/an mais 90% va en consommation. Ils veulent investir mais n\'ont pas confiance dans les projets locaux.', target: 'Diaspora camerounaise en Europe et Amérique du Nord, environ 2 millions de personnes', solution_current: 'Transferts via Western Union pour la famille, aucun outil d\'investissement structuré', solution_desc: 'Plateforme d\'investissement sécurisée permettant à la diaspora de financer des projets immobiliers et agricoles au Cameroun avec suivi transparent.', uvp: 'Due diligence locale + suivi transparent + retours garantis par séquestre bancaire', anti_scope: 'Pas de transfert d\'argent classique, pas de crypto, pas de microcrédit', market_type: 'B2C', business_model: 'COMMISSION', competitors: 'Africinvest (trop institutionnel), pas de plateforme retail pour la diaspora camerounaise', founder_role: 'CEO', time_availability: 'FULLTIME', traction: 'Enquête auprès de 200 membres de la diaspora — 78% intéressés', looking_for_role: 'TECH,FINANCE', collab_type: 'EQUITY', vision: 'Canaliser 10 milliards FCFA d\'investissements diaspora vers des projets productifs en 3 ans.', requiredSkills: ['React', 'Node.js', 'Payment/Banking APIs', 'Legal/Compliance'] },

  // Paul — 3 projets (doublons, contraintes)
  { testeur: 5, name: 'MotoTrack', pitch: 'Gestion de flotte de motos-taxis avec suivi GPS', sector: 'LOGISTICS', stage: 'PROTOTYPE', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Les propriétaires de motos-taxis n\'ont aucun moyen de suivre leurs conducteurs. Vol de recettes, détournements et accidents non signalés sont quotidiens.', target: 'Propriétaires de flottes de motos-taxis (5-50 motos), environ 10 000 au Cameroun', solution_current: 'Confiance aveugle, comptage cash le soir, appels téléphoniques pour localiser', solution_desc: 'Boîtier GPS low-cost installé sur la moto + app de suivi pour le propriétaire. Comptage automatique des courses et recettes.', uvp: 'Boîtier GPS à 5 000 FCFA + app gratuite — ROI en 1 semaine', market_type: 'B2B', business_model: 'SUBSCRIPTION', competitors: 'SafeBoda (Ouganda) ne fait pas la gestion de flotte. Aucune solution locale.', founder_role: 'CTO', time_availability: 'FULLTIME', traction: '20 motos équipées en test, recettes augmentées de 25%', looking_for_role: 'BIZ', collab_type: 'EQUITY', vision: 'Équiper 100 000 motos-taxis en Afrique Centrale et de l\'Ouest.', requiredSkills: ['IoT/Embedded', 'React Native', 'Node.js', 'GPS Tracking'] },

  { testeur: 5, name: 'PharmaNow', pitch: 'Localisation de médicaments disponibles en pharmacie en temps réel', sector: 'HEALTH', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Yaoundé', problem: 'Les patients font le tour de 5-10 pharmacies pour trouver un médicament. Les pharmacies n\'ont pas de système de stock centralisé.', target: 'Patients et pharmacies du Cameroun', solution_desc: 'Application qui géolocalise les pharmacies ayant le médicament recherché en stock, avec prix et disponibilité en temps réel.', uvp: 'Trouvez votre médicament en 30 secondes, pas en 3 heures', market_type: 'MARKETPLACE', business_model: 'FREEMIUM', founder_role: 'CEO', time_availability: '10-20H', looking_for_role: 'TECH,PRODUCT', collab_type: 'HYBRID', vision: 'Connecter toutes les pharmacies du Cameroun et devenir l\'annuaire médical digital de référence.', requiredSkills: ['React Native', 'Node.js', 'Geolocation', 'Healthcare APIs'] },

  { testeur: 5, name: 'WasteHero', pitch: 'Collecte intelligente des déchets avec optimisation d\'itinéraires', sector: 'ENERGY', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Douala produit 3000 tonnes de déchets par jour mais seules 40% sont collectées. Les camions suivent des itinéraires fixes inefficaces.', target: 'Mairies et entreprises de collecte de déchets', solution_desc: 'Capteurs IoT dans les bacs à ordures + algorithme d\'optimisation des itinéraires de collecte basé sur le niveau de remplissage.', uvp: 'Réduction de 30% des coûts de collecte grâce à l\'optimisation IA des tournées', market_type: 'B2G', business_model: 'SAAS', founder_role: 'CTO', time_availability: '5-10H', looking_for_role: 'BIZ', collab_type: 'PAID', vision: 'Augmenter le taux de collecte des déchets de 40% à 80% à Douala en 3 ans.', requiredSkills: ['IoT', 'Python/ML', 'React', 'Route Optimization'] },

  // Marie — 3 projets (valeurs extrêmes)
  { testeur: 6, name: 'CraftMarket Africa', pitch: 'Marketplace d\'artisanat camerounais pour le monde entier', sector: 'ECOMMERCE', stage: 'MVP_BUILD', scope: 'HYBRID', country: 'Cameroun', city: 'Foumban', problem: 'Les artisans camerounais (Foumban, Bamenda) produisent un artisanat de qualité mondiale mais n\'ont accès qu\'au marché local touristique saisonnier.', target: 'Artisans camerounais (5000+) et acheteurs internationaux passionnés d\'art africain', solution_current: 'Vente sur place aux touristes ou via quelques revendeurs à marge élevée (200-300%)', solution_desc: 'Marketplace e-commerce avec photographie professionnelle des oeuvres, livraison internationale et paiement sécurisé. L\'artisan gagne 3x plus qu\'en local.', uvp: 'Chaque artisan a sa boutique en ligne avec photos pro et livraison internationale', anti_scope: 'Pas de production industrielle, uniquement fait-main authentique certifié', market_type: 'MARKETPLACE', business_model: 'COMMISSION', competitors: 'Etsy (pas de focus Afrique), Jumia Deals (pas d\'international)', founder_role: 'CEO', time_availability: 'FULLTIME', traction: '50 artisans enregistrés à Foumban, 20 ventes internationales en 2 mois', looking_for_role: 'TECH,BIZ', collab_type: 'EQUITY', vision: 'Permettre à 10 000 artisans africains de vivre de leur art sur le marché mondial.', requiredSkills: ['Next.js', 'Stripe', 'Photography/Media', 'International Shipping APIs'] },

  { testeur: 6, name: 'SolarKamer', pitch: 'Location de kits solaires avec paiement pay-as-you-go', sector: 'ENERGY', stage: 'PROTOTYPE', scope: 'LOCAL', country: 'Cameroun', city: 'Maroua', problem: 'Au Nord-Cameroun, 70% des foyers n\'ont pas d\'électricité fiable. Un kit solaire coûte 200 000-500 000 FCFA — inaccessible pour la majorité.', target: 'Foyers ruraux du Nord-Cameroun sans accès fiable à l\'électricité, 500 000 ménages', solution_current: 'Bougies, lampes à pétrole (dangereux), ou groupes électrogènes (coûteux)', solution_desc: 'Location de kits solaires avec paiement quotidien par mobile money (500 FCFA/jour). Le kit se verrouille automatiquement en cas de non-paiement.', uvp: 'Électricité solaire à 500 FCFA/jour — moins cher que le pétrole lampant', market_type: 'B2C', business_model: 'PAY_PER_USE', competitors: 'M-KOPA (Kenya) n\'est pas présent en zone CEMAC. BBOXX trop cher.', founder_role: 'CEO', time_availability: 'FULLTIME', traction: '30 kits déployés en pilote à Maroua, 95% de taux de paiement', looking_for_role: 'TECH,FINANCE', collab_type: 'EQUITY', vision: 'Électrifier 100 000 foyers au Nord-Cameroun et Tchad en 3 ans.', requiredSkills: ['IoT/Embedded', 'Mobile Money API', 'React Native', 'Hardware Design'] },

  { testeur: 6, name: 'LingaLearn', pitch: 'Apprentissage des langues locales camerounaises par IA', sector: 'EDTECH', stage: 'IDEA', scope: 'HYBRID', country: 'Cameroun', city: 'Yaoundé', problem: 'Les jeunes camerounais urbains perdent la maîtrise de leurs langues maternelles (250+ langues). Aucune app d\'apprentissage n\'existe pour ces langues.', target: 'Jeunes camerounais urbains et diaspora souhaitant (ré)apprendre leur langue, 2 millions de personnes', solution_desc: 'App Duolingo-like pour les langues camerounaises (Ewondo, Duala, Bamiléké, Fulfulde) utilisant l\'IA pour la reconnaissance vocale.', uvp: 'Premier Duolingo pour les langues africaines avec reconnaissance vocale IA', market_type: 'B2C', business_model: 'FREEMIUM', founder_role: 'CPO', time_availability: '10-20H', looking_for_role: 'TECH', collab_type: 'EQUITY', vision: 'Couvrir 50 langues africaines et devenir la référence de la préservation linguistique digitale.', requiredSkills: ['React Native', 'Speech Recognition', 'NLP/AI', 'Gamification'] },

  // Olivier — 3 projets (tente de tricher)
  { testeur: 7, name: 'TransfertDirect', pitch: 'Transfert d\'argent P2P sans frais entre le Cameroun et l\'Europe', sector: 'FINTECH', stage: 'MVP_BUILD', scope: 'DIASPORA', country: 'Cameroun', city: 'Douala', problem: 'Les frais de transfert d\'argent vers le Cameroun sont de 7-10% en moyenne. Sur 500 milliards FCFA envoyés par an, 40 milliards partent en frais.', target: 'Diaspora camerounaise en Europe envoyant de l\'argent au pays', solution_current: 'Western Union (8-10%), World Remit (5-7%), transfert informel via des particuliers', solution_desc: 'Système P2P de matching : un utilisateur en France veut envoyer des euros au Cameroun, un commerçant camerounais veut payer un fournisseur en France. On matche les flux.', uvp: 'Frais de 1% maximum grâce au matching de flux inversés', anti_scope: 'Pas de crypto, pas de compte bancaire, pas de carte prépayée', market_type: 'B2C', business_model: 'COMMISSION', competitors: 'Wise (3%), Wave (2% mais limité), aucun ne fait le matching P2P', founder_role: 'CEO', time_availability: 'FULLTIME', traction: '100 utilisateurs beta en France-Cameroun, 15 millions FCFA transférés', looking_for_role: 'TECH,FINANCE', collab_type: 'EQUITY', vision: 'Devenir le corridor de transfert le moins cher entre l\'Europe et l\'Afrique Centrale.', requiredSkills: ['Node.js', 'React', 'Banking/Compliance APIs', 'Security'] },

  { testeur: 7, name: 'FarmToFork CM', pitch: 'Circuit court fermier-consommateur au Cameroun', sector: 'AGRITECH', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Bafoussam', problem: 'Les intermédiaires captent 60% de la valeur entre le fermier et le consommateur. Le fermier vend ses tomates à 50 FCFA, le consommateur les achète à 300 FCFA.', target: 'Fermiers péri-urbains et consommateurs des grandes villes camerounaises', solution_desc: 'Marketplace de produits agricoles frais en circuit court. Le consommateur commande en ligne, le fermier livre directement ou via des points relais.', uvp: 'Du champ à l\'assiette en 24h — le fermier gagne 2x plus, le consommateur paie 30% moins', market_type: 'MARKETPLACE', business_model: 'COMMISSION', founder_role: 'CEO', time_availability: '5-10H', looking_for_role: 'TECH,BIZ', collab_type: 'HYBRID', vision: 'Connecter 10 000 fermiers directement aux consommateurs en zone CEMAC.', requiredSkills: ['React Native', 'Node.js', 'Logistics', 'Growth Marketing'] },

  { testeur: 7, name: 'DocOnCall', pitch: 'Téléconsultation médicale à 1000 FCFA', sector: 'HEALTH', stage: 'PROTOTYPE', scope: 'LOCAL', country: 'Cameroun', city: 'Yaoundé', problem: 'Il y a 1 médecin pour 10 000 habitants au Cameroun. Les zones rurales n\'ont souvent aucun médecin à moins de 50 km.', target: 'Population rurale et péri-urbaine du Cameroun, 10 millions de personnes', solution_current: 'Automédication (80% des cas), tradipraticiens, ou voyage coûteux vers la ville', solution_desc: 'Application de téléconsultation par vidéo ou appel avec des médecins agréés. Paiement mobile money à 1000 FCFA la consultation de 15 min.', uvp: 'Consultation médicale certifiée à 1000 FCFA accessible partout au Cameroun', market_type: 'B2C', business_model: 'COMMISSION', competitors: 'MyDawa (Kenya), pas de concurrent local au Cameroun', founder_role: 'CTO', time_availability: 'FULLTIME', traction: '10 médecins inscrits, 50 consultations réalisées en 1 mois', looking_for_role: 'BIZ,PRODUCT', collab_type: 'EQUITY', vision: 'Offrir un accès médical de base à chaque Camerounais via son téléphone.', requiredSkills: ['React Native', 'WebRTC', 'Node.js', 'HIPAA/Data Privacy'] },

  // Sandrine — 3 projets (audit trail)
  { testeur: 8, name: 'EventKamer', pitch: 'Billetterie en ligne pour événements camerounais', sector: 'MEDIA', stage: 'MVP_BUILD', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Les organisateurs d\'événements vendent 80% de leurs billets en cash. Pas de contrôle des entrées, fraude aux faux billets, et aucune donnée sur les participants.', target: 'Organisateurs d\'événements et festivaliers au Cameroun', solution_current: 'Vente en cash aux carrefours, billets papier photocopiables, comptage manuel', solution_desc: 'Plateforme de création d\'événements avec billetterie en ligne, QR code anti-fraude et paiement mobile money.', uvp: 'QR code anti-fraude + analytics participants + paiement mobile money', anti_scope: 'Pas d\'organisation d\'événements, pas de location de salle', market_type: 'MARKETPLACE', business_model: 'COMMISSION', competitors: 'Eventbrite (pas de mobile money), aucun concurrent local sérieux', founder_role: 'CEO', time_availability: 'FULLTIME', traction: '15 événements, 3000 billets vendus, 5 millions FCFA de GMV', looking_for_role: 'TECH', collab_type: 'EQUITY', vision: 'Digitaliser 50% de la billetterie événementielle au Cameroun en 3 ans.', requiredSkills: ['Next.js', 'QR Code', 'Mobile Money API', 'Analytics'] },

  { testeur: 8, name: 'SafeRide CM', pitch: 'Covoiturage sécurisé pour les trajets interurbains', sector: 'LOGISTICS', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Yaoundé', problem: 'Les trajets Yaoundé-Douala coûtent 5000 FCFA en bus et 4h. Les voitures particulières font le trajet avec des places vides mais sans moyen de les proposer.', target: 'Voyageurs réguliers sur les axes interurbains camerounais', solution_desc: 'Application de covoiturage pour les trajets interurbains. Vérification du conducteur par CNI, assurance trajet, paiement mobile money.', uvp: 'Covoiturage vérifié et assuré — plus sûr et 40% moins cher que le bus', market_type: 'B2C', business_model: 'COMMISSION', founder_role: 'CEO', time_availability: '10-20H', looking_for_role: 'TECH,BIZ', collab_type: 'EQUITY', vision: 'Devenir le BlaBlaCar de l\'Afrique Centrale avec 100 000 trajets par mois.', requiredSkills: ['React Native', 'Maps/GPS', 'Node.js', 'Insurance API'] },

  { testeur: 8, name: 'AgriFinance', pitch: 'Micro-crédit digital pour petits agriculteurs', sector: 'AGRITECH', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Bamenda', problem: 'Les petits agriculteurs n\'ont pas accès au crédit bancaire (90% exclus). Ils ne peuvent pas acheter semences et engrais au bon moment.', target: 'Petits agriculteurs camerounais sans accès bancaire, environ 1 million de personnes', solution_desc: 'Micro-crédit digital basé sur l\'historique de production et les données satellite. Décaissement en mobile money en 24h, remboursement après récolte.', uvp: 'Scoring crédit basé sur données satellite et historique — pas de garantie exigée', market_type: 'B2C', business_model: 'COMMISSION', founder_role: 'CEO', time_availability: 'FULLTIME', looking_for_role: 'TECH,FINANCE', collab_type: 'EQUITY', vision: 'Financer 50 000 cycles agricoles par an en Afrique Centrale.', requiredSkills: ['Python/ML', 'Satellite Data', 'Mobile Money API', 'Risk Modeling'] },

  // Ibrahim — 3 projets (suppressions, cascades)
  { testeur: 9, name: 'CleanWater CM', pitch: 'Monitoring IoT de la qualité de l\'eau potable', sector: 'HEALTH', stage: 'PROTOTYPE', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'L\'eau du robinet à Douala est souvent impropre à la consommation. Les citoyens n\'ont aucun moyen de vérifier la qualité en temps réel.', target: 'Communautés urbaines et péri-urbaines, sociétés de distribution d\'eau', solution_current: 'Bouillir l\'eau, acheter de l\'eau minérale (300-500 FCFA/jour/famille) ou boire sans vérifier', solution_desc: 'Capteurs IoT installés aux points d\'eau stratégiques. Dashboard de suivi de la qualité (turbidité, pH, chlore) accessible au public et aux autorités.', uvp: 'Monitoring continu et alertes automatiques quand l\'eau devient impropre', market_type: 'B2G', business_model: 'SAAS', competitors: 'Aucun acteur IoT water quality en Afrique Centrale', founder_role: 'CTO', time_availability: 'FULLTIME', traction: '5 capteurs installés dans 2 quartiers de Douala, données collectées depuis 3 mois', looking_for_role: 'BIZ', collab_type: 'EQUITY', vision: 'Monitorer la qualité de l\'eau de 50 villes africaines en 5 ans.', requiredSkills: ['IoT/Embedded', 'Data Visualization', 'Node.js', 'Hardware'] },

  { testeur: 9, name: 'AfroNews Hub', pitch: 'Agrégateur d\'actualités africaines vérifié par IA', sector: 'MEDIA', stage: 'IDEA', scope: 'HYBRID', country: 'Cameroun', city: 'Yaoundé', problem: 'Les fake news se propagent massivement sur WhatsApp et Facebook en Afrique. Aucun agrégateur ne vérifie la fiabilité des sources africaines.', target: 'Lecteurs d\'actualités africaines, diaspora et journalistes, 10 millions de francophones', solution_desc: 'Agrégateur d\'actualités africaines avec scoring de fiabilité par IA. Les articles sont classés par niveau de confiance et les sources douteuses sont signalées.', uvp: 'Score de fiabilité IA sur chaque article — combattre les fake news à la source', market_type: 'B2C', business_model: 'ADVERTISING', founder_role: 'CPO', time_availability: '10-20H', looking_for_role: 'TECH', collab_type: 'HYBRID', vision: 'Devenir la référence de l\'information fiable en Afrique francophone.', requiredSkills: ['NLP/AI', 'Next.js', 'Web Scraping', 'Content Moderation'] },

  { testeur: 9, name: 'ParkSmart Douala', pitch: 'Parking intelligent avec réservation et paiement mobile', sector: 'LOGISTICS', stage: 'IDEA', scope: 'LOCAL', country: 'Cameroun', city: 'Douala', problem: 'Les conducteurs à Douala perdent en moyenne 25 minutes par jour à chercher une place de parking. Le stationnement anarchique aggrave les embouteillages.', target: 'Conducteurs et propriétaires de parkings à Douala et Yaoundé', solution_desc: 'Application de réservation de places de parking avec guidage GPS. Les parkings privés et publics peuvent lister leurs places disponibles en temps réel.', uvp: 'Réservez votre place avant de partir — fini les 25 minutes perdues chaque jour', market_type: 'MARKETPLACE', business_model: 'COMMISSION', founder_role: 'CEO', time_availability: '5-10H', looking_for_role: 'TECH,BIZ', collab_type: 'PAID', vision: 'Couvrir tous les parkings de Douala et Yaoundé, puis s\'étendre aux villes CEMAC.', requiredSkills: ['React Native', 'Maps/GPS', 'IoT Sensors', 'Mobile Money API'] },
];

// ── Utilitaires ──

async function getIdToken(customToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firebase token exchange failed: ${err}`);
  }
  const data = await res.json();
  return data.idToken;
}

async function apiCall(method, path, token, body) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ──
async function main() {
  const results = [];
  const tokens = {};
  let created = 0;
  let failed = 0;
  let validated = 0;

  console.log('═══════════════════════════════════════════════════════');
  console.log('  AGENCE DE TESTEURS HUMAINS — Création de 30 projets');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── Étape 1: Créer les utilisateurs Firebase et sync ──
  console.log('▶ ÉTAPE 1: Création des 10 testeurs Firebase + sync API\n');

  for (const testeur of TESTEURS) {
    try {
      // Créer ou récupérer l'utilisateur Firebase
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUser(testeur.uid);
        console.log(`  ✓ ${testeur.name} — Firebase existant (${testeur.uid})`);
      } catch {
        firebaseUser = await admin.auth().createUser({
          uid: testeur.uid,
          email: testeur.email,
          displayName: testeur.name,
          emailVerified: true,
        });
        console.log(`  + ${testeur.name} — Firebase créé (${testeur.uid})`);
      }

      // Obtenir un ID token
      const customToken = await admin.auth().createCustomToken(testeur.uid);
      const idToken = await getIdToken(customToken);
      tokens[testeur.uid] = idToken;

      // Sync avec l'API
      const syncRes = await apiCall('POST', '/auth/sync', idToken);
      if (syncRes.status === 200 || syncRes.status === 201) {
        console.log(`  ✓ ${testeur.name} — Sync API OK (id: ${syncRes.data?.id || '?'})`);
      } else {
        console.log(`  ✗ ${testeur.name} — Sync FAIL (${syncRes.status}): ${JSON.stringify(syncRes.data)}`);
      }
    } catch (err) {
      console.log(`  ✗ ${testeur.name} — ERREUR: ${err.message}`);
    }
  }

  console.log('\n▶ ÉTAPE 2: Création des 30 projets\n');

  // ── Étape 2: Créer les 30 projets ──
  for (let i = 0; i < PROJETS.length; i++) {
    const projet = PROJETS[i];
    const testeur = TESTEURS[projet.testeur];
    const token = tokens[testeur.uid];

    if (!token) {
      console.log(`  ✗ [${i+1}/30] ${projet.name} — PAS DE TOKEN pour ${testeur.name}`);
      failed++;
      continue;
    }

    try {
      // Construire le body (exclure le champ testeur)
      const { testeur: _, ...body } = projet;

      const res = await apiCall('POST', '/projects', token, body);

      if (res.status === 201 || res.status === 200) {
        created++;
        const status = res.data?.status || '?';
        const slug = res.data?.slug || '?';
        console.log(`  ✓ [${i+1}/30] ${projet.name} — ${testeur.name} — ${status} (slug: ${slug})`);
        results.push({ projet: projet.name, testeur: testeur.name, status, slug, ok: true });
      } else {
        failed++;
        const msg = typeof res.data === 'object' ? JSON.stringify(res.data?.message || res.data) : res.data;
        console.log(`  ✗ [${i+1}/30] ${projet.name} — ${testeur.name} — FAIL (${res.status}): ${msg}`);
        results.push({ projet: projet.name, testeur: testeur.name, status: `FAIL-${res.status}`, error: msg, ok: false });
      }
    } catch (err) {
      failed++;
      console.log(`  ✗ [${i+1}/30] ${projet.name} — ${testeur.name} — ERREUR: ${err.message}`);
      results.push({ projet: projet.name, testeur: testeur.name, status: 'ERROR', error: err.message, ok: false });
    }

    // Pause pour le rate limiter global (3 créations par 60s)
    if ((i + 1) % 3 === 0 && i < PROJETS.length - 1) {
      process.stdout.write('    ⏳ pause rate-limit (62s)...');
      await sleep(62000);
      console.log(' OK');
    }
  }

  // ── Étape 3: Vérification — lire les projets créés ──
  console.log('\n▶ ÉTAPE 3: Vérification des projets créés\n');

  for (const testeur of TESTEURS) {
    const token = tokens[testeur.uid];
    if (!token) continue;

    const res = await apiCall('GET', '/users/profile', token);
    const projectCount = res.data?.projects?.length || 0;
    const projectNames = (res.data?.projects || []).map(p => p.name).join(', ');
    console.log(`  ${testeur.name}: ${projectCount} projet(s) — [${projectNames}]`);
  }

  // ── Étape 4: Test de validation IA sur un projet ──
  console.log('\n▶ ÉTAPE 4: Test validation IA\n');

  const testToken = tokens[TESTEURS[0].uid];
  if (testToken) {
    const validateBody = {
      name: 'Test Validation IA',
      pitch: 'Tester que l\'endpoint validate fonctionne correctement',
      sector: 'FINTECH',
      stage: 'IDEA',
      problem: 'Test de validation automatique par les testeurs humains',
    };
    const valRes = await apiCall('POST', '/projects/validate', testToken, validateBody);
    if (valRes.status === 200 || valRes.status === 201) {
      validated++;
      console.log(`  ✓ Validation IA OK — score: ${JSON.stringify(valRes.data).substring(0, 200)}`);
    } else {
      console.log(`  ✗ Validation IA FAIL (${valRes.status}): ${JSON.stringify(valRes.data)}`);
    }
  }

  // ── Étape 5: Tests CRUD (lecture, modification, suppression) ──
  console.log('\n▶ ÉTAPE 5: Tests CRUD (Read / Update / Delete)\n');

  // Récupérer le premier projet d'Amadou pour les tests CRUD
  const amadouToken = tokens[TESTEURS[0].uid];
  if (amadouToken) {
    const profileRes = await apiCall('GET', '/users/profile', amadouToken);
    const firstProject = profileRes.data?.projects?.[0];

    if (firstProject) {
      const pid = firstProject.id;

      // READ
      const readRes = await apiCall('GET', `/projects/${pid}`, amadouToken);
      console.log(`  ✓ READ — ${readRes.data?.name} (status: ${readRes.status})`);

      // UPDATE
      const updateRes = await apiCall('PATCH', `/projects/${pid}`, amadouToken, {
        pitch: 'Pitch mis à jour par le testeur Amadou — test CRUD',
      });
      console.log(`  ${updateRes.status === 200 ? '✓' : '✗'} UPDATE — pitch modifié (status: ${updateRes.status})`);

      // Vérifier la mise à jour
      const verifyRes = await apiCall('GET', `/projects/${pid}`, amadouToken);
      const pitchOk = verifyRes.data?.pitch?.includes('testeur Amadou');
      console.log(`  ${pitchOk ? '✓' : '✗'} VERIFY UPDATE — pitch contient "testeur Amadou": ${pitchOk}`);

      // DELETE
      const deleteRes = await apiCall('DELETE', `/projects/${pid}`, amadouToken);
      console.log(`  ${deleteRes.status === 200 || deleteRes.status === 204 ? '✓' : '✗'} DELETE — (status: ${deleteRes.status})`);

      // Vérifier la suppression
      const afterDelete = await apiCall('GET', `/projects/${pid}`, amadouToken);
      console.log(`  ${afterDelete.status === 404 || afterDelete.data?.status === 'REMOVED_BY_ADMIN' ? '✓' : '⚠'} VERIFY DELETE — (status: ${afterDelete.status}, projectStatus: ${afterDelete.data?.status})`);
    }
  }

  // ── Étape 6: Test sécurité — un testeur tente de modifier le projet d'un autre ──
  console.log('\n▶ ÉTAPE 6: Tests sécurité (cross-user)\n');

  const olivierToken = tokens[TESTEURS[7].uid]; // Olivier — celui qui triche
  if (amadouToken && olivierToken) {
    const profileRes = await apiCall('GET', '/users/profile', amadouToken);
    const amadouProject = profileRes.data?.projects?.[0];

    if (amadouProject) {
      // Olivier tente de modifier le projet d'Amadou
      const hackRes = await apiCall('PATCH', `/projects/${amadouProject.id}`, olivierToken, {
        pitch: 'HACK — Olivier a modifié le projet d\'Amadou',
      });
      const blocked = hackRes.status === 403 || hackRes.status === 401;
      console.log(`  ${blocked ? '✓' : '✗ ALERTE SÉCURITÉ'} Cross-user UPDATE bloqué: ${hackRes.status} (attendu: 403)`);

      // Olivier tente de supprimer le projet d'Amadou
      const hackDel = await apiCall('DELETE', `/projects/${amadouProject.id}`, olivierToken);
      const delBlocked = hackDel.status === 403 || hackDel.status === 401;
      console.log(`  ${delBlocked ? '✓' : '✗ ALERTE SÉCURITÉ'} Cross-user DELETE bloqué: ${hackDel.status} (attendu: 403)`);
    } else {
      console.log('  ⚠ Pas de projet Amadou restant pour tester cross-user (supprimé à l\'étape 5)');
    }
  }

  // ── Rapport final ──
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RAPPORT FINAL');
  console.log('═══════════════════════════════════════════════════════\n');

  const byTesteur = {};
  for (const r of results) {
    if (!byTesteur[r.testeur]) byTesteur[r.testeur] = { pass: 0, fail: 0, total: 0 };
    byTesteur[r.testeur].total++;
    if (r.ok) byTesteur[r.testeur].pass++; else byTesteur[r.testeur].fail++;
  }

  console.log('  Testeur              | Projets | PASS | FAIL');
  console.log('  ---------------------|---------|------|-----');
  for (const [name, s] of Object.entries(byTesteur)) {
    console.log(`  ${name.padEnd(21)} | ${String(s.total).padStart(7)} | ${String(s.pass).padStart(4)} | ${String(s.fail).padStart(4)}`);
  }
  console.log(`  ---------------------|---------|------|-----`);
  console.log(`  TOTAL                | ${String(results.length).padStart(7)} | ${String(created).padStart(4)} | ${String(failed).padStart(4)}`);

  if (failed > 0) {
    console.log('\n  ### Problèmes trouvés ###');
    for (const r of results.filter(r => !r.ok)) {
      console.log(`  ✗ [${r.testeur}] ${r.projet} — ${r.error}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
