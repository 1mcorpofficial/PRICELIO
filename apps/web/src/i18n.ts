import { create } from 'zustand';
import type { Lang } from './types/contracts';

const COPY = {
  lt: {
    brand: 'PRICELIO',
    nav_login: 'Prisijungti',
    nav_register: 'Registruotis',
    hero_title: 'Nepermokek. Skenuok. Laimek.',
    hero_sub: 'Skenuok cekius, rink XP taskus ir atrakink geriausias kainas bei misijas.',
    hero_cta: 'Isbandyti demonstracine versija',
    problem_title: 'Kainu stebejimas neturi buti rankinis darbas.',
    problem_text: 'PRICELIO sujungia cekius, pasiulymus ir misijas i viena ismanu taupymo varikli.',
    social_title: 'Gyva socialine verifikacija',
    social_text: 'Matai kiek zmoniu jau skenuoja, kiek cekiu apdorota ir kiek sutaupyta bendruomeneje.',
    stats_users: 'Aktyvus skenuotojai',
    stats_receipts: 'Nuskenuoti cekiai',
    stats_saved: 'Bendra sutaupyta suma',
    nav_demo: 'Demo',
    lang_label: 'Kalba',
    hero_secondary_cta: 'Perziureti web aplikacija',
    hero_badge_live: 'Live 2026 beta',
    proof_title: 'Patikimumas realiu laiku',
    proof_text: 'Srautai atnaujinami gyvai: XP, misijos ir cekiu statusai be perkrovimo.',
    demo_title: 'Demo Smeliadeze',
    demo_sub: 'Isbandyk virtualu ceki ir pamatyk mikro-pergale pries registracija.',
    demo_scan: 'Skenuoti (Demo)',
    demo_success: 'Sveikiname! Sis cekis atnese +50 XP ir atrakino 1 lygio misija.',
    demo_claim_prompt: 'Nori issaugoti taskus ir atrakinti tikras nuolaidas?',
    demo_claim_cta: 'Sukurti paskyra per 10 sekundziu',
    demo_session_expired: 'Demo sesija pasibaige. Paleisk is naujo.',
    demo_preview_reward: 'Demo atlygis',
    scanning_now: 'Skenuojama...',
    auth_title: 'Prisijunk prie PRICELIO',
    auth_register: 'Sukurti paskyra',
    auth_login: 'Prisijungti',
    email: 'El. pastas',
    password: 'Slaptazodis',
    continue_google: 'Tęsti su Google (Coming soon)',
    continue_apple: 'Tęsti su Apple (Coming soon)',
    app_overview: 'Apzvalga',
    app_receipts: 'Cekiai',
    app_budget: 'Biudzetas',
    app_missions: 'Misijos',
    app_basket: 'Krepselis',
    app_profile: 'Profilis',
    app_family: 'Seima',
    app_leaderboard: 'Reitingai',
    app_plus: 'Plus',
    app_kids: 'Vaikai',
    app_guest: 'Svecias',
    app_logout: 'Atsijungti',
    app_xp: 'XP',
    app_overview_title: 'Apzvalga',
    app_rank: 'Rangas',
    app_spendable_points: 'Isleidziami taskai',
    app_xp_to_next: 'Iki kito lygio',
    app_badges: 'Zenkliukai',
    app_badge_receipt: 'Cekiu skautas',
    app_badge_mission: 'Misiju runneris',
    app_receipts_title: 'Cekiu istorija',
    app_budget_title: 'Biudzeto analitika',
    app_missions_title: 'Aktyvios misijos',
    app_empty_receipts_title: 'Kol kas cekiu nera',
    app_empty_receipts_text: 'Nuskenuok pirmaji ceki ir atrakink startini XP bonus.',
    app_empty_missions_title: 'Siuo metu misiju nera',
    app_empty_missions_text: 'Patikrink vieta veliau arba atnaujink lokacija.',
    app_empty_generic_action: 'Atnaujinti',
    app_loading: 'Kraunama...',
    app_mission_expired: 'Pasibaige',
    auth_validation_email: 'Iveskite galiojanti el. pasta.',
    auth_validation_password: 'Slaptazodis turi buti bent 8 simboliu.',
    auth_value_demo_bonus: 'Demo claim bonusas',
    auth_value_realtime: 'Realtime misiju ir cekiu atnaujinimai',
    auth_value_security: 'Refresh cookies + CSRF apsauga',
    onboarding_1: '1 zingsnis: nuskenuok pirmaji ceki.',
    onboarding_2: '2 zingsnis: aktyvuok misija netoliese.',
    onboarding_3: '3 zingsnis: stebek sutaupymus biudzeto lange.',
    next: 'Toliau',
    complete: 'Baigti',
    start: 'Pradeti',
    logout: 'Atsijungti'
  },
  en: {
    brand: 'PRICELIO',
    nav_login: 'Login',
    nav_register: 'Register',
    hero_title: 'Stop overpaying. Scan. Win.',
    hero_sub: 'Scan receipts, earn XP points, and unlock better prices and missions.',
    hero_cta: 'Try demo experience',
    problem_title: 'Price tracking should not be manual work.',
    problem_text: 'PRICELIO combines receipts, offers, and missions into one savings engine.',
    social_title: 'Live social proof',
    social_text: 'See how many receipts are scanned and how much users already saved.',
    stats_users: 'Active scanners',
    stats_receipts: 'Scanned receipts',
    stats_saved: 'Total saved amount',
    nav_demo: 'Demo',
    lang_label: 'Language',
    hero_secondary_cta: 'Open web app',
    hero_badge_live: 'Live 2026 beta',
    proof_title: 'Realtime trust layer',
    proof_text: 'Streams update instantly: XP, missions and receipt statuses without reload.',
    demo_title: 'Sandbox Demo',
    demo_sub: 'Try a virtual receipt and get a micro-win before signup.',
    demo_scan: 'Scan (Demo)',
    demo_success: 'Congrats! This receipt gave you +50 XP and unlocked a level-1 mission.',
    demo_claim_prompt: 'Want to save your points and unlock real discounts?',
    demo_claim_cta: 'Create account in 10 seconds',
    demo_session_expired: 'Demo session expired. Start again.',
    demo_preview_reward: 'Preview reward',
    scanning_now: 'Scanning...',
    auth_title: 'Join PRICELIO',
    auth_register: 'Create account',
    auth_login: 'Login',
    email: 'Email',
    password: 'Password',
    continue_google: 'Continue with Google (Coming soon)',
    continue_apple: 'Continue with Apple (Coming soon)',
    app_overview: 'Overview',
    app_receipts: 'Receipts',
    app_budget: 'Budget',
    app_missions: 'Missions',
    app_basket: 'Basket',
    app_profile: 'Profile',
    app_family: 'Family',
    app_leaderboard: 'Leaderboard',
    app_plus: 'Plus',
    app_kids: 'Kids',
    app_guest: 'Guest',
    app_logout: 'Logout',
    app_xp: 'XP',
    app_overview_title: 'Overview',
    app_rank: 'Rank',
    app_spendable_points: 'Spendable points',
    app_xp_to_next: 'To next level',
    app_badges: 'Badges',
    app_badge_receipt: 'Receipt Scout',
    app_badge_mission: 'Mission Runner',
    app_receipts_title: 'Receipt history',
    app_budget_title: 'Budget analytics',
    app_missions_title: 'Active missions',
    app_empty_receipts_title: 'No receipts yet',
    app_empty_receipts_text: 'Scan your first receipt and unlock starter XP bonus.',
    app_empty_missions_title: 'No missions right now',
    app_empty_missions_text: 'Check location again later and refresh nearby tasks.',
    app_empty_generic_action: 'Refresh',
    app_loading: 'Loading...',
    app_mission_expired: 'Expired',
    auth_validation_email: 'Enter a valid email address.',
    auth_validation_password: 'Password must be at least 8 characters.',
    auth_value_demo_bonus: 'Demo claim bonus',
    auth_value_realtime: 'Realtime mission and receipt updates',
    auth_value_security: 'Refresh cookies + CSRF protection',
    onboarding_1: 'Step 1: scan your first receipt.',
    onboarding_2: 'Step 2: activate a mission nearby.',
    onboarding_3: 'Step 3: track savings in the budget tab.',
    next: 'Next',
    complete: 'Finish',
    start: 'Start',
    logout: 'Logout'
  }
} as const;

type CopyKey = keyof typeof COPY.lt;

type I18nState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: CopyKey) => string;
};

function readInitialLang(): Lang {
  if (typeof window === 'undefined') return 'lt';
  const stored = String(localStorage.getItem('pricelio_lang_v2') || '').toLowerCase();
  if (stored === 'lt' || stored === 'en') {
    return stored;
  }
  const browser = String(navigator.language || 'lt').toLowerCase();
  if (browser.startsWith('en')) return 'en';
  return 'lt';
}

export const useI18n = create<I18nState>((set, get) => ({
  lang: readInitialLang(),
  setLang: (lang) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pricelio_lang_v2', lang);
    }
    set({ lang });
  },
  t: (key) => COPY[get().lang][key] ?? key
}));
