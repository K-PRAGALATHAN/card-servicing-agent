export type Language = "en" | "ta";

/** Every user-facing string key. Keep `en` and `ta` in sync. */
export interface Strings {
  // tabs
  tab_home: string;
  tab_cards: string;
  tab_reach: string;
  tab_settings: string;
  // common
  done: string;
  save: string;
  retry: string;
  available: string;
  from: string;
  to: string;
  amount: string;
  note_optional: string;
  pay_from: string;
  // home
  good_to_see: string;
  available_balance: string;
  self_transfer: string;
  pay_bills: string;
  recharge: string;
  manage_cards: string;
  your_cards: string;
  recent_activity: string;
  no_transactions: string;
  savings_account: string;
  current_account: string;
  // cards
  cards: string;
  freeze_card: string;
  freeze_sub: string;
  manage_service: string;
  manage_limits: string;
  manage_limits_sub: string;
  reset_pin: string;
  reset_pin_sub: string;
  get_statement: string;
  get_statement_sub: string;
  upgrade_card: string;
  upgrade_card_sub: string;
  security: string;
  raise_dispute: string;
  raise_dispute_sub: string;
  report_fraud: string;
  report_fraud_sub: string;
  credit_health: string;
  domestic_limit: string;
  international: string;
  off: string;
  // settings
  settings: string;
  preferences: string;
  language: string;
  theme: string;
  light: string;
  dark: string;
  english: string;
  tamil: string;
  insta_alerts: string;
  insta_alerts_sub: string;
  face_id: string;
  face_id_sub: string;
  my_profile: string;
  personal_details: string;
  personal_details_sub: string;
  kyc_details: string;
  verified: string;
  pending: string;
  support_services: string;
  help_centre: string;
  logout: string;
  session_note: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  customer_id: string;
  pan: string;
  aadhaar: string;
  kyc_status: string;
  secure: string;
}

const en: Strings = {
  tab_home: "Home",
  tab_cards: "Cards",
  tab_reach: "Reach Us",
  tab_settings: "Settings",
  done: "Done",
  save: "Save",
  retry: "Retry",
  available: "Available",
  from: "From",
  to: "To",
  amount: "Amount (₹)",
  note_optional: "Note (optional)",
  pay_from: "Pay from",
  good_to_see: "Good to see you",
  available_balance: "Available balance",
  self_transfer: "Self transfer",
  pay_bills: "Pay bills",
  recharge: "Recharge",
  manage_cards: "Manage cards",
  your_cards: "Your Cards",
  recent_activity: "Recent activity",
  no_transactions: "No transactions yet. Make a transfer or pay a bill.",
  savings_account: "Savings account",
  current_account: "Current account",
  cards: "Cards",
  freeze_card: "Freeze card",
  freeze_sub: "Temporarily block all transactions",
  manage_service: "Manage & Service",
  manage_limits: "Manage limits",
  manage_limits_sub: "Domestic & international caps",
  reset_pin: "Reset ATM PIN",
  reset_pin_sub: "Set a new 4-digit PIN",
  get_statement: "Get statement",
  get_statement_sub: "View your latest statement",
  upgrade_card: "Upgrade card",
  upgrade_card_sub: "Platinum · Millennia · Business",
  security: "Security",
  raise_dispute: "Raise a dispute",
  raise_dispute_sub: "A charge you don't recognise",
  report_fraud: "Report fraud",
  report_fraud_sub: "Block card & secure account",
  credit_health: "Credit health",
  domestic_limit: "Domestic limit",
  international: "International",
  off: "Off",
  settings: "Settings",
  preferences: "Preferences",
  language: "Language",
  theme: "Theme",
  light: "Light",
  dark: "Dark",
  english: "English",
  tamil: "தமிழ்",
  insta_alerts: "Insta Alerts",
  insta_alerts_sub: "SMS & push",
  face_id: "Face ID login",
  face_id_sub: "Biometric security",
  my_profile: "My Profile",
  personal_details: "Personal details",
  personal_details_sub: "Address · phone · email",
  kyc_details: "KYC details",
  verified: "Verified",
  pending: "Pending",
  support_services: "Support & services",
  help_centre: "Help centre",
  logout: "Log out",
  session_note: "For your security, sessions expire quickly.",
  full_name: "Full name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  customer_id: "Customer ID",
  pan: "PAN",
  aadhaar: "Aadhaar",
  kyc_status: "KYC status",
  secure: "Secure",
};

