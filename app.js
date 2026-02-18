(() => {
  'use strict';

  const STORAGE_TOKEN_KEY = 'pricelio_access_token';
  const STORAGE_USER_KEY = 'pricelio_user_snapshot';
  const STORAGE_ONBOARDING_KEY = 'pricelio_onboarding_done_v1';
  const STORAGE_LANG_KEY = 'pricelio_lang';
  const SUPPORTED_LANGS = ['lt', 'en', 'lv', 'et', 'ru', 'pl', 'be', 'uk'];
  const LANG_LABELS = {
    lt: 'Lietuvių',
    en: 'English',
    lv: 'Latviešu',
    et: 'Eesti',
    ru: 'Русский',
    pl: 'Polski',
    be: 'Беларуская',
    uk: 'Українська'
  };

  const TRANSLATIONS = {
    en: {
      brand_name: 'PRICELIO',
      brand_tagline: 'Don't know if it's cheaper elsewhere? PRICELIO shows it instantly.',
      hero_launch_badge: '🇱🇹 Lithuania · Launching 2026',
      ov_hero_title: 'Smart Grocery Intelligence',
      ov_hero_sub: 'Scan receipts · compare prices · save every week',
      ov_chip_map: 'Explore Map',
      ov_chip_rank: 'Rankings',
      ov_chip_plus: 'Plus',
      guest_mode: 'Guest mode',
      home_btn: 'Home',
      refresh: 'Refresh',
      guide: 'Guide',
      try_now: 'Try now',
      go_login: 'Login',
      register_required_to_continue: 'Create an account or login to continue.',
      landing_headline: 'Stop overpaying for groceries and daily essentials.',
      landing_subline: 'Upload receipts, compare nearby prices, and find where to buy cheaper in seconds.',
      landing_device_hint: 'Best full experience on phone: receipt scan, location-aware prices, missions.',
      landing_device_hint_desktop: 'Desktop is great for browsing. For scans and missions, use your phone.',
      landing_device_hint_mobile: 'You are on mobile, full PRICELIO flow is available.',
      landing_card1_title: 'After purchase',
      landing_card1_text: 'See where you overpaid and how much you could have saved.',
      landing_card2_title: 'Before purchase',
      landing_card2_text: 'Search “Twix” and see prices in nearby stores.',
      landing_card3_title: 'For family',
      landing_card3_text: 'Shared lists, invites and shopping coordination in one place.',
      store_google_badge: 'Get it on Google Play',
      store_apple_badge: 'Download on the App Store',
      mockup_caption: 'You could save today',
      mockup_alt_store: 'Cheapest store: Lidl',
      mockup_basket: 'Basket plan',
      mockup_ready: 'Ready',
      social_proof_text: 'We are building a tool that will help Baltic families save every week.',
      waitlist_title: 'Get early access',
      waitlist_close: 'Close',
      waitlist_text: 'The app launches soon. Leave your email to get an invite and one free Plus week.',
      waitlist_email_placeholder: 'email@example.com',
      waitlist_submit: 'Get invite',
      waitlist_success: 'Thanks! You are on the early-access list.',
      landing_problem_eyebrow: 'Problem',
      landing_problem_title: '“Could I buy this cheaper elsewhere?” costs money every single week.',
      landing_problem_text: 'Most people discover overpaying only after they get home. PRICELIO connects real receipt prices, flyer deals, and online offers so your next shopping trip is cheaper.',
      landing_flow_eyebrow: 'How it works',
      landing_step1_title: 'Scan your receipt',
      landing_step1_text: 'AI extracts products, quantities, and prices while sensitive fields are masked.',
      landing_step2_title: 'Compare nearby prices',
      landing_step2_text: 'Search “Twix” and instantly see where it is cheaper around you.',
      landing_step3_title: 'Save on the next trip',
      landing_step3_text: 'Get a clear basket plan with store suggestions and savings impact.',
      landing_feat1_title: 'Post-purchase intelligence',
      landing_feat1_text: 'Overpay report, “ouch” score, and item-level alternatives.',
      landing_feat2_title: 'Pre-purchase search',
      landing_feat2_text: 'Single product comparison across nearby stores based on your location.',
      landing_feat3_title: 'Family workflows',
      landing_feat3_text: 'Shared lists, invite flow, and collaborative shopping execution.',
      landing_feat4_title: 'Missions + consensus',
      landing_feat4_text: 'Community verification with trust scores and anti-cheat checks.',
      landing_feat5_title: 'Kids mode',
      landing_feat5_text: 'Parent-controlled sessions with safe age-specific missions.',
      landing_feat6_title: 'Privacy first',
      landing_feat6_text: 'Only pricing-relevant data is used. Sensitive payment fragments are masked.',
      landing_trust_eyebrow: 'Current scope',
      landing_metric1: 'store chains',
      landing_metric2: 'physical store points',
      landing_metric3: 'OCR + validation stack',
      landing_metric4: 'launch market and currency',
      landing_final_title: 'Start testing now',
      landing_final_text: 'Click “Try now”, register, and start from your first receipt or product search.',
      nav_overview: 'Overview',
      nav_market: 'Market',
      nav_basket: 'Basket',
      nav_receipts: 'Receipts',
      nav_family: 'Family',
      nav_missions: 'Missions',
      nav_leaderboard: 'Leaderboard',
      nav_plus: 'Plus',
      nav_kids: 'Kids',
      nav_profile: 'Profile',
      auth_title: 'Auth',
      auth_subtitle: 'Login to unlock points, family, missions and kids mode.',
      register_title: 'Create account',
      login_title: 'Login',
      register_btn: 'Register',
      login_btn: 'Login',
      logout_btn: 'Logout',
      gamification_title: 'Gamification',
      kpi_rank: 'Rank',
      kpi_level: 'Level',
      kpi_lifetime_xp: 'Lifetime XP',
      kpi_spendable: 'Spendable',
      recent_points: 'Recent Points',
      store_map_title: 'Store map',
      search_compare_title: 'Search and compare',
      search_btn: 'Search',
      chip_all: 'All',
      chip_verified: 'Verified',
      radius_label: 'Radius (km)',
      basket_builder_title: 'Basket builder',
      basket_builder_subtitle: 'One line per item. Use format: milk x2.',
      build_basket_btn: 'Build Basket',
      optimize_btn: 'Optimize',
      best_plan_title: 'Best plan',
      upload_receipt_title: 'Receipt Scanner',
      receipt_subtitle: 'Upload or take a photo of your receipt',
      dropzone_hint: 'Drag & drop receipt here',
      dropzone_sub: 'or use the buttons below · JPEG, PNG up to 10MB',
      analyze_receipt_btn: 'Analyze',
      take_photo_btn: 'Camera',
      choose_gallery_btn: 'Gallery',
      select_receipt_first: 'Please select a receipt image first.',
      change_photo: 'Change',
      rp_uploading: 'Uploading',
      rp_scanning: 'AI Scanning',
      rp_matching: 'Price Match',
      rp_done: 'Done',
      report_empty_title: 'Your report will appear here',
      report_empty_sub: 'After scanning, we\'ll show which items you could have bought cheaper and where.',
      report_saved_label: 'Could save',
      report_verified_label: 'Verified',
      report_overpaid_label: 'Overpaid items',
      report_items_head: 'Receipt items',
      report_best_store: 'Best price at',
      report_ok_price: '✓ Good price',
      overpaid_report_title: 'Overpaid report',
      family_household_title: 'Family household',
      create_family_btn: 'Create Family',
      create_invite_btn: 'Create Invite',
      copy_token_btn: 'Copy Token',
      join_family_btn: 'Join Family',
      shared_lists_title: 'Shared lists',
      load_lists_btn: 'Load Lists',
      add_btn: 'Add',
      poll_family_events_btn: 'Poll Family Events',
      bounty_missions_title: 'Bounty missions',
      nearby_btn: 'Nearby',
      submit_verify_title: 'Submit / verify proof',
      submit_mission_btn: 'Submit Mission',
      verify_btn: 'Verify',
      status_btn: 'Status',
      global_leaderboard_title: 'Global leaderboard',
      friends_leaderboard_title: 'Friends leaderboard',
      refresh_global_btn: 'Refresh Global',
      refresh_friends_btn: 'Refresh Friends',
      plus_title: 'PRICELIO Plus',
      plus_subtitle: '2.99 EUR/month or 3000 points for 30 days.',
      load_features_btn: 'Load Features',
      subscribe_btn: 'Subscribe',
      unlock_points_btn: 'Unlock with Points',
      premium_insights_title: 'Premium insights',
      run_time_machine_btn: 'Run Time Machine',
      load_spending_btn: 'Load Spending Analytics',
      kids_mode_title: 'Kids mode (parent controlled)',
      kids_missions_title: 'Kids missions',
      load_btn: 'Load',
      submit_kids_mission_btn: 'Submit Kids Mission',
      activate_kids_btn: 'Activate Kids Mode',
      deactivate_btn: 'Deactivate',
      profile_title: 'Profile',
      rank_catalog_title: 'Rank catalog',
      load_ranks_btn: 'Load Ranks',
      email_placeholder: 'email@example.com',
      password_new_placeholder: 'password (min 8)',
      password_current_placeholder: 'password',
      search_placeholder: 'e.g. Twix - show cheapest nearby',
      basket_empty: 'Basket is empty.',
      family_name_placeholder: 'Family name',
      household_id_placeholder: 'Household ID',
      invite_email_placeholder: 'Invite email (optional for token-only invite)',
      invite_token_output_placeholder: 'Generated invite token will appear here',
      invite_token_placeholder: 'Invite token',
      new_list_item_placeholder: 'New list item',
      kid_name_placeholder: 'Kid display name',
      parent_pin_placeholder: 'Parent PIN',
      kids_session_placeholder: 'Kids session ID',
      session_id_placeholder: 'Session ID',
      lat_placeholder: 'Latitude',
      lon_placeholder: 'Longitude',
      mission_id_placeholder: 'Mission ID',
      canonical_product_placeholder: 'Canonical product name',
      barcode_placeholder: 'Barcode',
      store_chain_placeholder: 'Store chain',
      media_hash_placeholder: 'Media hash',
      submission_id_placeholder: 'Submission ID',
      proof_id_placeholder: 'Proof ID',
      time_machine_product_placeholder: 'Product ID for Time Machine',
      app_foreground_label: 'App was foreground',
      confirm_option: 'Confirm',
      reject_option: 'Reject',
      device_notice_title_mobile: 'Mobile mode',
      device_notice_text_mobile: 'All PRICELIO features are available. You can scan receipts and run missions faster.',
      device_notice_title_desktop: 'Desktop mode',
      device_notice_text_desktop: 'Some actions are phone-first. To use full receipt/missions flow, open PRICELIO on your phone.',
      signed_in_as: 'Signed in as {email}',
      tip_overview_title: 'Quick start',
      tip_overview_text: 'Register or login first to unlock points, ranks, family sync and missions.',
      tip_overview_cta: 'Go to Auth',
      tip_market_title: 'Map workflow',
      tip_market_text: 'Use filters for verified prices and distance, then search by product to compare stores.',
      tip_market_cta: 'Refresh Stores',
      tip_basket_title: 'Basket optimization',
      tip_basket_text: 'Enter one item per line using format like "milk x2", then build and optimize.',
      tip_basket_cta: 'Build Basket',
      tip_receipts_title: 'Receipt intelligence',
      tip_receipts_text: 'Upload a receipt photo to get overpay breakdown and future savings suggestions.',
      tip_receipts_cta: 'Analyze Receipt',
      tip_family_title: 'Family sync',
      tip_family_text: 'Create household, invite members, then manage shared list with event polling.',
      tip_family_cta: 'Load Lists',
      tip_missions_title: 'Bounty missions',
      tip_missions_text: 'Load nearby missions, start one, submit proof, then verify submissions.',
      tip_missions_cta: 'Load Missions',
      tip_leaderboard_title: 'Competition',
      tip_leaderboard_text: 'Track rank progression by lifetime XP. Friends board uses your active household members.',
      tip_leaderboard_cta: 'Refresh Global',
      tip_plus_title: 'Plus unlock',
      tip_plus_text: 'Core remains free. Unlock premium insights by subscription or redeeming points.',
      tip_plus_cta: 'Load Plus Status',
      tip_kids_title: 'Kids mode',
      tip_kids_text: 'Parent-controlled missions only. Activate session with PIN, then submit kid missions safely.',
      tip_kids_cta: 'Load Kids Missions',
      tip_profile_title: 'Profile and rank catalog',
      tip_profile_text: 'Review account info and inspect all 20 launch ranks with XP thresholds.',
      tip_profile_cta: 'Load Ranks',
      tip_more: 'More',
      tip_less: 'Less',
      awaiting_upload: 'Awaiting upload.',
      empty_points_events: 'No points events yet.',
      empty_profile: 'Login to see profile data.',
      empty_basket_plan: 'No optimization plan available yet.',
      empty_report: 'No report loaded.',
      empty_family_lists: 'No family lists found.',
      empty_family_events: 'No new family events.',
      empty_missions: 'No missions nearby.',
      empty_proof: 'No proof selected.',
      empty_leaderboard: 'No leaderboard data yet.',
      empty_plus_features: 'No plus features available.',
      empty_plus_status: 'No active plus entitlements.',
      empty_premium: 'No premium insights loaded yet.',
      empty_kids_missions: 'No kids missions available.',
      loading_ranks: 'Loading rank catalog...',
      no_rank_levels: 'No rank levels configured.',
      search_input_required: 'Type product name or barcode.',
      search_no_match: 'No matching products found.',
      onboarding_title: 'Welcome to PRICELIO',
      onboarding_close: 'Close',
      onboarding_back: 'Back',
      onboarding_skip: 'Skip',
      onboarding_next: 'Next',
      onboarding_finish: 'Finish',
      onboarding_step_start_title: 'Start Here',
      onboarding_step_start_text: 'Create account or login to activate points, missions, family and kids mode.',
      onboarding_step_market_title: 'Check Market',
      onboarding_step_market_text: 'Use map filters and product search to see where the best price is now.',
      onboarding_step_basket_title: 'Build Basket',
      onboarding_step_basket_text: 'Create your shopping basket and run optimization to get the cheapest plan.',
      onboarding_step_receipts_title: 'Upload Receipt',
      onboarding_step_receipts_text: 'Scan receipts to detect overpay and strengthen your city-level price truth.',
      onboarding_step_family_title: 'Family Sync',
      onboarding_step_family_text: 'Create household and shared lists so everyone can coordinate purchases.',
      onboarding_step_missions_title: 'Missions & Proof',
      onboarding_step_missions_text: 'Submit and verify product proof to earn points and improve data quality.',
      onboarding_step_plus_title: 'Plus Economy',
      onboarding_step_plus_text: 'Unlock premium insights via subscription or with redeemable points.',
      onboarding_complete: 'Onboarding complete. Use Guide anytime.',
      onboarding_skipped: 'Onboarding skipped. You can reopen with Guide.',
      scan_ready: 'Ready: {file}',
      scan_status: 'Status: {status} ({progress}%)',
      uploading_receipt: 'Uploading receipt...',
      receipt_uploaded: 'Receipt uploaded: {id}',
      still_processing: 'Still processing. Try refresh later.',
      receipt_analysis_complete: 'Receipt analysis complete.',
      mission_selected_for_submit: 'Mission {id} selected for submit.'
    },
    lt: {
      brand_name: 'PRICELIO',
      brand_tagline: 'Nežinai, ar kitur pigiau? PRICELIO parodo iškart.',
      hero_launch_badge: '🇱🇹 Lietuva · Startuojame 2026',
      ov_hero_title: 'Išmanus kainų palyginimas',
      ov_hero_sub: 'Skenuok čekius · lygink kainas · taupyk kas savaitę',
      ov_chip_map: 'Žemėlapis',
      ov_chip_rank: 'Reitingai',
      ov_chip_plus: 'Plus',
      guest_mode: 'Svečio režimas',
      home_btn: 'Pradžia',
      refresh: 'Atnaujinti',
      guide: 'Gidas',
      try_now: 'Noriu išbandyti',
      go_login: 'Prisijungti',
      register_required_to_continue: 'Norėdami tęsti, susikurkite paskyrą arba prisijunkite.',
      landing_headline: 'Nustok permokėti už maistą ir kasdienes prekes.',
      landing_subline: 'Įkelk čekį, palygink kainas aplink save ir per kelias sekundes sužinok, kur pirkti pigiau.',
      landing_device_hint: 'Pilna patirtis telefone: čekių skenavimas, lokacija, misijos.',
      landing_device_hint_desktop: 'Kompiuteris puikiai tinka peržiūrai. Čekių skenavimui ir misijoms naudok telefoną.',
      landing_device_hint_mobile: 'Naudoji telefoną, pilna PRICELIO patirtis pasiekiama.',
      landing_card1_title: 'Po pirkimo',
      landing_card1_text: 'Parodo, kur permokėjai ir kiek galėjai sutaupyti.',
      landing_card2_title: 'Prieš pirkimą',
      landing_card2_text: 'Įvesk „Twix“ ir matysi kainas aplinkinėse parduotuvėse.',
      landing_card3_title: 'Šeimai',
      landing_card3_text: 'Bendri sąrašai, pakvietimai ir pirkinių koordinacija vienoje vietoje.',
      store_google_badge: 'Gauk per Google Play',
      store_apple_badge: 'Atsisiųsk per App Store',
      mockup_caption: 'Šiandien būtum sutaupęs',
      mockup_alt_store: 'Pigiausia: Lidl',
      mockup_basket: 'Krepšelio planas',
      mockup_ready: 'Paruoštas',
      social_proof_text: 'Jau dabar kuriame įrankį, kuris padės Lietuvos šeimoms sutaupyti kiekvieną savaitę.',
      waitlist_title: 'Gauk ankstyvą prieigą',
      waitlist_close: 'Uždaryti',
      waitlist_text: 'Programėlė netrukus startuoja. Palik el. paštą ir gausi kvietimą bei Plus savaitę nemokamai.',
      waitlist_email_placeholder: 'el.pastas@example.com',
      waitlist_submit: 'Gauti kvietimą',
      waitlist_success: 'Ačiū! Įtraukėme jus į ankstyvos prieigos sąrašą.',
      landing_problem_eyebrow: 'Problema',
      landing_problem_title: '„Ar kitur nebuvo pigiau?“ šis klausimas kainuoja pinigus kas savaitę.',
      landing_problem_text: 'Dauguma žmonių supranta, kad permokėjo, tik grįžę namo. PRICELIO sujungia realias čekių kainas, akcijų leidinius ir internetines kainas.',
      landing_flow_eyebrow: 'Kaip veikia',
      landing_step1_title: 'Nufotografuok čekį',
      landing_step1_text: 'AI atpažįsta prekes, kiekius ir kainas, o jautri informacija užmaskuojama.',
      landing_step2_title: 'Palygink kainas aplink',
      landing_step2_text: 'Ieškai „Twix“ ir iškart matai, kur aplink tave pigiau.',
      landing_step3_title: 'Sutaupyk kitą kartą',
      landing_step3_text: 'Sistema pateikia aiškų krepšelio planą su parduotuvėmis ir taupymo suma.',
      landing_feat1_title: 'Po pirkimo analizė',
      landing_feat1_text: 'Permokėjimo ataskaita, „ouch“ suma ir aiškios alternatyvos.',
      landing_feat2_title: 'Prieš pirkimą paieška',
      landing_feat2_text: 'Vienos prekės palyginimas daugelyje parduotuvių pagal tavo vietą.',
      landing_feat3_title: 'Šeimos režimas',
      landing_feat3_text: 'Bendri sąrašai, pakvietimai ir koordinuotas apsipirkimas.',
      landing_feat4_title: 'Misijos ir konsensusas',
      landing_feat4_text: 'Kainų tikrinimas per bendruomenę su pasitikėjimo balais.',
      landing_feat5_title: 'Vaikų režimas',
      landing_feat5_text: 'Tėvų valdomos sesijos su saugiomis amžiaus grupių misijomis.',
      landing_feat6_title: 'Privatumas pirmoje vietoje',
      landing_feat6_text: 'Naudojami tik kainų analizei reikalingi duomenys, jautrūs laukai maskuojami.',
      landing_trust_eyebrow: 'Esama apimtis',
      landing_metric1: 'parduotuvių tinklas',
      landing_metric2: 'fizinių parduotuvių taškų',
      landing_metric3: 'OCR + validacijos sistema',
      landing_metric4: 'paleidimo rinka ir valiuta',
      landing_final_title: 'Pradėk testuoti dabar',
      landing_final_text: 'Spausk „Noriu išbandyti“, susikurk paskyrą ir pradėk nuo pirmo čekio ar prekės paieškos.',
      nav_overview: 'Apžvalga',
      nav_market: 'Rinka',
      nav_basket: 'Krepšelis',
      nav_receipts: 'Čekiai',
      nav_family: 'Šeima',
      nav_missions: 'Misijos',
      nav_leaderboard: 'Reitingas',
      nav_plus: 'Plus',
      nav_kids: 'Vaikai',
      nav_profile: 'Profilis',
      auth_title: 'Paskyra',
      auth_subtitle: 'Prisijunk ir atrakink taškus, šeimą, misijas ir vaikų režimą.',
      register_title: 'Sukurti paskyrą',
      login_title: 'Prisijungimas',
      register_btn: 'Registruotis',
      login_btn: 'Prisijungti',
      logout_btn: 'Atsijungti',
      gamification_title: 'Taškai ir lygiai',
      kpi_rank: 'Rangas',
      kpi_level: 'Lygis',
      kpi_lifetime_xp: 'Viso XP',
      kpi_spendable: 'Taškai',
      recent_points: 'Naujausi taškai',
      store_map_title: 'Parduotuvių žemėlapis',
      search_compare_title: 'Paieška ir palyginimas',
      search_btn: 'Ieškoti',
      chip_all: 'Visos',
      chip_verified: 'Patikrintos',
      radius_label: 'Spindulys (km)',
      basket_builder_title: 'Krepšelio sudarymas',
      basket_builder_subtitle: 'Viena eilutė vienai prekei. Pvz: pienas x2.',
      build_basket_btn: 'Sudaryti krepšelį',
      optimize_btn: 'Optimizuoti',
      best_plan_title: 'Geriausias planas',
      upload_receipt_title: 'Čekio skaitytuvas',
      receipt_subtitle: 'Įkelkite arba nufotografuokite čekį',
      dropzone_hint: 'Tempkite čekį čia',
      dropzone_sub: 'arba naudokite mygtukus žemiau · JPEG, PNG iki 10MB',
      analyze_receipt_btn: 'Analizuoti',
      take_photo_btn: 'Kamera',
      choose_gallery_btn: 'Galerija',
      select_receipt_first: 'Pirmiausia pasirinkite čekio nuotrauką.',
      change_photo: 'Keisti',
      rp_uploading: 'Įkeliama',
      rp_scanning: 'AI skaito',
      rp_matching: 'Kainos',
      rp_done: 'Baigta',
      report_empty_title: 'Čia pasirodys jūsų ataskaita',
      report_empty_sub: 'Po nuskaitymo matysime, kur galėjote pirkti pigiau.',
      report_saved_label: 'Galima sutaupyti',
      report_verified_label: 'Patikrinta',
      report_overpaid_label: 'Permokėta pozicijų',
      report_items_head: 'Čekio pozicijos',
      report_best_store: 'Geriausia kaina',
      report_ok_price: '✓ Gera kaina',
      overpaid_report_title: 'Permokėjimo ataskaita',
      family_household_title: 'Šeimos namų ūkis',
      create_family_btn: 'Sukurti šeimą',
      create_invite_btn: 'Sukurti pakvietimą',
      copy_token_btn: 'Kopijuoti kodą',
      join_family_btn: 'Prisijungti prie šeimos',
      shared_lists_title: 'Bendri sąrašai',
      load_lists_btn: 'Įkelti sąrašus',
      add_btn: 'Pridėti',
      poll_family_events_btn: 'Atnaujinti šeimos įvykius',
      bounty_missions_title: 'Misijos',
      nearby_btn: 'Aplink',
      submit_verify_title: 'Pateikimas / patvirtinimas',
      submit_mission_btn: 'Pateikti misiją',
      verify_btn: 'Patvirtinti',
      status_btn: 'Būsena',
      global_leaderboard_title: 'Globalus reitingas',
      friends_leaderboard_title: 'Draugų reitingas',
      refresh_global_btn: 'Atnaujinti globalų',
      refresh_friends_btn: 'Atnaujinti draugus',
      plus_title: 'PRICELIO Plus',
      plus_subtitle: '2.99 EUR/mėn. arba 3000 taškų už 30 dienų.',
      load_features_btn: 'Įkelti funkcijas',
      subscribe_btn: 'Prenumeruoti',
      unlock_points_btn: 'Atrakinti taškais',
      premium_insights_title: 'Premium įžvalgos',
      run_time_machine_btn: 'Paleisti Time Machine',
      load_spending_btn: 'Rodyti išlaidų analitiką',
      kids_mode_title: 'Vaikų režimas (tėvų kontrolė)',
      kids_missions_title: 'Vaikų misijos',
      load_btn: 'Įkelti',
      submit_kids_mission_btn: 'Pateikti vaiko misiją',
      activate_kids_btn: 'Aktyvuoti vaikų režimą',
      deactivate_btn: 'Išjungti',
      profile_title: 'Profilis',
      rank_catalog_title: 'Lygių katalogas',
      load_ranks_btn: 'Įkelti lygius',
      email_placeholder: 'el.pastas@example.com',
      password_new_placeholder: 'slaptažodis (min 8)',
      password_current_placeholder: 'slaptažodis',
      search_placeholder: 'Pvz: Twix - rodyk pigiausią aplink mane',
      basket_empty: 'Krepšelis tuščias.',
      family_name_placeholder: 'Šeimos pavadinimas',
      household_id_placeholder: 'Šeimos ID',
      invite_email_placeholder: 'Pakvietimo el. paštas (nebūtinas)',
      invite_token_output_placeholder: 'Sugeneruotas pakvietimo kodas bus čia',
      invite_token_placeholder: 'Pakvietimo kodas',
      new_list_item_placeholder: 'Naujas sąrašo įrašas',
      kid_name_placeholder: 'Vaiko vardas',
      parent_pin_placeholder: 'Tėvų PIN',
      kids_session_placeholder: 'Vaiko sesijos ID',
      session_id_placeholder: 'Sesijos ID',
      lat_placeholder: 'Platuma',
      lon_placeholder: 'Ilguma',
      mission_id_placeholder: 'Misijos ID',
      canonical_product_placeholder: 'Kanoninis prekės pavadinimas',
      barcode_placeholder: 'Brūkšninis kodas',
      store_chain_placeholder: 'Parduotuvės tinklas',
      media_hash_placeholder: 'Failo hash',
      submission_id_placeholder: 'Pateikimo ID',
      proof_id_placeholder: 'Įrodymo ID',
      time_machine_product_placeholder: 'Prekės ID Time Machine funkcijai',
      app_foreground_label: 'Programėlė buvo pirmame plane',
      confirm_option: 'Patvirtinti',
      reject_option: 'Atmesti',
      device_notice_title_mobile: 'Telefono režimas',
      device_notice_text_mobile: 'Aktyvios visos PRICELIO funkcijos: čekiai, lokacija, misijos.',
      device_notice_title_desktop: 'Kompiuterio režimas',
      device_notice_text_desktop: 'Dalis veiksmų skirti telefonui. Pilnam čekių/misijų naudojimui atsidaryk PRICELIO telefone.',
      signed_in_as: 'Prisijungta: {email}',
      tip_overview_title: 'Greita pradžia',
      tip_overview_text: 'Pirmiausia registruokis arba prisijunk, kad atrakintum taškus, šeimą ir misijas.',
      tip_overview_cta: 'Į autorizaciją',
      tip_market_title: 'Žemėlapio eiga',
      tip_market_text: 'Naudok filtrus pagal atstumą ir patvirtintas kainas, tada ieškok prekės.',
      tip_market_cta: 'Atnaujinti parduotuves',
      tip_basket_title: 'Krepšelio optimizacija',
      tip_basket_text: 'Viena eilutė vienai prekei, pvz. "pienas x2", tada sudaryk ir optimizuok.',
      tip_basket_cta: 'Sudaryti krepšelį',
      tip_receipts_title: 'Čekio analizė',
      tip_receipts_text: 'Įkelk čekį ir pamatysi, kur permokėjai bei ką pirkti pigiau kitą kartą.',
      tip_receipts_cta: 'Analizuoti čekį',
      tip_family_title: 'Šeimos sinchronizacija',
      tip_family_text: 'Sukurk namų ūkį, pakviesk narius ir valdyk bendrą sąrašą su įvykių atnaujinimu.',
      tip_family_cta: 'Įkelti sąrašus',
      tip_missions_title: 'Misijos',
      tip_missions_text: 'Gauk misijas aplink save, pateik įrodymus ir tikrink kitų pateikimus.',
      tip_missions_cta: 'Įkelti misijas',
      tip_leaderboard_title: 'Reitingas',
      tip_leaderboard_text: 'Stebėk rangų augimą pagal XP. Draugų lentelė naudoja aktyvius šeimos narius.',
      tip_leaderboard_cta: 'Atnaujinti globalų',
      tip_plus_title: 'Plus atrakinimas',
      tip_plus_text: 'Branduolys lieka nemokamas. Premium įžvalgas atrakink prenumerata arba taškais.',
      tip_plus_cta: 'Įkelti Plus būseną',
      tip_kids_title: 'Vaikų režimas',
      tip_kids_text: 'Tik tėvų valdomos misijos. Aktyvuok sesiją su PIN ir saugiai pateik vaiko misijas.',
      tip_kids_cta: 'Įkelti vaikų misijas',
      tip_profile_title: 'Profilis ir rangų katalogas',
      tip_profile_text: 'Peržiūrėk paskyros informaciją ir visus 20 starto rangų su XP slenksčiais.',
      tip_profile_cta: 'Įkelti rangus',
      tip_more: 'Daugiau',
      tip_less: 'Mažiau',
      awaiting_upload: 'Laukiama įkėlimo.',
      empty_points_events: 'Dar nėra taškų įrašų.',
      empty_profile: 'Prisijunkite, kad matytumėte profilio duomenis.',
      empty_basket_plan: 'Optimizavimo planas dar nesukurtas.',
      empty_report: 'Ataskaita dar neužkrauta.',
      empty_family_lists: 'Šeimos sąrašų dar nėra.',
      empty_family_events: 'Naujų šeimos įvykių nėra.',
      empty_missions: 'Aplink misijų nerasta.',
      empty_proof: 'Įrodymas dar nepasirinktas.',
      empty_leaderboard: 'Reitingo duomenų dar nėra.',
      empty_plus_features: 'Plus funkcijų duomenys nepasiekiami.',
      empty_plus_status: 'Aktyvių Plus teisių nėra.',
      empty_premium: 'Premium įžvalgos dar neužkrautos.',
      empty_kids_missions: 'Vaikų misijų nėra.',
      loading_ranks: 'Įkeliamas rangų katalogas...',
      no_rank_levels: 'Rangų lygiai nesukonfigūruoti.',
      search_input_required: 'Įveskite prekės pavadinimą arba brūkšninį kodą.',
      search_no_match: 'Atitinkančių prekių nerasta.',
      onboarding_title: 'Sveiki atvykę į PRICELIO',
      onboarding_close: 'Uždaryti',
      onboarding_back: 'Atgal',
      onboarding_skip: 'Praleisti',
      onboarding_next: 'Toliau',
      onboarding_finish: 'Baigti',
      onboarding_step_start_title: 'Pradėkite čia',
      onboarding_step_start_text: 'Sukurkite paskyrą arba prisijunkite, kad aktyvuotumėte taškus, misijas, šeimą ir vaikų režimą.',
      onboarding_step_market_title: 'Patikrinkite rinką',
      onboarding_step_market_text: 'Naudokite žemėlapio filtrus ir prekių paiešką, kad rastumėte geriausią kainą.',
      onboarding_step_basket_title: 'Sudarykite krepšelį',
      onboarding_step_basket_text: 'Sukurkite pirkinių krepšelį ir paleiskite optimizaciją.',
      onboarding_step_receipts_title: 'Įkelkite čekį',
      onboarding_step_receipts_text: 'Nuskenuokite čekį, pamatykite permokėjimą ir sustiprinkite kainų duomenis.',
      onboarding_step_family_title: 'Šeimos sinchronizacija',
      onboarding_step_family_text: 'Sukurkite namų ūkį ir bendrus sąrašus visai šeimai.',
      onboarding_step_missions_title: 'Misijos ir įrodymai',
      onboarding_step_missions_text: 'Pateikite ir tikrinkite įrodymus, kad rinktumėte taškus.',
      onboarding_step_plus_title: 'Plus ekonomika',
      onboarding_step_plus_text: 'Atrakinkite premium įžvalgas su prenumerata arba taškais.',
      onboarding_complete: 'Gidas baigtas. Bet kada galite atsidaryti per „Gidas“.',
      onboarding_skipped: 'Gidas praleistas. Galite atidaryti vėliau.',
      scan_ready: 'Paruošta: {file}',
      scan_status: 'Būsena: {status} ({progress}%)',
      uploading_receipt: 'Įkeliamas čekis...',
      receipt_uploaded: 'Čekis įkeltas: {id}',
      still_processing: 'Vis dar apdorojama. Pabandykite atnaujinti vėliau.',
      receipt_analysis_complete: 'Čekio analizė baigta.',
      mission_selected_for_submit: 'Misija {id} parinkta pateikimui.'
    }
  };
  const EXTRA_LANG_OVERRIDES = {
    lv: {
      brand_tagline: 'Gudrs pārtikas cenu asistents Baltijas pircējiem.',
      try_now: 'Izmēģināt',
      go_login: 'Pieteikties',
      home_btn: 'Sākums',
      register_required_to_continue: 'Lai turpinātu, reģistrējies vai pieslēdzies.',
      landing_headline: 'Iepērcies gudrāk. Zini, kur pārmaksā.',
      landing_subline: 'Augšupielādē čekus, salīdzini cenas sev apkārt un nākamreiz pērc lētāk.',
      nav_overview: 'Pārskats',
      nav_market: 'Tirgus',
      nav_basket: 'Grozs',
      nav_receipts: 'Čeki',
      nav_family: 'Ģimene',
      nav_missions: 'Misijas',
      nav_leaderboard: 'Reitings',
      nav_profile: 'Profils'
    },
    et: {
      brand_tagline: 'Nutikas toiduhindade assistent Balti ostjatele.',
      try_now: 'Proovi',
      go_login: 'Logi sisse',
      home_btn: 'Avaleht',
      register_required_to_continue: 'Jätkamiseks loo konto või logi sisse.',
      landing_headline: 'Osta targemalt. Tea, kus maksad üle.',
      landing_subline: 'Laadi tšekid üles, võrdle hindu enda ümber ja osta järgmisel korral soodsamalt.',
      nav_overview: 'Ülevaade',
      nav_market: 'Turg',
      nav_basket: 'Korv',
      nav_receipts: 'Tšekid',
      nav_family: 'Pere',
      nav_missions: 'Missioonid',
      nav_leaderboard: 'Edetabel',
      nav_profile: 'Profiil'
    },
    ru: {
      brand_tagline: 'Умный помощник по ценам для покупателей Балтии.',
      try_now: 'Попробовать',
      go_login: 'Войти',
      home_btn: 'Главная',
      register_required_to_continue: 'Чтобы продолжить, зарегистрируйтесь или войдите.',
      landing_headline: 'Покупай умнее. Знай, где переплачиваешь.',
      landing_subline: 'Загружай чеки, сравнивай цены рядом и в следующий раз покупай дешевле.',
      nav_overview: 'Обзор',
      nav_market: 'Рынок',
      nav_basket: 'Корзина',
      nav_receipts: 'Чеки',
      nav_family: 'Семья',
      nav_missions: 'Миссии',
      nav_leaderboard: 'Рейтинг',
      nav_profile: 'Профиль'
    },
    pl: {
      brand_tagline: 'Inteligentny asystent cenowy dla kupujących w krajach bałtyckich.',
      try_now: 'Wypróbuj',
      go_login: 'Zaloguj',
      home_btn: 'Start',
      register_required_to_continue: 'Aby kontynuować, zarejestruj się lub zaloguj.',
      landing_headline: 'Kupuj mądrzej. Wiedz, gdzie przepłacasz.',
      landing_subline: 'Wgraj paragony, porównaj ceny w pobliżu i następnym razem kupuj taniej.',
      nav_overview: 'Przegląd',
      nav_market: 'Rynek',
      nav_basket: 'Koszyk',
      nav_receipts: 'Paragony',
      nav_family: 'Rodzina',
      nav_missions: 'Misje',
      nav_leaderboard: 'Ranking',
      nav_profile: 'Profil'
    },
    be: {
      brand_tagline: 'Разумны цэнавы асістэнт для пакупнікоў Балтыі.',
      try_now: 'Паспрабаваць',
      go_login: 'Увайсці',
      home_btn: 'Галоўная',
      register_required_to_continue: 'Каб працягнуць, зарэгіструйцеся або ўвайдзіце.',
      landing_headline: 'Купляй разумней. Ведай, дзе пераплочваеш.',
      landing_subline: 'Загружай чэкі, параўноўвай цэны побач і наступны раз купляй танней.',
      nav_overview: 'Агляд',
      nav_market: 'Рынак',
      nav_basket: 'Кошык',
      nav_receipts: 'Чэкі',
      nav_family: 'Сямʼя',
      nav_missions: 'Місіі',
      nav_leaderboard: 'Рэйтынг',
      nav_profile: 'Профіль'
    },
    uk: {
      brand_tagline: 'Розумний ціновий асистент для покупців Балтії.',
      try_now: 'Спробувати',
      go_login: 'Увійти',
      home_btn: 'Головна',
      register_required_to_continue: 'Щоб продовжити, зареєструйтесь або увійдіть.',
      landing_headline: 'Купуй розумніше. Знай, де переплачуєш.',
      landing_subline: 'Завантажуй чеки, порівнюй ціни поруч і наступного разу купуй дешевше.',
      nav_overview: 'Огляд',
      nav_market: 'Ринок',
      nav_basket: 'Кошик',
      nav_receipts: 'Чеки',
      nav_family: 'Сімʼя',
      nav_missions: 'Місії',
      nav_leaderboard: 'Рейтинг',
      nav_profile: 'Профіль'
    }
  };
  for (const lang of SUPPORTED_LANGS) {
    if (!TRANSLATIONS[lang]) {
      TRANSLATIONS[lang] = { ...TRANSLATIONS.en };
    }
  }
  for (const [lang, overrides] of Object.entries(EXTRA_LANG_OVERRIDES)) {
    TRANSLATIONS[lang] = { ...TRANSLATIONS.en, ...overrides };
  }

  const state = {
    token: localStorage.getItem(STORAGE_TOKEN_KEY) || '',
    user: (() => {
      const raw = localStorage.getItem(STORAGE_USER_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    })(),
    currentView: document.body.dataset.view || 'overview',
    map: null,
    mapMarkers: [],
    mapFilters: {
      category: 'All',
      verified: false,
      maxDistance: null,
      lat: null,
      lon: null,
      cityId: null,
      city: 'Vilnius'
    },
    activeBasketId: null,
    activeBasketItems: [],
    lastReceiptId: null,
    activeHouseholdId: '',
    familyLists: [],
    familyEventCursor: 0,
    kidsSessionId: '',
    currentLocation: null,
    currentLocationAt: 0,
    device: 'desktop',
    language: 'en',
    experienceStarted: false,
    appBootstrapped: false,
    onboardingReady: false,
    setView: null
  };

  function resolveApiBase() {
    if (window.PRICELIO_API) return window.PRICELIO_API;
    if (window.RECEIPT_RADAR_API) return window.RECEIPT_RADAR_API;

    const { protocol, hostname, port, origin } = window.location;
    const isHttp = protocol === 'http:' || protocol === 'https:';

    if (hostname === 'pricelio.app' || hostname === 'www.pricelio.app') {
      return 'https://api.pricelio.app';
    }

    const isLikelyStaticDevPort = port === '8000' || port === '8080' || port === '4173' || port === '5173';
    if (isHttp && isLikelyStaticDevPort) {
      const scheme = protocol === 'https:' ? 'https' : 'http';
      return `${scheme}://${hostname}:3000`;
    }

    if (isHttp && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return 'http://localhost:3000';
    }

    // VPS or bare IP without explicit port → API runs on :3000
    if (isHttp && !port && hostname !== 'pricelio.app') {
      const scheme = protocol === 'https:' ? 'https' : 'http';
      return `${scheme}://${hostname}:3000`;
    }

    return origin;
  }

  const API_BASE = resolveApiBase();

  class ApiError extends Error {
    constructor(message, status = 0, data = null) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  }

  const $ = (id) => document.getElementById(id);

  function sanitize(value) {
    return String(value == null ? '' : value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeLang(code) {
    if (!code) return null;
    const normalized = String(code).toLowerCase().replace('_', '-');
    const base = normalized.split('-')[0];
    return SUPPORTED_LANGS.includes(base) ? base : null;
  }

  function detectPreferredLanguage() {
    const fromStorage = normalizeLang(localStorage.getItem(STORAGE_LANG_KEY));
    if (fromStorage) return fromStorage;

    const browserCandidates = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language
    ].filter(Boolean);

    for (const candidate of browserCandidates) {
      const match = normalizeLang(candidate);
      if (match) return match;
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Vilnius')) return 'lt';
    if (tz.includes('Riga')) return 'lv';
    if (tz.includes('Tallinn')) return 'et';
    if (tz.includes('Warsaw')) return 'pl';
    if (tz.includes('Minsk')) return 'be';
    if (tz.includes('Kyiv') || tz.includes('Kiev')) return 'uk';
    if (tz.includes('Moscow')) return 'ru';
    return 'en';
  }

  function detectDevice() {
    const ua = navigator.userAgent || '';
    const touch = window.matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 1;
    const mobileUa = /android|iphone|ipad|ipod|mobile/i.test(ua);
    const compactViewport = window.matchMedia('(max-width: 960px)').matches;
    return mobileUa || (touch && compactViewport) ? 'mobile' : 'desktop';
  }

  function t(key, vars = {}) {
    const lang = state.language || 'en';
    const source =
      TRANSLATIONS[lang]?.[key] ??
      TRANSLATIONS.lt?.[key] ??
      TRANSLATIONS.en?.[key] ??
      String(key).replace(/_/g, ' ');
    return String(source).replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ''));
  }

  function applyTranslations() {
    document.documentElement.lang = state.language;

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n');
      if (!key) return;
      element.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (!key) return;
      element.setAttribute('placeholder', t(key));
    });

    const langSelect = $('languageSelect');
    const landingLangSelect = $('landingLanguageSelect');
    if (langSelect) langSelect.value = state.language;
    if (landingLangSelect) landingLangSelect.value = state.language;
    const helpTourBtn = $('helpTourBtn');
    if (helpTourBtn) {
      helpTourBtn.textContent = '?';
      helpTourBtn.title = t('guide');
      helpTourBtn.setAttribute('aria-label', t('guide'));
    }
    renderAuthState();
    if (typeof state.setView === 'function') {
      updateContextTip(state.currentView);
    }
  }

  function buildLanguageOptions(select) {
    if (!select) return;
    select.innerHTML = SUPPORTED_LANGS.map((lang) => `<option value="${lang}">${LANG_LABELS[lang] || lang.toUpperCase()}</option>`).join('');
    select.value = state.language;
  }

  function setupLanguage() {
    state.language = detectPreferredLanguage();
    buildLanguageOptions($('languageSelect'));
    buildLanguageOptions($('landingLanguageSelect'));
    applyTranslations();

    const handleChange = (event) => {
      const next = normalizeLang(event.target.value) || 'en';
      state.language = next;
      localStorage.setItem(STORAGE_LANG_KEY, next);
      applyTranslations();
      applyDeviceNotice();
    };
    $('languageSelect')?.addEventListener('change', handleChange);
    $('landingLanguageSelect')?.addEventListener('change', handleChange);
  }

  function applyDeviceNotice() {
    const body = document.body;
    body.dataset.device = state.device;

    const hint = $('deviceHintText');
    if (hint) {
      hint.textContent = t(state.device === 'mobile' ? 'landing_device_hint_mobile' : 'landing_device_hint_desktop');
    }

    const notice = $('deviceCapabilityNotice');
    if (notice) {
      const title = t(state.device === 'mobile' ? 'device_notice_title_mobile' : 'device_notice_title_desktop');
      const text = t(state.device === 'mobile' ? 'device_notice_text_mobile' : 'device_notice_text_desktop');
      notice.innerHTML = `<div class="context-tip-main"><h3>${sanitize(title)}</h3><p>${sanitize(text)}</p></div>`;
    }

    const mobilePrimaryActions = document.querySelectorAll('.mobile-primary-action');
    mobilePrimaryActions.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (state.device === 'desktop') {
        button.disabled = true;
        button.classList.add('is-mobile-disabled');
        button.title = t('device_notice_text_desktop');
      } else {
        button.disabled = false;
        button.classList.remove('is-mobile-disabled');
        button.title = '';
      }
    });
  }

  function setupDeviceWatcher() {
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const nextDevice = detectDevice();
        if (nextDevice !== state.device) {
          state.device = nextDevice;
          applyDeviceNotice();
        }
      }, 120);
    });
  }

  function setExperienceMode(mode) {
    document.body.dataset.mode = mode;
  }

  async function startAppExperience({ focusAuth = false } = {}) {
    state.experienceStarted = true;
    setExperienceMode('app');

    if (!state.appBootstrapped) {
      initMap();
      runEntranceAnimations();
      if (!state.onboardingReady) {
        setupOnboarding();
        state.onboardingReady = true;
      }
      await Promise.allSettled([
        refreshAuthedPanels(),
        loadMapStores(),
        loadGlobalLeaderboard(),
        loadPlusFeatures(),
        loadRankCatalog()
      ]);
      state.appBootstrapped = true;
    } else if (state.map) {
      state.map.invalidateSize();
    }

    if (focusAuth) {
      state.setView?.('overview');
      $('registerEmail')?.focus();
      if (!state.token) {
        showToast(t('register_required_to_continue'), 'info');
      }
    }
  }

  function returnToLanding() {
    setExperienceMode('landing');
    if (state.map) {
      setTimeout(() => state.map.invalidateSize(), 120);
    }
  }

  function setupWaitlistModal() {
    const modal = $('waitlistModal');
    const emailInput = $('waitlistEmail');
    const form = $('waitlistForm');
    const closeBtn = $('waitlistCloseBtn');
    if (!modal || !emailInput || !form || !closeBtn) return;

    const open = () => {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      setTimeout(() => emailInput.focus(), 30);
    };
    const close = () => {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    };

    $('storeGoogleBtn')?.addEventListener('click', (event) => {
      event.preventDefault();
      open();
    });
    $('storeAppleBtn')?.addEventListener('click', (event) => {
      event.preventDefault();
      open();
    });
    closeBtn.addEventListener('click', () => close());
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('active')) {
        close();
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = emailInput.value.trim();
      if (!email) return;
      showToast(t('waitlist_success'), 'success');
      try {
        const history = JSON.parse(localStorage.getItem('pricelio_waitlist_emails') || '[]');
        history.push({ email, at: new Date().toISOString() });
        localStorage.setItem('pricelio_waitlist_emails', JSON.stringify(history.slice(-50)));
      } catch (error) {
        // Non-blocking.
      }
      form.reset();
      close();
    });
  }

  function setupAuthTabs() {
    const tabRegister = $('tabRegister');
    const tabLogin = $('tabLogin');
    const formRegister = $('registerForm');
    const formLogin = $('loginForm');
    if (!tabRegister || !tabLogin) return;

    function showTab(which) {
      tabRegister.classList.toggle('active', which === 'register');
      tabLogin.classList.toggle('active', which === 'login');
      formRegister?.classList.toggle('active', which === 'register');
      formLogin?.classList.toggle('active', which === 'login');
    }

    tabRegister.addEventListener('click', () => showTab('register'));
    tabLogin.addEventListener('click', () => showTab('login'));
  }

  function setupExperienceEntry() {
    const openTry = (focusAuth = false) => {
      startAppExperience({ focusAuth }).catch((error) => {
        showToast(`Initialization failed: ${error.message || error}`, 'error');
      });
    };

    $('startExperienceBtn')?.addEventListener('click', () => openTry(true));
    $('startExperienceSecondaryBtn')?.addEventListener('click', () => openTry(true));
    $('startExperienceLoginBtn')?.addEventListener('click', () => openTry(true));
    $('startExperienceFinalBtn')?.addEventListener('click', () => openTry(true));
    // Mobile sticky CTA bar buttons
    $('mobileTryBtn')?.addEventListener('click', () => openTry(true));
    $('mobileLoginBtn')?.addEventListener('click', () => openTry(true));
    $('backToLandingBtn')?.addEventListener('click', () => returnToLanding());
    setExperienceMode('landing');

    // Scroll progress bar
    const progress = $('scrollProgress');
    if (progress) {
      window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
        progress.style.transform = `scaleX(${pct})`;
      }, { passive: true });
    }
  }

  function formatNumber(value, fallback = '-') {
    if (value == null || Number.isNaN(Number(value))) return fallback;
    return Number(value).toLocaleString('en-US');
  }

  function formatMoney(value, fallback = '-') {
    if (value == null || Number.isNaN(Number(value))) return fallback;
    return `${Number(value).toFixed(2)} EUR`;
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function resolveCurrentLocation() {
    const now = Date.now();
    if (state.currentLocation && now - state.currentLocationAt < 2 * 60 * 1000) {
      return state.currentLocation;
    }

    if (!navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: Number(position.coords.latitude.toFixed(6)),
            lon: Number(position.coords.longitude.toFixed(6))
          };
          state.currentLocation = location;
          state.currentLocationAt = Date.now();
          resolve(location);
        },
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: 7000,
          maximumAge: 60000
        }
      );
    });
  }

  function getAuthHeaders(isJson = true) {
    const headers = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }
    return headers;
  }

  async function apiRequest(path, options = {}) {
    const method = options.method || 'GET';
    const url = `${API_BASE}${path}`;
    const init = {
      method,
      headers: options.formData ? getAuthHeaders(false) : getAuthHeaders(true)
    };

    if (options.formData) {
      init.body = options.formData;
      delete init.headers['Content-Type'];
    } else if (options.body != null) {
      init.body = JSON.stringify(options.body);
    }

    let response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      throw new ApiError('Network error. Check API availability.', 0, null);
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      if (response.status === 401 && state.token) {
        clearAuthState();
      }
      const message = payload?.error || payload?.message || `Request failed (${response.status})`;
      throw new ApiError(message, response.status, payload);
    }

    return payload;
  }

  function setAuthState(token, user) {
    state.token = token || '';
    state.user = user || null;
    if (state.token) {
      localStorage.setItem(STORAGE_TOKEN_KEY, state.token);
    } else {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    }
    if (state.user) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(STORAGE_USER_KEY);
    }
    renderAuthState();
  }

  function clearAuthState() {
    setAuthState('', null);
    state.activeHouseholdId = '';
    state.familyLists = [];
    state.familyEventCursor = 0;
    state.kidsSessionId = '';
  }

  function renderAuthState() {
    const authStatus = $('authStatus');
    if (!authStatus) return;
    if (state.user?.email) {
      authStatus.textContent = t('signed_in_as', { email: state.user.email });
      authStatus.classList.add('signed-in');
    } else {
      authStatus.textContent = t('guest_mode');
      authStatus.classList.remove('signed-in');
    }
    state.updateAuthGateUi?.();
  }

  function showToast(message, type = 'info') {
    const root = $('toastRoot');
    if (!root) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 220);
    }, 3200);
  }

  function getViewTip(viewName) {
    const tips = {
      overview: {
        titleKey: 'tip_overview_title',
        textKey: 'tip_overview_text',
        ctaKey: 'tip_overview_cta',
        ctaAction: () => {
          const registerEmail = $('registerEmail');
          if (registerEmail) registerEmail.focus();
        }
      },
      market: {
        titleKey: 'tip_market_title',
        textKey: 'tip_market_text',
        ctaKey: 'tip_market_cta',
        ctaAction: () => { loadMapStores().catch(() => {}); }
      },
      basket: {
        titleKey: 'tip_basket_title',
        textKey: 'tip_basket_text',
        ctaKey: 'tip_basket_cta',
        ctaAction: () => { buildBasket().catch(() => {}); }
      },
      receipts: {
        titleKey: 'tip_receipts_title',
        textKey: 'tip_receipts_text',
        ctaKey: 'tip_receipts_cta',
        ctaAction: () => { analyzeReceipt().catch(() => {}); }
      },
      family: {
        titleKey: 'tip_family_title',
        textKey: 'tip_family_text',
        ctaKey: 'tip_family_cta',
        ctaAction: () => { loadFamilyLists().catch(() => {}); }
      },
      missions: {
        titleKey: 'tip_missions_title',
        textKey: 'tip_missions_text',
        ctaKey: 'tip_missions_cta',
        ctaAction: () => { loadNearbyMissions().catch(() => {}); }
      },
      leaderboard: {
        titleKey: 'tip_leaderboard_title',
        textKey: 'tip_leaderboard_text',
        ctaKey: 'tip_leaderboard_cta',
        ctaAction: () => { loadGlobalLeaderboard().catch(() => {}); }
      },
      plus: {
        titleKey: 'tip_plus_title',
        textKey: 'tip_plus_text',
        ctaKey: 'tip_plus_cta',
        ctaAction: () => { loadPlusStatus().catch(() => {}); }
      },
      kids: {
        titleKey: 'tip_kids_title',
        textKey: 'tip_kids_text',
        ctaKey: 'tip_kids_cta',
        ctaAction: () => { loadKidsMissions().catch(() => {}); }
      },
      profile: {
        titleKey: 'tip_profile_title',
        textKey: 'tip_profile_text',
        ctaKey: 'tip_profile_cta',
        ctaAction: () => { loadRankCatalog().catch(() => {}); }
      }
    };
    return tips[viewName] || tips.overview;
  }

  function ensureContextTip() {
    let tip = $('viewContextTip');
    if (tip) return tip;

    tip = document.createElement('section');
    tip.id = 'viewContextTip';
    tip.className = 'context-tip';
    tip.innerHTML = `
      <div class="context-tip-main">
        <h3 id="contextTipTitle"></h3>
        <p id="contextTipText"></p>
      </div>
      <div class="context-tip-actions">
        <button id="contextTipToggle" class="btn btn-ghost btn-small context-mini-btn" type="button">More</button>
        <button id="contextTipAction" class="btn btn-ghost btn-small" type="button">Action</button>
      </div>
    `;

    const nav = document.querySelector('.view-nav');
    if (nav?.parentNode) {
      nav.parentNode.insertBefore(tip, nav.nextSibling);
    }

    return tip;
  }

  function updateContextTip(viewName) {
    const tip = ensureContextTip();
    if (!tip) return;

    const titleEl = $('contextTipTitle');
    const textEl = $('contextTipText');
    const actionBtn = $('contextTipAction');
    const toggleBtn = $('contextTipToggle');
    const tipData = getViewTip(viewName);

    if (titleEl) titleEl.textContent = t(tipData.titleKey);
    if (textEl) textEl.textContent = t(tipData.textKey);
    if (actionBtn) {
      actionBtn.textContent = t(tipData.ctaKey);
      actionBtn.onclick = () => tipData.ctaAction();
    }
    if (toggleBtn) {
      toggleBtn.textContent = tip.classList.contains('expanded') ? t('tip_less') : t('tip_more');
      toggleBtn.onclick = () => {
        tip.classList.toggle('expanded');
        toggleBtn.textContent = tip.classList.contains('expanded') ? t('tip_less') : t('tip_more');
      };
    }
  }

  function animateView(viewName) {
    const view = $(`view-${viewName}`);
    if (!view) return;
    view.classList.remove('view-enter');
    void view.offsetWidth;
    view.classList.add('view-enter');
  }

  function renderEmpty(container, message, icon = '📭') {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <p class="empty-msg">${sanitize(message)}</p>
      </div>`;
  }

  function renderError(container, message) {
    if (!container) return;
    container.innerHTML = `
      <div class="error-box">
        <span class="error-icon">⚠️</span>
        <span>${sanitize(message)}</span>
      </div>`;
  }

  function setLoading(container, message = 'Loading…') {
    if (!container) return;
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>${sanitize(message)}</span>
      </div>`;
  }

  function toApiErrorLabel(error) {
    if (!(error instanceof ApiError)) {
      return 'Unexpected error';
    }
    if (error.status === 401) return 'Login required';
    if (error.status === 402) return 'Plus feature required';
    if (error.status === 403) return error.data?.flag ? `Feature disabled: ${error.data.flag}` : 'Access denied';
    return error.data?.error || error.message || 'Request failed';
  }

  function bindNavigation() {
    const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    const views = Array.from(document.querySelectorAll('.view'));

    // Views that are always accessible, even without an account.
    const GUEST_VIEWS = new Set(['overview', 'market', 'leaderboard', 'plus']);

    function updateAuthGateUi() {
      const isAuthed = Boolean(state.token);
      navButtons.forEach((button) => {
        // Guests can browse public views; write-actions inside are guarded separately.
        const locked = !isAuthed && !GUEST_VIEWS.has(button.dataset.view);
        button.classList.toggle('locked', locked);
        button.setAttribute('aria-disabled', locked ? 'true' : 'false');
        button.title = locked ? t('register_required_to_continue') : '';
      });
    }

    function setView(viewName) {
      // Only redirect guests away from truly private views (write-heavy views).
      if (!state.token && !GUEST_VIEWS.has(viewName)) {
        showToast(t('register_required_to_continue'), 'warning');
        viewName = 'overview';
      }
      state.currentView = viewName;
      document.body.dataset.view = viewName;

      navButtons.forEach((button) => {
        const isActive = button.dataset.view === viewName;
        button.classList.toggle('active', isActive);
      });

      views.forEach((view) => {
        const isActive = view.id === `view-${viewName}`;
        view.classList.toggle('active', isActive);
      });

      if (viewName === 'market' && state.map) {
        state.map.invalidateSize();
      }
      updateAuthGateUi();
      updateContextTip(viewName);
      animateView(viewName);
    }

    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setView(button.dataset.view);
      });
    });

    state.setView = setView;
    state.updateAuthGateUi = updateAuthGateUi;
    updateAuthGateUi();
    setView(state.currentView);
  }

  function createHelpButton() {
    const existing = $('helpTourBtn');
    if (existing) return existing;
    const topbarActions = document.querySelector('.topbar-actions');
    if (!topbarActions) return null;
    const button = document.createElement('button');
    button.id = 'helpTourBtn';
    button.className = 'btn btn-ghost btn-small guide-btn';
    button.type = 'button';
    button.textContent = '?';
    button.title = t('guide');
    button.setAttribute('aria-label', t('guide'));
    topbarActions.appendChild(button);
    return button;
  }

  function ensureOnboardingModal() {
    let modal = $('onboardingModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'onboardingModal';
    modal.className = 'onboarding-modal';
    modal.innerHTML = `
      <div class="onboarding-card">
        <div class="onboarding-header">
          <h2 id="onboardingTitle">${sanitize(t('onboarding_title'))}</h2>
          <button id="onboardingCloseBtn" class="btn btn-ghost btn-small" type="button">${sanitize(t('onboarding_close'))}</button>
        </div>
        <div class="onboarding-progress">
          <div id="onboardingProgressBar"></div>
        </div>
        <p id="onboardingText"></p>
        <div class="onboarding-footer">
          <button id="onboardingPrevBtn" class="btn btn-ghost btn-small" type="button">${sanitize(t('onboarding_back'))}</button>
          <button id="onboardingSkipBtn" class="btn btn-ghost btn-small" type="button">${sanitize(t('onboarding_skip'))}</button>
          <button id="onboardingNextBtn" class="btn btn-small" type="button">${sanitize(t('onboarding_next'))}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function setupOnboarding() {
    const steps = [
      { view: 'overview', titleKey: 'onboarding_step_start_title', textKey: 'onboarding_step_start_text' },
      { view: 'market', titleKey: 'onboarding_step_market_title', textKey: 'onboarding_step_market_text' },
      { view: 'basket', titleKey: 'onboarding_step_basket_title', textKey: 'onboarding_step_basket_text' },
      { view: 'receipts', titleKey: 'onboarding_step_receipts_title', textKey: 'onboarding_step_receipts_text' },
      { view: 'family', titleKey: 'onboarding_step_family_title', textKey: 'onboarding_step_family_text' },
      { view: 'missions', titleKey: 'onboarding_step_missions_title', textKey: 'onboarding_step_missions_text' },
      { view: 'plus', titleKey: 'onboarding_step_plus_title', textKey: 'onboarding_step_plus_text' }
    ];

    const modal = ensureOnboardingModal();
    const titleEl = $('onboardingTitle');
    const textEl = $('onboardingText');
    const progressBar = $('onboardingProgressBar');
    const nextBtn = $('onboardingNextBtn');
    const prevBtn = $('onboardingPrevBtn');
    const skipBtn = $('onboardingSkipBtn');
    const closeBtn = $('onboardingCloseBtn');
    const helpBtn = createHelpButton();
    let stepIndex = 0;

    function renderStep() {
      const step = steps[stepIndex];
      if (!step) return;

      if (titleEl) titleEl.textContent = `${t(step.titleKey)} (${stepIndex + 1}/${steps.length})`;
      if (textEl) textEl.textContent = t(step.textKey);
      if (progressBar) {
        const pct = Math.round(((stepIndex + 1) / steps.length) * 100);
        progressBar.style.width = `${pct}%`;
      }
      if (prevBtn) prevBtn.disabled = stepIndex === 0;
      if (nextBtn) nextBtn.textContent = stepIndex === steps.length - 1 ? t('onboarding_finish') : t('onboarding_next');
      if (skipBtn) skipBtn.textContent = t('onboarding_skip');
      if (closeBtn) closeBtn.textContent = t('onboarding_close');
      if (prevBtn) prevBtn.textContent = t('onboarding_back');

      if (typeof state.setView === 'function') {
        state.setView(step.view);
      }
    }

    function openOnboarding(forceStart = false) {
      if (forceStart) stepIndex = 0;
      modal.classList.add('active');
      renderStep();
    }

    function closeOnboarding(markDone = false) {
      modal.classList.remove('active');
      if (markDone) {
        localStorage.setItem(STORAGE_ONBOARDING_KEY, '1');
      }
    }

    nextBtn?.addEventListener('click', () => {
      if (stepIndex < steps.length - 1) {
        stepIndex += 1;
        renderStep();
        return;
      }
      closeOnboarding(true);
      showToast(t('onboarding_complete'), 'success');
    });

    prevBtn?.addEventListener('click', () => {
      if (stepIndex > 0) {
        stepIndex -= 1;
        renderStep();
      }
    });

    skipBtn?.addEventListener('click', () => {
      closeOnboarding(true);
      showToast(t('onboarding_skipped'), 'info');
    });

    closeBtn?.addEventListener('click', () => {
      closeOnboarding(true);
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeOnboarding(true);
      }
    });

    helpBtn?.addEventListener('click', () => {
      openOnboarding(true);
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === '?' && event.shiftKey) {
        event.preventDefault();
        openOnboarding(true);
      }
      if (event.key === 'Escape' && modal.classList.contains('active')) {
        closeOnboarding(true);
      }
    });

    if (!localStorage.getItem(STORAGE_ONBOARDING_KEY)) {
      setTimeout(() => openOnboarding(true), 500);
    }
  }

  function runEntranceAnimations() {
    const panels = Array.from(document.querySelectorAll('.panel'));
    panels.forEach((panel, index) => {
      panel.classList.add('fade-up');
      panel.style.animationDelay = `${Math.min(index * 45, 350)}ms`;
    });
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    const email = $('registerEmail')?.value?.trim();
    const password = $('registerPassword')?.value || '';

    if (!email || !password) {
      showToast('Email and password are required.', 'warning');
      return;
    }

    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: { email, password }
      });
      setAuthState(data.access_token, data.user);
      showToast('Account created. You are now signed in.', 'success');
      await refreshAuthedPanels();
    } catch (error) {
      showToast(`Register failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = $('loginEmail')?.value?.trim();
    const password = $('loginPassword')?.value || '';

    if (!email || !password) {
      showToast('Email and password are required.', 'warning');
      return;
    }

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      setAuthState(data.access_token, data.user);
      showToast('Login successful.', 'success');
      await refreshAuthedPanels();
    } catch (error) {
      showToast(`Login failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function handleLogout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore backend logout errors for local token removal.
    }
    clearAuthState();
    renderProfile(null);
    renderGamification(null);
    showToast('Logged out.', 'info');
  }

  function renderGamification(data) {
    $('kpiRank').textContent = data?.rank?.rank_name || '-';
    $('kpiLevel').textContent = data?.rank?.level || '-';
    $('kpiXp').textContent = formatNumber(data?.lifetime_xp, '-');
    $('kpiPoints').textContent = formatNumber(data?.spendable_points, '-');
  }

  function renderLedgerPreview(rows) {
    const container = $('ledgerPreview');
    if (!container) return;

    if (!rows || !rows.length) {
      renderEmpty(container, t('empty_points_events'));
      return;
    }

    container.innerHTML = rows.map((row) => {
      const pointsDelta = Number(row.points_delta || 0);
      const xpDelta = Number(row.xp_delta || 0);
      const sign = pointsDelta >= 0 ? '+' : '';
      return `
        <div class="line-item compact">
          <div>
            <strong>${sanitize(row.event_type || 'event')}</strong>
            <div class="muted small">${formatDate(row.created_at)}</div>
          </div>
          <div class="line-metrics ${pointsDelta < 0 ? 'negative' : 'positive'}">
            ${sign}${formatNumber(pointsDelta, '0')} pts / ${xpDelta >= 0 ? '+' : ''}${formatNumber(xpDelta, '0')} xp
          </div>
        </div>
      `;
    }).join('');
  }

  function renderProfile(profile) {
    const container = $('profileData');
    if (!container) return;

    if (!profile) {
      renderEmpty(container, t('empty_profile'), '👤');
      return;
    }

    const avatarLetter = (profile.email || 'U')[0].toUpperCase();
    const statusClass  = profile.status === 'active' ? 'pf-status--active' : 'pf-status--suspended';

    container.innerHTML = `
      <div class="profile-hero">
        <div class="profile-avatar">${sanitize(avatarLetter)}</div>
        <div>
          <strong class="profile-email">${sanitize(profile.email || '-')}</strong>
          <span class="muted small profile-id">ID: ${sanitize(String(profile.id || '-'))}</span>
        </div>
      </div>
      <div class="list compact" style="margin-top:0.75rem">
        <div class="line-item compact">
          <span>Status</span>
          <span class="pf-status ${statusClass}">${sanitize(profile.status || 'active')}</span>
        </div>
        <div class="line-item compact">
          <span>Member since</span>
          <strong>${formatDate(profile.created_at)}</strong>
        </div>
        <div class="line-item compact">
          <span>Last login</span>
          <strong>${formatDate(profile.last_login_at)}</strong>
        </div>
      </div>
    `;
  }

  async function refreshAuthedPanels() {
    if (!state.token) {
      renderGamification(null);
      renderLedgerPreview([]);
      return;
    }

    try {
      const [profile, gamification, ledger] = await Promise.all([
        apiRequest('/me'),
        apiRequest('/me/gamification'),
        apiRequest('/points/ledger?limit=8')
      ]);
      if (!state.user && profile?.email) {
        setAuthState(state.token, { id: profile.id, email: profile.email });
      }
      renderProfile(profile);
      renderGamification(gamification);
      renderLedgerPreview(ledger);
    } catch (error) {
      renderGamification(null);
      renderLedgerPreview([]);
      showToast(`Profile refresh failed: ${toApiErrorLabel(error)}`, 'warning');
    }
  }

  function initMap() {
    const mapContainer = $('map');
    if (!mapContainer || !window.L) return;

    state.map = window.L.map(mapContainer, { zoomControl: true }).setView([54.6872, 25.2797], 12);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(state.map);

    mapContainer.addEventListener('click', () => {
      if (state.map) state.map.invalidateSize();
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        state.mapFilters.lat = Number(pos.coords.latitude.toFixed(6));
        state.mapFilters.lon = Number(pos.coords.longitude.toFixed(6));
        if (state.map) {
          state.map.setView([state.mapFilters.lat, state.mapFilters.lon], 13);
        }
        loadMapStores().catch(() => {});
      }, () => {}, { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 });
    }

    const chips = Array.from(document.querySelectorAll('#mapChips .chip'));
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const type = chip.dataset.filter;
        const value = chip.dataset.value;

        if (type === 'category') {
          chips
            .filter((item) => item.dataset.filter === 'category')
            .forEach((item) => item.classList.remove('active'));
          chip.classList.add('active');
          state.mapFilters.category = value || 'All';
        }

        if (type === 'verified') {
          chip.classList.toggle('active');
          state.mapFilters.verified = chip.classList.contains('active');
        }

        if (type === 'distance') {
          const sameType = chips.filter((item) => item.dataset.filter === 'distance');
          const alreadyActive = chip.classList.contains('active');
          sameType.forEach((item) => item.classList.remove('active'));
          if (!alreadyActive) {
            chip.classList.add('active');
            state.mapFilters.maxDistance = Number(value);
          } else {
            state.mapFilters.maxDistance = null;
          }
        }

        loadMapStores().catch(() => {});
      });
    });
  }

  function clearMapMarkers() {
    state.mapMarkers.forEach((marker) => marker.remove());
    state.mapMarkers = [];
  }

  async function loadMapStores() {
    if (!state.map) return;
    const query = new URLSearchParams();
    if (state.mapFilters.cityId) {
      query.set('cityId', String(state.mapFilters.cityId));
    } else if (state.mapFilters.city) {
      query.set('city', String(state.mapFilters.city));
    }
    if (state.mapFilters.category && state.mapFilters.category !== 'All') {
      query.set('category', state.mapFilters.category);
    }
    if (state.mapFilters.verified) {
      query.set('verified', 'true');
    }
    if (state.mapFilters.maxDistance != null) {
      query.set('maxDistance', String(state.mapFilters.maxDistance));
    }
    if (state.mapFilters.lat != null && state.mapFilters.lon != null) {
      query.set('lat', String(state.mapFilters.lat));
      query.set('lon', String(state.mapFilters.lon));
    }

    try {
      const stores = await apiRequest(`/map/stores?${query.toString()}`);
      clearMapMarkers();

      if (!Array.isArray(stores) || stores.length === 0) {
        showToast('No stores found for selected filters.', 'info');
        return;
      }

      const bounds = [];
      stores.forEach((store) => {
        const lat = Number(store.lat);
        const lon = Number(store.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const topDeal = Array.isArray(store.top_deals) ? store.top_deals[0] : null;
        const dealLine = topDeal
          ? `${sanitize(topDeal.product_name || 'Deal')} - ${formatMoney(topDeal.price)}`
          : 'No live deal data';

        const marker = window.L.marker([lat, lon]).addTo(state.map);
        marker.bindPopup(`
          <div class="map-popup">
            <strong>${sanitize(store.name || 'Store')}</strong><br/>
            ${dealLine}
          </div>
        `);
        state.mapMarkers.push(marker);
        bounds.push([lat, lon]);
      });

      if (bounds.length > 1) {
        state.map.fitBounds(bounds, { padding: [40, 40] });
      }
    } catch (error) {
      showToast(`Map failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function runSearch() {
    const input = $('searchInput');
    const container = $('searchResults');
    if (!input || !container) return;

    const query = input.value.trim();
    if (!query) {
      renderEmpty(container, t('search_input_required'));
      return;
    }

    setLoading(container, 'Searching prices across stores...');

    try {
      const location = await resolveCurrentLocation();
      const params = new URLSearchParams({
        q: query,
        limit: '5'
      });
      if (location) {
        params.set('lat', String(location.lat));
        params.set('lon', String(location.lon));
        const radiusKm = $('searchRadiusKm')?.value || '2';
        params.set('radiusKm', String(radiusKm));
      }

      const rows = await apiRequest(`/products/compare?${params.toString()}`);
      if (!rows || !rows.length) {
        renderEmpty(container, t('search_no_match'));
        return;
      }

      container.innerHTML = rows.map((row) => `
        <div class="result-card">
          <div class="result-top">
            <strong>${sanitize(row.name || '-')}</strong>
            <span class="chip-static">AROUND YOU ${formatMoney(row.best_nearby_price ?? row.best_price)}</span>
          </div>
          <div class="muted small">Brand: ${sanitize(row.brand || '-')}</div>
          <div class="result-price">${formatMoney(row.best_price)}</div>
          <div class="muted small">
            ${row.radius_km ? `Showing stores within ${sanitize(row.radius_km)} km` : 'Location unavailable, showing all stores'}
          </div>
          <div class="row">
            ${row.best_nearby_store?.lat != null && row.best_nearby_store?.lon != null
              ? `<button class="btn btn-ghost" type="button" data-nav-lat="${sanitize(row.best_nearby_store.lat)}" data-nav-lon="${sanitize(row.best_nearby_store.lon)}">Vesti į pigiausią</button>`
              : '<span class="muted small">Nėra lokacijos duomenų navigacijai</span>'}
          </div>
          <div class="list compact">
            ${(Array.isArray(row.store_prices) && row.store_prices.length)
              ? row.store_prices.slice(0, 8).map((priceRow) => `
                <div class="line-item compact">
                  <span>
                    ${sanitize(priceRow.chain || '-')} / ${sanitize(priceRow.store_name || '-')}
                    ${priceRow.distance_km != null ? ` (${sanitize(priceRow.distance_km)} km)` : ''}
                  </span>
                  <strong>${formatMoney(priceRow.price)}</strong>
                </div>
              `).join('')
              : '<div class="muted small">No active store prices found.</div>'}
          </div>
          <div class="muted small">Product ID: ${sanitize(row.product_id || '-')}</div>
        </div>
      `).join('');
    } catch (error) {
      renderError(container, toApiErrorLabel(error));
    }
  }

  function parseBasketLines(input) {
    const lines = String(input || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.map((line) => {
      const match = line.match(/^(.*?)(?:\s*x\s*(\d+(?:\.\d+)?))?$/i);
      if (!match) {
        return { raw_name: line, quantity: 1 };
      }
      return {
        raw_name: match[1].trim(),
        quantity: Number(match[2] || 1)
      };
    }).filter((item) => item.raw_name);
  }

  function renderBasketItems(items) {
    const container = $('basketItems');
    if (!container) return;
    if (!items || !items.length) {
      renderEmpty(container, 'Basket is empty.');
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="line-item">
        <span>${sanitize(item.product_name || item.raw_name || 'Item')}</span>
        <strong>x${formatNumber(item.quantity || 1)}</strong>
      </div>
    `).join('');
  }

  function renderBasketPlan(plan) {
    const container = $('basketPlan');
    if (!container) return;

    if (!plan || !Array.isArray(plan.plan) || !plan.plan.length) {
      container.classList.add('muted');
      container.textContent = t('empty_basket_plan');
      return;
    }

    const stores = plan.plan.map((store) => {
      const items = Array.isArray(store.items) ? store.items : [];
      return `
        <div class="plan-store">
          <div class="line-item compact">
            <strong>${sanitize(store.store_name || 'Store')}</strong>
            <span>${items.length} items</span>
          </div>
          <div class="plan-items">
            ${items.map((item) => `
              <div class="line-item compact">
                <span>${sanitize(item.product_name || 'Item')}</span>
                <strong>${formatMoney(item.price)}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.classList.remove('muted');
    container.innerHTML = `
      <div class="plan-summary-hero">
        <div class="plan-summary-item">
          <span class="muted small">Total cost</span>
          <strong class="plan-total">${formatMoney(plan.total_price)}</strong>
        </div>
        ${plan.savings_eur > 0 ? `
          <div class="plan-summary-item plan-savings">
            <span class="muted small">You save</span>
            <strong class="positive plan-save-amount">-${formatMoney(plan.savings_eur)}</strong>
          </div>
        ` : ''}
      </div>
      ${stores}
    `;
  }

  async function buildBasket() {
    const input = $('basketInput');
    if (!input) return;

    const items = parseBasketLines(input.value);
    if (!items.length) {
      showToast('Add at least one basket line.', 'warning');
      return;
    }

    try {
      const basket = await apiRequest('/baskets', {
        method: 'POST',
        body: { name: `Basket ${new Date().toISOString()}` }
      });
      state.activeBasketId = basket.id;

      const updated = await apiRequest(`/baskets/${basket.id}/items`, {
        method: 'POST',
        body: { items }
      });

      state.activeBasketItems = updated.items || items;
      renderBasketItems(state.activeBasketItems);
      showToast('Basket built successfully.', 'success');
      await optimizeBasket();
    } catch (error) {
      showToast(`Basket build failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function optimizeBasket() {
    if (!state.activeBasketId) {
      showToast('Build basket first.', 'warning');
      return;
    }

    try {
      const plan = await apiRequest(`/baskets/${state.activeBasketId}/optimize`, {
        method: 'POST',
        body: { mode: 'single_store' }
      });
      renderBasketPlan(plan);
      showToast('Basket optimized.', 'success');
    } catch (error) {
      showToast(`Optimization failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  // ── Receipt helpers ──────────────────────────────────────

  function receiptSetStep(step) {
    // step: 1=uploading, 2=scanning, 3=matching, 4=done
    const prog = $('receiptProgress');
    if (!prog) return;
    prog.style.display = 'flex';
    ['rpStep1','rpStep2','rpStep3','rpStep4'].forEach((id, idx) => {
      const el = $(id);
      if (!el) return;
      el.classList.remove('active','done');
      if (idx + 1 < step) el.classList.add('done');
      else if (idx + 1 === step) el.classList.add('active');
    });
    // colour lines
    prog.querySelectorAll('.rp-line').forEach((line, idx) => {
      line.classList.toggle('done', idx + 1 < step);
    });
  }

  function receiptResetProgress() {
    const prog = $('receiptProgress');
    if (prog) prog.style.display = 'none';
    ['rpStep1','rpStep2','rpStep3','rpStep4'].forEach((id) => {
      const el = $(id);
      if (el) { el.classList.remove('active','done'); }
    });
  }

  function receiptSetStatus(text, type = '') {
    const el = $('scanStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'receipt-status-text muted' + (type ? ' ' + type : '');
  }

  function receiptShowFile(file) {
    const url = URL.createObjectURL(file);
    const img = $('receiptPreviewImg');
    const wrap = $('receiptPreviewWrap');
    const ph = $('dropzonePlaceholder');
    const dropzone = $('receiptDropzone');
    if (img) img.src = url;
    if (wrap) wrap.style.display = '';
    if (ph) ph.style.display = 'none';
    if (dropzone) dropzone.classList.add('has-image');
    const btn = $('changePhotoBtn');
    if (btn) btn.textContent = t('change_photo') || 'Change';
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  function receiptResetUI() {
    const wrap = $('receiptPreviewWrap');
    const ph = $('dropzonePlaceholder');
    const dropzone = $('receiptDropzone');
    const img = $('receiptPreviewImg');
    if (wrap) wrap.style.display = 'none';
    if (ph) ph.style.display = '';
    if (dropzone) dropzone.classList.remove('has-image');
    if (img) img.src = '';
    const btn = $('scanBtn');
    if (btn) btn.disabled = true;
    const emptyEl = $('receiptReportEmpty');
    if (emptyEl) emptyEl.style.display = '';
    const rep = $('receiptReport');
    if (rep) rep.innerHTML = '';
    receiptResetProgress();
    receiptSetStatus(t('awaiting_upload') || 'Waiting for receipt…');
  }

  function bindReceiptPreview() {
    const input = $('scanInput');
    const inputCamera = $('scanInputCamera');
    const dropzone = $('receiptDropzone');
    if (!input) return;

    function applyFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      // Sync to main input
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
      } catch (_) {}
      receiptShowFile(file);
      const analyzeBtn = $('scanBtn');
      if (analyzeBtn) analyzeBtn.disabled = false;
      receiptSetStatus(t('scan_ready', { file: file.name }));
    }

    input.addEventListener('change', () => { if (input.files?.[0]) applyFile(input.files[0]); });
    if (inputCamera) inputCamera.addEventListener('change', () => { if (inputCamera.files?.[0]) applyFile(inputCamera.files[0]); });

    $('scanCameraBtn')?.addEventListener('click', () => inputCamera?.click());
    $('scanGalleryBtn')?.addEventListener('click', () => input?.click());
    $('changePhotoBtn')?.addEventListener('click', () => input?.click());

    // Click on dropzone placeholder → gallery
    dropzone?.addEventListener('click', (e) => {
      if (e.target.closest('.dropzone-placeholder')) {
        input?.click();
      }
    });

    // Drag & drop
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file) applyFile(file);
    });
  }

  async function pollReceiptUntilComplete(receiptId, maxAttempts = 16) {
    for (let i = 0; i < maxAttempts; i += 1) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const status = await apiRequest(`/receipts/${receiptId}/status`);
        const s = status.status || '';
        const pct = status.progress || 0;
        receiptSetStatus(`${t('rp_scanning')}… ${pct}%`);
        if (pct > 30) receiptSetStep(3);
        if (['processed', 'finalized', 'needs_confirmation'].includes(s)) {
          return status;
        }
      } catch (_) { /* network blip – keep polling */ }
    }
    return null;
  }

  function renderReceiptReport(report) {
    const container = $('receiptReport');
    const emptyEl = $('receiptReportEmpty');
    if (!container) return;

    if (emptyEl) emptyEl.style.display = 'none';

    if (!report) {
      container.innerHTML = `<div class="empty">${t('empty_report') || 'No data.'}</div>`;
      return;
    }

    const lines = Array.isArray(report.line_items) ? report.line_items : [];
    const overpaid = Array.isArray(report.overpaid_items) ? report.overpaid_items : [];
    const savings = Number(report.savings_total || 0);
    const verifiedRatio = Number(report.verified_ratio || 0);
    const verifiedPct = Math.round(verifiedRatio * 100);

    // Hero summary card
    const savingsColor = savings > 0 ? '' : 'style="background:linear-gradient(135deg,#047857,#059669)"';
    const summaryHtml = `
      <div class="report-summary" ${savingsColor}>
        <div class="report-savings-big">
          <div class="label">${t('report_saved_label')}</div>
          <div class="amount">${formatMoney(savings)}</div>
          <div class="sub">${overpaid.length} ${t('report_overpaid_label')}</div>
        </div>
        <div class="report-meta-chips">
          <div class="report-chip">📋 ${lines.length} item${lines.length !== 1 ? 's' : ''}</div>
          <div class="report-chip">✓ ${verifiedPct}% ${t('report_verified_label')}</div>
        </div>
      </div>`;

    // Verified bar
    const verBar = `
      <div class="report-verified-bar">
        <span class="verified-label">✓ ${t('report_verified_label')}</span>
        <div class="verified-bar-track">
          <div class="verified-bar-fill" style="width:${verifiedPct}%"></div>
        </div>
        <span class="verified-pct">${verifiedPct}%</span>
      </div>`;

    // Items
    const head = `<div class="report-items-head">${t('report_items_head')}</div>`;
    const itemsHtml = lines.length === 0
      ? `<div class="empty">${t('report_empty_title') || 'No items found'}</div>`
      : lines.map((item) => {
          const sav = Number(item.savings_eur || 0);
          const isOverpaid = sav > 0;
          const icon = isOverpaid ? '⚠️' : '✅';
          const cls = isOverpaid ? 'overpaid' : 'ok';
          const store = item.store_chain ? `${t('report_best_store')}: ${sanitize(item.store_chain)}` : '';
          const bestP = item.best_offer_price != null ? ` · €${Number(item.best_offer_price).toFixed(2)}` : '';
          return `
            <div class="report-item ${cls}">
              <div class="report-item-icon">${icon}</div>
              <div class="report-item-body">
                <div class="report-item-name">${sanitize(item.product_name || item.receipt_name || 'Item')}</div>
                ${store ? `<div class="report-item-store">${store}${bestP}</div>` : ''}
              </div>
              <div class="report-item-prices">
                <div class="report-item-paid">€${item.price != null ? Number(item.price).toFixed(2) : '—'}</div>
                ${isOverpaid
                  ? `<div class="report-item-savings">−€${sav.toFixed(2)} overpaid</div>`
                  : `<div class="report-item-ok-badge">${t('report_ok_price')}</div>`}
              </div>
              ${isOverpaid ? `<div class="report-overpaid-badge">−€${sav.toFixed(2)}</div>` : ''}
            </div>`;
        }).join('');

    container.innerHTML = summaryHtml + verBar + head + itemsHtml;
  }

  async function analyzeReceipt() {
    const fileInput = $('scanInput');
    if (!fileInput?.files?.[0]) {
      showToast(t('select_receipt_first'), 'warning');
      return;
    }

    const analyzeBtn = $('scanBtn');
    if (analyzeBtn) analyzeBtn.disabled = true;

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      receiptSetStep(1);
      receiptSetStatus(t('uploading_receipt') || 'Uploading…');

      const upload = await apiRequest('/receipts/upload', { method: 'POST', formData });
      state.lastReceiptId = upload.receipt_id;

      receiptSetStep(2);
      receiptSetStatus(`${t('rp_scanning')}…`);

      const finalStatus = await pollReceiptUntilComplete(upload.receipt_id);

      receiptSetStep(3);
      receiptSetStatus(`${t('rp_matching')}…`);

      if (!finalStatus) {
        showToast(t('still_processing') || 'Still processing…', 'info');
        receiptSetStatus(t('still_processing') || 'Still processing…', 'error');
        if (analyzeBtn) analyzeBtn.disabled = false;
        return;
      }

      const report = await apiRequest(`/receipts/${upload.receipt_id}/report`);

      receiptSetStep(4);
      receiptSetStatus(t('receipt_analysis_complete') || 'Done!', 'success');
      renderReceiptReport(report);
      showToast(t('receipt_analysis_complete') || 'Analysis complete!', 'success');
    } catch (error) {
      const msg = toApiErrorLabel(error);
      showToast(`Receipt failed: ${msg}`, 'error');
      receiptSetStatus(`Error: ${msg}`, 'error');
      receiptResetProgress();
      if (analyzeBtn) analyzeBtn.disabled = false;
    }
  }

  function setHouseholdId(id) {
    state.activeHouseholdId = id || '';
    ['familyIdInput', 'familyListHouseholdId', 'joinFamilyId'].forEach((fieldId) => {
      const input = $(fieldId);
      if (input && state.activeHouseholdId) {
        input.value = state.activeHouseholdId;
      }
    });
  }

  async function createFamily() {
    const name = $('familyName')?.value?.trim() || 'My Family';
    try {
      const family = await apiRequest('/families', {
        method: 'POST',
        body: { name }
      });
      setHouseholdId(family.id);
      state.familyEventCursor = 0;
      showToast(`Family created: ${family.name}`, 'success');
      await loadFamilyLists();
    } catch (error) {
      showToast(`Family create failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function inviteFamilyMember() {
    const householdId = $('familyIdInput')?.value?.trim() || state.activeHouseholdId;
    const email = $('familyInviteEmail')?.value?.trim();
    const role = $('familyInviteRole')?.value || 'runner';

    if (!householdId) {
      showToast('Household ID is required.', 'warning');
      return;
    }

    try {
      const invite = await apiRequest(`/families/${encodeURIComponent(householdId)}/invite`, {
        method: 'POST',
        body: { email: email || null, role }
      });
      showToast(`Invite created. Token: ${invite.token}`, 'success');
      $('joinFamilyToken').value = invite.token;
      const tokenOutput = $('familyInviteTokenOutput');
      if (tokenOutput) {
        tokenOutput.value = invite.token || '';
      }
    } catch (error) {
      showToast(`Invite failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function copyFamilyInviteToken() {
    const source = $('familyInviteTokenOutput')?.value?.trim() || $('joinFamilyToken')?.value?.trim();
    if (!source) {
      showToast('No invite token to copy yet.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(source);
      showToast('Invite token copied.', 'success');
    } catch (error) {
      showToast('Copy failed. Copy token manually.', 'warning');
    }
  }

  async function joinFamily() {
    const householdId = $('joinFamilyId')?.value?.trim();
    const token = $('joinFamilyToken')?.value?.trim();

    if (!householdId || !token) {
      showToast('Household ID and token are required.', 'warning');
      return;
    }

    try {
      await apiRequest(`/families/${encodeURIComponent(householdId)}/join`, {
        method: 'POST',
        body: { token }
      });
      setHouseholdId(householdId);
      showToast('Joined family successfully.', 'success');
      await loadFamilyLists();
    } catch (error) {
      showToast(`Join failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  function renderFamilyLists(lists) {
    const container = $('familyLists');
    if (!container) return;

    if (!lists || !lists.length) {
      renderEmpty(container, t('empty_family_lists'));
      return;
    }

    container.innerHTML = lists.map((list) => {
      const items = Array.isArray(list.items) ? list.items : [];
      return `
        <div class="family-list">
          <div class="line-item">
            <strong>${sanitize(list.title || 'List')}</strong>
            <span class="muted small">${items.length} items</span>
          </div>
          ${items.length ? items.map((item) => `
            <div class="line-item compact">
              <span>${sanitize(item.raw_name || item.product_id || 'Item')}</span>
              <strong>x${formatNumber(item.quantity || 1)}</strong>
            </div>
          `).join('') : '<div class="muted small">No items.</div>'}
          <div class="muted small">List ID: ${sanitize(list.id)}</div>
        </div>
      `;
    }).join('');
  }

  async function loadFamilyLists() {
    const householdId = $('familyListHouseholdId')?.value?.trim() || state.activeHouseholdId;
    if (!householdId) {
      showToast('Set household ID first.', 'warning');
      return;
    }

    try {
      const lists = await apiRequest(`/families/${encodeURIComponent(householdId)}/lists`);
      state.familyLists = Array.isArray(lists) ? lists : [];
      setHouseholdId(householdId);
      renderFamilyLists(state.familyLists);
      showToast(`Loaded ${state.familyLists.length} family lists.`, 'success');
    } catch (error) {
      renderError($('familyLists'), toApiErrorLabel(error));
      showToast(`Load lists failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function addFamilyItem() {
    const householdId = $('familyListHouseholdId')?.value?.trim() || state.activeHouseholdId;
    const rawValue = $('familyListItem')?.value?.trim();

    if (!householdId || !rawValue) {
      showToast('Household ID and item name are required.', 'warning');
      return;
    }

    if (!state.familyLists.length) {
      await loadFamilyLists();
      if (!state.familyLists.length) {
        showToast('No list available to add item.', 'warning');
        return;
      }
    }

    const targetList = state.familyLists[0];
    const match = rawValue.match(/^(.*?)(?:\s*x\s*(\d+(?:\.\d+)?))?$/i);
    const itemName = match ? match[1].trim() : rawValue;
    const quantity = match && match[2] ? Number(match[2]) : 1;

    try {
      await apiRequest(`/families/${encodeURIComponent(householdId)}/lists/${encodeURIComponent(targetList.id)}/items`, {
        method: 'POST',
        body: {
          raw_name: itemName,
          quantity
        }
      });
      $('familyListItem').value = '';
      showToast('Family item added.', 'success');
      await loadFamilyLists();
    } catch (error) {
      showToast(`Add item failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  function renderFamilyEvents(payload) {
    const container = $('familyEvents');
    if (!container) return;

    const events = payload?.events || [];
    if (!events.length) {
      renderEmpty(container, t('empty_family_events'));
      return;
    }

    container.innerHTML = events.map((event) => `
      <div class="line-item compact">
        <div>
          <strong>${sanitize(event.event_type || 'event')}</strong>
          <div class="muted small">${formatDate(event.created_at)}</div>
        </div>
        <div class="muted small">Actor: ${sanitize(event.actor_user_id || '-')}</div>
      </div>
    `).join('');
  }

  async function pollFamilyEvents() {
    const householdId = $('familyListHouseholdId')?.value?.trim() || state.activeHouseholdId;
    if (!householdId) {
      showToast('Set household ID first.', 'warning');
      return;
    }

    try {
      const payload = await apiRequest(`/families/${encodeURIComponent(householdId)}/events/poll`, {
        method: 'POST',
        body: { cursor: state.familyEventCursor, limit: 50 }
      });
      state.familyEventCursor = Number(payload.next_cursor || state.familyEventCursor || 0);
      renderFamilyEvents(payload);
      showToast(`Family events updated (cursor ${state.familyEventCursor}).`, 'success');
    } catch (error) {
      showToast(`Family poll failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  function renderMissions(missions) {
    const container = $('missionsList');
    if (!container) return;

    if (!missions || !missions.length) {
      renderEmpty(container, t('empty_missions'), '🎯');
      return;
    }

    const typeIcon = (type = '') => {
      const map = { price_check: '💰', photo_proof: '📷', verify: '✅', barcode: '📊' };
      return map[type.toLowerCase()] || '🎯';
    };

    container.innerHTML = missions.map((mission) => `
      <div class="mission-card" data-mission-id="${sanitize(mission.id)}">
        <div class="mc-header">
          <span class="mc-type-icon">${typeIcon(mission.mission_type)}</span>
          <div class="mc-meta">
            <strong class="mc-title">${sanitize(mission.title || 'Mission')}</strong>
            ${mission.store_chain ? `<span class="mc-store muted small">📍 ${sanitize(mission.store_chain)}</span>` : ''}
          </div>
          <span class="mc-xp">+${formatNumber(mission.reward_points || 0)} XP</span>
        </div>
        ${mission.description ? `<p class="mc-desc muted small">${sanitize(mission.description)}</p>` : ''}
        <div class="mc-footer">
          <span class="mc-status mc-status--${sanitize(mission.status || 'open')}">${sanitize(mission.status || 'open')}</span>
          <div class="row">
            <button class="btn btn-ghost btn-small" data-action="start">Start</button>
            <button class="btn btn-small" data-action="use">Use for Submit</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function loadNearbyMissions() {
    const lat = $('missionLat')?.value?.trim();
    const lon = $('missionLon')?.value?.trim();

    const params = new URLSearchParams();
    if (lat) params.set('lat', lat);
    if (lon) params.set('lon', lon);
    params.set('limit', '20');
    params.set('app_foreground', 'true');

    try {
      const missions = await apiRequest(`/missions/nearby?${params.toString()}`);
      renderMissions(missions);
      showToast(`Loaded ${Array.isArray(missions) ? missions.length : 0} missions.`, 'success');
    } catch (error) {
      renderError($('missionsList'), toApiErrorLabel(error));
      showToast(`Load missions failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function startMission(missionId) {
    try {
      await apiRequest(`/missions/${encodeURIComponent(missionId)}/start`, { method: 'POST' });
      $('missionIdInput').value = missionId;
      showToast('Mission started.', 'success');
      await loadNearbyMissions();
    } catch (error) {
      showToast(`Start mission failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function submitMission() {
    const missionId = $('missionIdInput')?.value?.trim();
    const product = $('missionProductName')?.value?.trim();
    const barcode = $('missionBarcode')?.value?.trim();

    if (!missionId || !product || !barcode) {
      showToast('Mission ID, product name and barcode are required.', 'warning');
      return;
    }

    const payload = {
      product_canonical_name: product,
      barcode,
      store_chain: $('missionStoreChain')?.value?.trim() || null,
      media_hash: $('missionMediaHash')?.value?.trim() || null,
      foreground_app: !!$('missionForeground')?.checked,
      location_lat: $('missionLat')?.value ? Number($('missionLat').value) : null,
      location_lon: $('missionLon')?.value ? Number($('missionLon').value) : null,
      media: [
        {
          media_type: 'shelfie',
          url: 'local://capture',
          quality_score: 0.85,
          blur_score: 0.1,
          hash: $('missionMediaHash')?.value?.trim() || null
        }
      ]
    };

    try {
      const submission = await apiRequest(`/missions/${encodeURIComponent(missionId)}/submit`, {
        method: 'POST',
        body: payload
      });
      $('verifySubmissionId').value = submission.submission_id;
      showToast(`Mission submitted: ${submission.proof_status}`, 'success');
      renderProofStatus(submission);
    } catch (error) {
      showToast(`Submit failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function verifyMission() {
    const missionId = $('missionIdInput')?.value?.trim();
    const submissionId = $('verifySubmissionId')?.value?.trim();
    const vote = $('verifyVote')?.value || 'confirm';

    if (!missionId || !submissionId) {
      showToast('Mission ID and submission ID are required.', 'warning');
      return;
    }

    try {
      const result = await apiRequest(`/missions/${encodeURIComponent(missionId)}/verify`, {
        method: 'POST',
        body: {
          submission_id: submissionId,
          vote
        }
      });
      renderProofStatus(result);
      showToast('Verification submitted.', 'success');
      await refreshAuthedPanels();
    } catch (error) {
      showToast(`Verify failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  function renderProofStatus(data) {
    const container = $('proofStatus');
    if (!container) return;

    if (!data) {
      renderEmpty(container, t('empty_proof'));
      return;
    }

    if (data.consensus) {
      container.innerHTML = `
        <div class="line-item compact"><span>Consensus</span><strong>${sanitize(data.consensus.status || '-')}</strong></div>
        <div class="line-item compact"><span>Confirm</span><strong>${formatNumber(data.consensus.confirmCount || 0)}</strong></div>
        <div class="line-item compact"><span>Reject</span><strong>${formatNumber(data.consensus.rejectCount || 0)}</strong></div>
      `;
      return;
    }

    const votes = Array.isArray(data.votes) ? data.votes : [];
    container.innerHTML = `
      <div class="line-item compact"><span>Proof status</span><strong>${sanitize(data.proof_status || data.claim_status || '-')}</strong></div>
      <div class="line-item compact"><span>Claim status</span><strong>${sanitize(data.claim_status || '-')}</strong></div>
      <div class="line-item compact"><span>Consensus count</span><strong>${formatNumber(data.consensus_count || 0)}</strong></div>
      <div class="line-item compact"><span>Votes</span><strong>${votes.map((v) => `${v.vote}:${v.count}`).join(' | ') || '-'}</strong></div>
    `;
  }

  async function loadProofStatus() {
    const proofId = $('proofIdInput')?.value?.trim();
    if (!proofId) {
      showToast('Enter proof ID.', 'warning');
      return;
    }

    try {
      const data = await apiRequest(`/proof/${encodeURIComponent(proofId)}/status`);
      renderProofStatus(data);
      showToast('Proof status loaded.', 'success');
    } catch (error) {
      showToast(`Proof status failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  function renderLeaderboard(container, rows) {
    if (!container) return;

    if (!rows || !rows.length) {
      renderEmpty(container, t('empty_leaderboard'), '🏆');
      return;
    }

    const podium = rows.slice(0, 3);
    const rest   = rows.slice(3);
    const medals = ['🥇', '🥈', '🥉'];

    container.innerHTML = `
      <div class="lb-podium">
        ${podium.map((row, i) => `
          <div class="lb-podium-item lb-podium-${i + 1}">
            <div class="lb-medal">${medals[i]}</div>
            <div class="lb-name">${sanitize(row.email_masked || row.user_id || '-')}</div>
            <div class="lb-xp">${formatNumber(row.lifetime_xp || 0)} XP</div>
            ${row.rank_name ? `<div class="lb-rank-name muted small">${sanitize(row.rank_name)}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ${rest.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>#</th><th>User</th><th>Rank</th><th>XP</th><th>Points</th></tr>
            </thead>
            <tbody>
              ${rest.map((row) => `
                <tr>
                  <td class="lb-pos">${formatNumber(row.position || 0)}</td>
                  <td>${sanitize(row.email_masked || row.user_id || '-')}</td>
                  <td>${sanitize(row.rank_name || '-')}</td>
                  <td><strong>${formatNumber(row.lifetime_xp || 0)}</strong></td>
                  <td>${formatNumber(row.spendable_points || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;
  }

  async function loadGlobalLeaderboard() {
    try {
      const rows = await apiRequest('/leaderboard/global?limit=50');
      renderLeaderboard($('globalLeaderboard'), rows);
    } catch (error) {
      renderError($('globalLeaderboard'), toApiErrorLabel(error));
      showToast(`Global leaderboard failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function loadFriendsLeaderboard() {
    try {
      const rows = await apiRequest('/leaderboard/friends?limit=50');
      renderLeaderboard($('friendsLeaderboard'), rows);
    } catch (error) {
      renderError($('friendsLeaderboard'), toApiErrorLabel(error));
      showToast(`Friends leaderboard failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  function renderPlusFeatures(rows) {
    const container = $('plusFeatures');
    if (!container) return;

    if (!rows || !rows.length) {
      renderEmpty(container, t('empty_plus_features'));
      return;
    }

    const grouped = {};
    rows.forEach((row) => {
      const key = row.plan_code || 'plus';
      if (!grouped[key]) {
        grouped[key] = {
          plan_name: row.plan_name,
          price_eur: row.price_eur,
          billing_days: row.billing_days,
          features: []
        };
      }
      grouped[key].features.push(row.feature_key);
    });

    container.innerHTML = Object.entries(grouped).map(([code, plan]) => `
      <div class="plus-features-list">
        ${plan.features.map((feature) => `
          <div class="plus-feature-row">
            <span class="plus-check">✓</span>
            <span>${sanitize(feature.replace(/_/g, ' '))}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  function renderPlusStatus(rows) {
    const container = $('plusStatus');
    if (!container) return;

    if (!rows || !rows.length) {
      renderEmpty(container, t('empty_plus_status'));
      return;
    }

    container.innerHTML = rows.map((row) => `
      <div class="line-item compact">
        <div>
          <strong>${sanitize(row.feature_key || '-')}</strong>
          <div class="muted small">Source: ${sanitize(row.source_type || '-')}</div>
        </div>
        <div class="muted small">until ${formatDate(row.ends_at)}</div>
      </div>
    `).join('');
  }

  async function loadPlusFeatures() {
    try {
      const rows = await apiRequest('/plus/features');
      renderPlusFeatures(rows);
    } catch (error) {
      renderError($('plusFeatures'), toApiErrorLabel(error));
      showToast(`Load plus features failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function loadPlusStatus() {
    try {
      const rows = await apiRequest('/plus/status');
      renderPlusStatus(rows);
    } catch (error) {
      renderError($('plusStatus'), toApiErrorLabel(error));
      showToast(`Load plus status failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function subscribePlus() {
    try {
      await apiRequest('/plus/subscribe', { method: 'POST' });
      showToast('Plus subscription activated.', 'success');
      await loadPlusStatus();
    } catch (error) {
      showToast(`Subscribe failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function unlockPlusWithPoints() {
    try {
      await apiRequest('/plus/unlock-with-points', { method: 'POST' });
      showToast('Plus unlocked with points.', 'success');
      await Promise.all([loadPlusStatus(), refreshAuthedPanels()]);
    } catch (error) {
      showToast(`Unlock failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  function renderPremiumInsights(rows) {
    const container = $('premiumInsights');
    if (!container) return;

    if (!rows || !rows.length) {
      renderEmpty(container, t('empty_premium'));
      return;
    }

    container.innerHTML = rows.join('');
  }

  async function runTimeMachine() {
    const productId = $('timeMachineProductId')?.value?.trim();
    if (!productId) {
      showToast('Enter product ID for Time Machine.', 'warning');
      return;
    }

    try {
      const data = await apiRequest(`/insights/time-machine/${encodeURIComponent(productId)}`);
      renderPremiumInsights([
        `<div class="line-item"><span>Product</span><strong>${sanitize(data.product_id || '-')}</strong></div>`,
        `<div class="line-item"><span>Weighted truth price</span><strong>${formatMoney(data.weighted_truth_price)}</strong></div>`,
        `<div class="line-item"><span>Records considered</span><strong>${formatNumber(data.records_considered || 0)}</strong></div>`
      ]);
      showToast('Time Machine loaded.', 'success');
    } catch (error) {
      showToast(`Time Machine failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function loadAdvancedAnalytics() {
    try {
      const data = await apiRequest('/insights/analytics/spending');
      const rows = Array.isArray(data.monthly_spend) ? data.monthly_spend : [];
      if (!rows.length) {
        renderPremiumInsights([`<div class="empty">No spending data available.</div>`]);
        return;
      }

      renderPremiumInsights(rows.map((row) => `
        <div class="line-item compact">
          <span>${formatDate(row.month)}</span>
          <strong>${formatMoney(row.total_spend)}</strong>
        </div>
      `));
      showToast('Advanced analytics loaded.', 'success');
    } catch (error) {
      showToast(`Analytics failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  function renderKidsMissions(rows) {
    const container = $('kidsMissions');
    if (!container) return;

    if (!rows || !rows.length) {
      renderEmpty(container, t('empty_kids_missions'));
      return;
    }

    container.innerHTML = rows.map((row) => `
      <div class="line-item">
        <div>
          <strong>${sanitize(row.title || 'Mission')}</strong>
          <div class="muted small">Mode: ${sanitize(row.kid_mode || '-')} | Category: ${sanitize(row.category || '-')}</div>
        </div>
        <button class="btn btn-small" data-kid-mission-id="${sanitize(row.id)}">Use</button>
      </div>
    `).join('');
  }

  async function activateKidsMode() {
    const displayName = $('kidDisplayName')?.value?.trim() || 'Kid';
    const ageGroup = $('kidAgeGroup')?.value || '4-8';
    const parentPin = $('kidParentPin')?.value || '';

    if (!parentPin) {
      showToast('Parent PIN is required.', 'warning');
      return;
    }

    try {
      const session = await apiRequest('/kids/activate', {
        method: 'POST',
        body: {
          display_name: displayName,
          age_group: ageGroup,
          parent_pin: parentPin,
          household_id: state.activeHouseholdId || null
        }
      });
      state.kidsSessionId = session.id;
      $('kidsSessionId').value = session.id;
      $('kidsMissionSessionId').value = session.id;
      showToast('Kids mode activated.', 'success');
    } catch (error) {
      showToast(`Kids activate failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function deactivateKidsMode() {
    const sessionId = $('kidsSessionId')?.value?.trim() || state.kidsSessionId;
    if (!sessionId) {
      showToast('Kids session ID is required.', 'warning');
      return;
    }

    try {
      await apiRequest('/kids/deactivate', {
        method: 'POST',
        body: { session_id: sessionId }
      });
      state.kidsSessionId = '';
      $('kidsSessionId').value = '';
      $('kidsMissionSessionId').value = '';
      showToast('Kids mode deactivated.', 'success');
      renderKidsMissions([]);
    } catch (error) {
      showToast(`Kids deactivate failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function loadKidsMissions() {
    const sessionId = $('kidsMissionSessionId')?.value?.trim() || state.kidsSessionId;
    if (!sessionId) {
      showToast('Kids session ID is required.', 'warning');
      return;
    }

    try {
      const missions = await apiRequest(`/kids/missions?session_id=${encodeURIComponent(sessionId)}`);
      renderKidsMissions(missions);
      showToast(`Loaded ${Array.isArray(missions) ? missions.length : 0} kids missions.`, 'success');
    } catch (error) {
      renderError($('kidsMissions'), toApiErrorLabel(error));
      showToast(`Load kids missions failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function submitKidsMission() {
    const sessionId = $('kidsMissionSessionId')?.value?.trim() || state.kidsSessionId;
    const missionId = $('kidsMissionId')?.value?.trim();
    const product = $('kidsMissionProduct')?.value?.trim();
    const barcode = $('kidsMissionBarcode')?.value?.trim();
    const storeChain = $('kidsMissionStoreChain')?.value?.trim();

    if (!sessionId || !missionId || !product || !barcode) {
      showToast('Session ID, mission ID, product and barcode are required.', 'warning');
      return;
    }

    try {
      const result = await apiRequest(`/kids/missions/${encodeURIComponent(missionId)}/submit`, {
        method: 'POST',
        body: {
          session_id: sessionId,
          product_canonical_name: product,
          barcode,
          store_chain: storeChain || null,
          foreground_app: true
        }
      });
      renderProofStatus(result);
      showToast('Kids mission submitted.', 'success');
      await refreshAuthedPanels();
    } catch (error) {
      showToast(`Kids submit failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function loadRankCatalog() {
    const container = $('rankCatalog');
    if (!container) return;
    setLoading(container, t('loading_ranks'));

    try {
      const ranks = await apiRequest('/ranks');
      if (!ranks || !ranks.length) {
        renderEmpty(container, t('no_rank_levels'));
        return;
      }

      container.innerHTML = ranks.map((rank) => `
        <div class="line-item compact">
          <span>${formatNumber(rank.level)}. ${sanitize(rank.rank_name || '-')}</span>
          <strong>${formatNumber(rank.min_xp || 0)} xp</strong>
        </div>
      `).join('');
    } catch (error) {
      renderError(container, toApiErrorLabel(error));
      showToast(`Load ranks failed: ${toApiErrorLabel(error)}`, 'error');
    }
  }

  async function refreshAll() {
    await Promise.allSettled([
      refreshAuthedPanels(),
      loadMapStores(),
      loadGlobalLeaderboard(),
      state.token ? loadPlusStatus() : Promise.resolve()
    ]);
    showToast('Refresh complete.', 'info');
  }

  function bindMissionListActions() {
    const container = $('missionsList');
    if (!container) return;

    container.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const card = target.closest('[data-mission-id]');
      if (!card) return;

      const missionId = card.getAttribute('data-mission-id');
      if (!missionId) return;

      if (target.dataset.action === 'start') {
        await startMission(missionId);
        return;
      }

      if (target.dataset.action === 'use') {
        $('missionIdInput').value = missionId;
        showToast(t('mission_selected_for_submit', { id: missionId }), 'info');
      }
    });
  }

  function bindKidsMissionSelection() {
    const container = $('kidsMissions');
    if (!container) return;

    container.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const missionId = target.getAttribute('data-kid-mission-id');
      if (!missionId) return;
      $('kidsMissionId').value = missionId;
      showToast(`Kids mission ${missionId} selected.`, 'info');
    });
  }

  function bindControls() {
    $('registerForm')?.addEventListener('submit', handleRegisterSubmit);
    $('loginForm')?.addEventListener('submit', handleLoginSubmit);
    $('logoutBtn')?.addEventListener('click', handleLogout);
    $('refreshAllBtn')?.addEventListener('click', () => { refreshAll().catch(() => {}); });

    $('searchBtn')?.addEventListener('click', () => { runSearch().catch(() => {}); });
    $('searchInput')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSearch().catch(() => {});
      }
    });
    $('searchResults')?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const lat = target.dataset.navLat;
      const lon = target.dataset.navLon;
      if (!lat || !lon) return;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    $('buildBasketBtn')?.addEventListener('click', () => { buildBasket().catch(() => {}); });
    $('optimizeBasketBtn')?.addEventListener('click', () => { optimizeBasket().catch(() => {}); });

    $('scanBtn')?.addEventListener('click', () => { analyzeReceipt().catch(() => {}); });

    $('createFamilyBtn')?.addEventListener('click', () => { createFamily().catch(() => {}); });
    $('inviteFamilyBtn')?.addEventListener('click', () => { inviteFamilyMember().catch(() => {}); });
    $('copyFamilyInviteTokenBtn')?.addEventListener('click', () => { copyFamilyInviteToken().catch(() => {}); });
    $('joinFamilyBtn')?.addEventListener('click', () => { joinFamily().catch(() => {}); });
    $('loadFamilyListsBtn')?.addEventListener('click', () => { loadFamilyLists().catch(() => {}); });
    $('addFamilyItemBtn')?.addEventListener('click', () => { addFamilyItem().catch(() => {}); });
    $('pollFamilyBtn')?.addEventListener('click', () => { pollFamilyEvents().catch(() => {}); });

    $('loadMissionsBtn')?.addEventListener('click', () => { loadNearbyMissions().catch(() => {}); });
    $('submitMissionBtn')?.addEventListener('click', () => { submitMission().catch(() => {}); });
    $('verifyMissionBtn')?.addEventListener('click', () => { verifyMission().catch(() => {}); });
    $('loadProofBtn')?.addEventListener('click', () => { loadProofStatus().catch(() => {}); });

    $('loadGlobalLeaderboardBtn')?.addEventListener('click', () => { loadGlobalLeaderboard().catch(() => {}); });
    $('loadFriendsLeaderboardBtn')?.addEventListener('click', () => { loadFriendsLeaderboard().catch(() => {}); });

    $('loadPlusFeaturesBtn')?.addEventListener('click', () => { loadPlusFeatures().catch(() => {}); });
    $('subscribePlusBtn')?.addEventListener('click', () => { subscribePlus().catch(() => {}); });
    $('unlockPlusBtn')?.addEventListener('click', () => { unlockPlusWithPoints().catch(() => {}); });
    $('runTimeMachineBtn')?.addEventListener('click', () => { runTimeMachine().catch(() => {}); });
    $('loadAdvancedAnalyticsBtn')?.addEventListener('click', () => { loadAdvancedAnalytics().catch(() => {}); });

    $('kidsActivateForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      activateKidsMode().catch(() => {});
    });
    $('kidsDeactivateForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      deactivateKidsMode().catch(() => {});
    });
    $('loadKidsMissionsBtn')?.addEventListener('click', () => { loadKidsMissions().catch(() => {}); });
    $('submitKidsMissionBtn')?.addEventListener('click', () => { submitKidsMission().catch(() => {}); });

    $('loadRanksBtn')?.addEventListener('click', () => { loadRankCatalog().catch(() => {}); });

    bindMissionListActions();
    bindKidsMissionSelection();
    bindReceiptPreview();
  }

  function initScrollReveal() {
    // Gate opacity:0 on body.js-reveal — without this class everything is
    // visible by default, so Safari/slow-JS users never see a blank page.
    document.body.classList.add('js-reveal');

    const revealEls = Array.from(document.querySelectorAll('.reveal'));
    if (!revealEls.length) return;

    const revealAll = () => revealEls.forEach(el => el.classList.add('visible'));

    if (!('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    // Generous rootMargin so top-of-viewport elements always fire on iOS Safari
    }, { threshold: 0.02, rootMargin: '60px 0px 0px 0px' });

    revealEls.forEach(el => observer.observe(el));

    // Hard fallback: 750 ms after boot make everything visible.
    // Covers iOS Safari 14/15 where IntersectionObserver misses initial viewport.
    setTimeout(revealAll, 750);
  }

  function animateSavingsCounter() {
    const el = document.getElementById('savingsCounter');
    if (!el) return;
    const target = 4.37; // realistic weekly saving demo value
    const duration = 1800;
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = '€' + (target * easeOut(progress)).toFixed(2);
      if (progress < 1) requestAnimationFrame(tick);
    };
    // Start after 600ms so reveal animation finishes first
    setTimeout(() => requestAnimationFrame(tick), 600);
  }

  async function boot() {
    state.device = detectDevice();
    bindNavigation();
    setupLanguage();
    setupAuthTabs();
    setupExperienceEntry();
    setupWaitlistModal();
    applyDeviceNotice();
    setupDeviceWatcher();
    animateSavingsCounter();
    initScrollReveal();
    bindControls();
    renderAuthState();

    renderEmpty($('searchResults'), t('search_placeholder'));
    renderEmpty($('basketItems'), t('basket_empty'));
    renderBasketPlan(null);
    renderReceiptReport(null);
    renderFamilyLists([]);
    renderFamilyEvents({ events: [] });
    renderMissions([]);
    renderLeaderboard($('globalLeaderboard'), []);
    renderLeaderboard($('friendsLeaderboard'), []);
    renderPlusFeatures([]);
    renderPlusStatus([]);
    renderPremiumInsights([]);
    renderKidsMissions([]);
    renderProfile(null);
    renderLedgerPreview([]);
    renderGamification(null);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js?v=20260218-3').catch(() => {});
    }
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : 'Unhandled error';
    showToast(reason, 'error');
  });

  boot().catch((error) => {
    showToast(`Initialization failed: ${error.message || error}`, 'error');
  });
})();