const ta: Strings = {
  tab_home: "முகப்பு",
  tab_cards: "அட்டைகள்",
  tab_reach: "தொடர்பு",
  tab_settings: "அமைப்புகள்",
  done: "முடிந்தது",
  save: "சேமி",
  retry: "மீண்டும் முயற்சி",
  available: "கிடைக்கும்",
  from: "இருந்து",
  to: "வரை",
  amount: "தொகை (₹)",
  note_optional: "குறிப்பு (விருப்பம்)",
  pay_from: "இதிலிருந்து செலுத்து",
  good_to_see: "வணக்கம்",
  available_balance: "இருப்புத் தொகை",
  self_transfer: "சொந்த பரிமாற்றம்",
  pay_bills: "பில் செலுத்து",
  recharge: "ரீசார்ஜ்",
  manage_cards: "அட்டைகளை நிர்வகி",
  your_cards: "உங்கள் அட்டைகள்",
  recent_activity: "சமீபத்திய செயல்பாடு",
  no_transactions: "இதுவரை பரிவர்த்தனைகள் இல்லை. பரிமாற்றம் அல்லது பில் செலுத்துங்கள்.",
  savings_account: "சேமிப்பு கணக்கு",
  current_account: "நடப்பு கணக்கு",
  cards: "அட்டைகள்",
  freeze_card: "அட்டையை முடக்கு",
  freeze_sub: "அனைத்து பரிவர்த்தனைகளையும் தற்காலிகமாக நிறுத்து",
  manage_service: "நிர்வாகம் & சேவை",
  manage_limits: "வரம்புகளை நிர்வகி",
  manage_limits_sub: "உள்நாட்டு & சர்வதேச வரம்புகள்",
  reset_pin: "ஏடிஎம் பின் மாற்று",
  reset_pin_sub: "புதிய 4-இலக்க பின் அமைக்கவும்",
  get_statement: "அறிக்கை பெறு",
  get_statement_sub: "உங்கள் சமீபத்திய அறிக்கையைப் பார்க்கவும்",
  upgrade_card: "அட்டையை மேம்படுத்து",
  upgrade_card_sub: "பிளாட்டினம் · மில்லேனியா · வணிகம்",
  security: "பாதுகாப்பு",
  raise_dispute: "தகராறு எழுப்பு",
  raise_dispute_sub: "நீங்கள் அறியாத கட்டணம்",
  report_fraud: "மோசடியைப் புகாரளி",
  report_fraud_sub: "அட்டையை முடக்கி கணக்கைப் பாதுகா",
  credit_health: "கடன் மதிப்பெண்",
  domestic_limit: "உள்நாட்டு வரம்பு",
  international: "சர்வதேச",
  off: "முடக்கம்",
  settings: "அமைப்புகள்",
  preferences: "விருப்பங்கள்",
  language: "மொழி",
  theme: "தீம்",
  light: "வெளிச்சம்",
  dark: "இருள்",
  english: "English",
  tamil: "தமிழ்",
  insta_alerts: "உடனடி விழிப்பூட்டல்கள்",
  insta_alerts_sub: "எஸ்எம்எஸ் & புஷ்",
  face_id: "முக அடையாள உள்நுழைவு",
  face_id_sub: "பயோமெட்ரிக் பாதுகாப்பு",
  my_profile: "என் சுயவிவரம்",
  personal_details: "தனிப்பட்ட விவரங்கள்",
  personal_details_sub: "முகவரி · தொலைபேசி · மின்னஞ்சல்",
  kyc_details: "KYC விவரங்கள்",
  verified: "சரிபார்க்கப்பட்டது",
  pending: "நிலுவையில்",
  support_services: "ஆதரவு & சேவைகள்",
  help_centre: "உதவி மையம்",
  logout: "வெளியேறு",
  session_note: "உங்கள் பாதுகாப்பிற்காக, அமர்வுகள் விரைவில் காலாவதியாகும்.",
  full_name: "முழு பெயர்",
  email: "மின்னஞ்சல்",
  phone: "தொலைபேசி",
  address: "முகவரி",
  customer_id: "வாடிக்கையாளர் ஐடி",
  pan: "PAN",
  aadhaar: "ஆதார்",
  kyc_status: "KYC நிலை",
  secure: "பாதுகாப்பானது",
};

export const DICT: Record<Language, Strings> = { en, ta };
