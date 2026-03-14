"use client";

import { memo } from "react";
import {
  Phone,
  PhoneCall,
  Archive,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  UserCircle,
  Gift,
  CheckCircle,
  Bell,
  Settings,
  Wallet,
  CreditCard,
  PlusCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Wifi,
  Tv,
  Zap,
  Receipt,
  TrendingUp,
  Clock,
  House,
  LogOut,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Copy,
  Share,
  Download,
  AlertCircle,
  AlertTriangle,
  Info,
  ShieldCheck,
  Star,
  Trophy,
  Sparkle,
  Heart,
  ThumbsUp,
  MessageCircle,
  Search,
  Filter,
  Calendar,
  MapPin,
  Building2,
  Coins,
  Tag,
  Ticket,
  Gamepad2,
  MoreHorizontal,
  List,
  LayoutGrid,
  Image,
  Camera,
  FileText,
  Clipboard,
  Pencil,
  Trash,
  Plus,
  HelpCircle,
  Ban,
  CloudOff,
  Radio,
  Users,
  UserPlus,
  Link,
  QrCode,
  Barcode,
  Fingerprint,
  Key,
  Unlock,
  Power,
  Moon,
  Sun,
  Palette,
  Globe,
  Headphones,
  LifeBuoy,
  BookOpen,
  Newspaper,
  Megaphone,
  Flag,
  Medal,
  BarChart3,
  Activity,
  Timer,
  Hourglass,
  Repeat,
  RefreshCw,
  RotateCcw,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Laptop,
  Cloud,
  CloudUpload,
  CloudDownload,
  Folder,
  FolderOpen,
  Files,
  ListOrdered,
  Grid2X2,
  Code,
  Bug,
  Wrench,
  Hammer,
  Sliders,
  Circle,
  Triangle,
  CircleDot,
  CircleDashed,
  Gem,
  Hand,
  Snowflake,
  GraduationCap,
  Flower2,
  Flame,
  ArrowLeftRight,
  Send,
  File,
  ShoppingCart,
  Calculator,
  Package,
  Signal,
  type LucideProps,
} from "lucide-react";

type IconName = string;

interface IonIconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

const iconMap: Record<IconName, React.ComponentType<LucideProps>> = {
  // Phone/Call
  call: PhoneCall,
  "call-outline": Phone,
  phone: PhoneCall,
  "phone-outline": Phone,

  // Mail
  mail: Mail,
  "mail-outline": Mail,
  envelope: Mail,
  "envelope-outline": Mail,

  // Lock
  lock: Lock,
  "lock-outline": Lock,
  lockClosed: Lock,
  "lock-closed": Lock,
  "lock-closed-outline": Lock,

  // Eye
  eye: Eye,
  "eye-outline": Eye,
  eyeSlash: EyeOff,
  "eye-slash-outline": EyeOff,

  // User
  person: User,
  "person-outline": User,
  user: UserCircle,
  "user-outline": UserCircle,
  "person-circle": UserCircle,
  "person-circle-outline": UserCircle,

  // Gift
  gift: Gift,
  "gift-outline": Gift,

  // Check Circle
  "checkmark-circle": CheckCircle,
  "checkmark-circle-outline": CheckCircle,

  // Bell
  notifications: Bell,
  "notifications-outline": Bell,
  bell: Bell,
  "bell-outline": Bell,

  // Settings
  settings: Settings,
  "settings-outline": Settings,
  gear: Settings,

  // Wallet
  wallet: Wallet,
  "wallet-outline": Wallet,

  // Credit Card
  "credit-card": CreditCard,
  "credit-card-outline": CreditCard,
  card: CreditCard,
  "card-outline": CreditCard,

  // Plus Circle
  "add-circle": PlusCircle,
  "add-circle-outline": PlusCircle,
  "add-outline": Plus,
  "add": Plus,

  // Arrow Circle Up
  "arrow-up-circle": ArrowUpCircle,
  "arrow-circle-up": ArrowUpCircle,
  "arrow-up-circle-outline": ArrowUpCircle,

  // Arrow Circle Down
  "arrow-down-circle": ArrowDownCircle,
  "arrow-down-circle-outline": ArrowDownCircle,
  "arrow-circle-down": ArrowDownCircle,

  // Arrow Up
  arrowUp: ArrowUp,
  "arrow-up": ArrowUp,
  "arrow-up-outline": ArrowUp,

  // Arrow Down
  arrowDown: ArrowDown,
  "arrow-down": ArrowDown,
  "arrow-down-outline": ArrowDown,

  // Arrow Left
  arrowLeft: ArrowLeft,
  "arrow-left": ArrowLeft,
  "arrow-left-outline": ArrowLeft,
  "arrow-back": ArrowLeft,
  "arrow-back-outline": ArrowLeft,

  // Arrow Right
  arrowRight: ArrowRight,
  "arrow-right": ArrowRight,
  "arrow-right-outline": ArrowRight,
  "arrow-forward": ArrowRight,
  "arrow-forward-outline": ArrowRight,

  // Wifi
  wifi: Wifi,
  "wifi-outline": Wifi,
  wifiHigh: Wifi,

  // TV
  tv: Tv,
  television: Tv,

  // Lightning/Zap
  lightning: Zap,
  "lightning-outline": Zap,
  flash: Zap,

  // Soccer Ball - using Zap as placeholder
  soccerBall: Zap,
  football: Zap,

  // Receipt
  receipt: Receipt,
  "receipt-outline": Receipt,

  // Trend Up
  trendingUp: TrendingUp,
  "trending-up": TrendingUp,
  trendUp: TrendingUp,
  "trend-up-outline": TrendingUp,

  // Clock
  time: Clock,
  clock: Clock,
  "clock-outline": Clock,
  "time-outline": Clock,

  // House/Home
  home: House,
  house: House,
  "house-outline": House,
  "home-outline": House,

  // Sign Out
  signOut: LogOut,
  "sign-out": LogOut,
  logOut: LogOut,
  "log-out": LogOut,
  "log-out-outline": LogOut,

  // Caret Down
  caretDown: ChevronDown,
  "caret-down": ChevronDown,
  "caret-down-outline": ChevronDown,

  // Caret Up
  caretUp: ChevronUp,
  "caret-up": ChevronUp,
  "caret-up-outline": ChevronUp,

  // Caret Right
  caretRight: ChevronRight,
  "caret-right": ChevronRight,
  "caret-right-outline": ChevronRight,
  "chevron-forward": ChevronRight,
  "chevron-forward-outline": ChevronRight,

  // Caret Left
  caretLeft: ChevronLeft,
  "caret-left": ChevronLeft,
  "caret-left-outline": ChevronLeft,
  "chevron-back": ChevronLeft,
  "chevron-back-outline": ChevronLeft,

  // X/Close
  close: X,
  x: X,
  "x-outline": X,
  "close-outline": X,
  "close-circle": X,
  "close-circle-outline": X,

  // Check
  check: Check,
  checkmark: Check,
  "check-outline": Check,
  "checkmark-outline": Check,
  "checkmark-done": CheckCircle,
  "checkmark-done-outline": CheckCircle,

  // Copy
  copy: Copy,
  "copy-outline": Copy,

  // Share
  share: Share,
  "share-outline": Share,
  "share-social": Share,
  "share-social-outline": Share,

  // Download
  download: Download,
  "download-outline": Download,

  // Warning
  warning: AlertTriangle,
  alert: AlertTriangle,
  "warning-outline": AlertTriangle,
  "alert-circle": AlertCircle,
  "alert-circle-outline": AlertCircle,

  // Info
  information: Info,
  info: Info,
  "information-circle": Info,
  "information-circle-outline": Info,

  // Shield Check
  shieldCheck: ShieldCheck,
  "shield-check": ShieldCheck,
  "shield-check-outline": ShieldCheck,
  "shield-checkmark": ShieldCheck,
  "shield-checkmark-outline": ShieldCheck,

  // Logos (mapped to closest lucide equivalent)
  "logo-whatsapp": MessageCircle,

  // Star
  star: Star,
  "star-outline": Star,

  // Trophy
  trophy: Trophy,
  "trophy-outline": Trophy,

  // Sparkle
  sparkle: Sparkle,
  "sparkle-outline": Sparkle,

  // Heart
  heart: Heart,
  "heart-outline": Heart,

  // Thumbs Up
  thumbsUp: ThumbsUp,
  "thumbs-up": ThumbsUp,

  // Chat Circle
  chat: MessageCircle,
  "chat-outline": MessageCircle,
  chatbubble: MessageCircle,
  "chatbubble-outline": MessageCircle,
  "chatbubble-ellipses": MessageCircle,
  "chatbubble-ellipses-outline": MessageCircle,

  // Search
  search: Search,
  "search-outline": Search,
  magnifyingGlass: Search,

  // Funnel/Filter
  filter: Filter,
  funnel: Filter,
  "filter-outline": Filter,

  // Calendar
  calendar: Calendar,
  "calendar-outline": Calendar,

  // Map Pin
  location: MapPin,
  "location-outline": MapPin,
  mapPin: MapPin,

  // Bank
  bank: Building2,
  "bank-outline": Building2,
  building: Building2,
  business: Building2,
  "business-outline": Building2,
  "business-sharp": Building2,

  // Money - using Coins
  money: Coins,
  moneyOutline: Coins,

  // Tag
  tag: Tag,
  "tag-outline": Tag,
  priceTag: Tag,

  // Ticket
  ticket: Ticket,
  "ticket-outline": Ticket,

  // Game Controller
  game: Gamepad2,
  gameController: Gamepad2,

  // Dots Three - using MoreHorizontal
  dotsThree: MoreHorizontal,
  "dots-three": MoreHorizontal,
  ellipsis: MoreHorizontal,

  // List
  list: List,
  "list-outline": List,

  // Squares Four
  squaresFour: LayoutGrid,
  grid: LayoutGrid,
  "squares-four": LayoutGrid,
  "grid-outline": LayoutGrid,
  "grid-sharp": LayoutGrid,

  // Image
  image: Image,
  "image-outline": Image,
  photo: Image,

  // Camera
  camera: Camera,
  "camera-outline": Camera,

  // File Text
  document: FileText,
  doc: FileText,
  "document-text": FileText,
  "document-text-outline": FileText,

  // Clipboard
  clipboard: Clipboard,
  "clipboard-outline": Clipboard,

  // Pencil
  pencil: Pencil,
  "pencil-outline": Pencil,
  edit: Pencil,

  // Trash
  trash: Trash,
  "trash-outline": Trash,

  // Plus (additional aliases)
  plus: Plus,
  "plus-outline": Plus,

  // Question
  question: HelpCircle,
  "question-outline": HelpCircle,
  help: HelpCircle,
  "help-circle": HelpCircle,
  "help-circle-outline": HelpCircle,

  // Prohibit/Ban
  ban: Ban,
  prohibition: Ban,
  "ban-outline": Ban,

  // Cloud Slash
  cloudOff: CloudOff,
  "cloud-off": CloudOff,
  "cloud-slash": CloudOff,
  "cloud-offline": CloudOff,
  "cloud-offline-outline": CloudOff,

  // Broadcast/Radio
  broadcast: Radio,
  radio: Radio,
  "radio-outline": Radio,

  // Users
  people: Users,
  users: Users,
  "users-outline": Users,
  "people-outline": Users,
  "people-sharp": Users,

  // User Plus
  personAdd: UserPlus,
  "person-add": UserPlus,
  userPlus: UserPlus,

  // Link
  link: Link,
  "link-outline": Link,

  // QR Code
  qrCode: QrCode,
  "qr-code": QrCode,
  qrcode: QrCode,

  // Barcode
  barcode: Barcode,
  "barcode-outline": Barcode,

  // Fingerprint
  fingerprint: Fingerprint,
  "fingerprint-outline": Fingerprint,

  // Key
  key: Key,
  "key-outline": Key,

  // Lock Open
  lockOpen: Unlock,
  "lock-open": Unlock,
  unlock: Unlock,

  // Power
  power: Power,
  "power-outline": Power,

  // Moon
  moon: Moon,
  "moon-outline": Moon,

  // Sun
  sun: Sun,
  "sun-outline": Sun,

  // Palette
  palette: Palette,
  "palette-outline": Palette,
  colorPalette: Palette,

  // Globe
  globe: Globe,
  "globe-outline": Globe,
  world: Globe,

  // Headset
  headset: Headphones,
  headphones: Headphones,
  "headset-outline": Headphones,

  // Lifebuoy
  lifebuoy: LifeBuoy,
  "lifebuoy-outline": LifeBuoy,
  support: LifeBuoy,

  // Book Open
  bookOpen: BookOpen,
  "book-open": BookOpen,
  book: BookOpen,

  // Newspaper
  newspaper: Newspaper,
  "newspaper-outline": Newspaper,

  // Megaphone
  megaphone: Megaphone,
  "megaphone-outline": Megaphone,
  announcement: Megaphone,

  // Flag
  flag: Flag,
  "flag-outline": Flag,

  // Medal
  medal: Medal,
  "medal-outline": Medal,

  // Coin
  coin: Coins,
  "coin-outline": Coins,

  // Coins
  coins: Coins,
  "coins-outline": Coins,

  // Chart Line
  chartLine: TrendingUp,
  "chart-line": TrendingUp,
  "line-chart": TrendingUp,

  // Chart Bar
  chartBar: BarChart3,
  "chart-bar": BarChart3,
  "bar-chart": BarChart3,

  // Pulse
  pulse: Activity,
  "pulse-outline": Activity,
  heartbeat: Activity,

  // Timer
  timer: Timer,
  "timer-outline": Timer,

  // Hourglass
  hourglass: Hourglass,
  "hourglass-outline": Hourglass,

  // Repeat
  repeat: Repeat,
  "repeat-outline": Repeat,

  // Arrows Clockwise
  arrowsClockwise: RefreshCw,
  "arrows-clockwise": RefreshCw,
  sync: RefreshCw,
  refresh: RefreshCw,
  "refresh-outline": RefreshCw,

  // Arrow Clockwise
  arrowClockwise: RotateCcw,
  "arrow-clockwise": RotateCcw,

  // Play
  play: Play,
  "play-outline": Play,

  // Pause
  pause: Pause,
  "pause-outline": Pause,

  // Stop
  stop: Square,
  stopOutline: Square,

  // Skip Forward
  skipForward: SkipForward,
  "skip-forward": SkipForward,
  "skip-forward-outline": SkipForward,

  // Skip Back
  skipBack: SkipBack,
  "skip-back": SkipBack,
  "skip-back-outline": SkipBack,

  // Speaker High
  volumeHigh: Volume2,
  "volume-high": Volume2,
  speaker: Volume2,

  // Speaker Slash
  volumeMute: VolumeX,
  "volume-mute": VolumeX,
  volumeSlash: VolumeX,

  // Device Mobile
  deviceMobile: Smartphone,
  "device-mobile": Smartphone,
  mobile: Smartphone,
  phonePortrait: Smartphone,

  // Cellular/Signal
  cellular: Signal,
  "cellular-outline": Signal,
  signal: Signal,

  // Desktop
  desktop: Monitor,
  "desktop-outline": Monitor,
  computer: Monitor,

  // Laptop
  laptop: Laptop,
  "laptop-outline": Laptop,

  // Cloud
  cloud: Cloud,
  "cloud-outline": Cloud,

  // Cloud Arrow Up
  cloudUpload: CloudUpload,
  "cloud-upload": CloudUpload,
  "cloud-arrow-up": CloudUpload,

  // Cloud Arrow Down
  cloudDownload: CloudDownload,
  "cloud-download": CloudDownload,
  "cloud-arrow-down": CloudDownload,

  // Folder
  folder: Folder,
  "folder-outline": Folder,

  // Archive
  archive: Archive,
  "archive-outline": Archive,
  "archive-sharp": Archive,

  // Folder Open
  folderOpen: FolderOpen,
  "folder-open": FolderOpen,

  // Files
  files: Files,
  "files-outline": Files,
  documents: Files,

  // Chats
  chats: MessageCircle,
  "chats-outline": MessageCircle,

  // List Bullets
  listBullets: ListOrdered,
  "list-bullets": ListOrdered,

  // Grid Four
  gridFour: Grid2X2,
  "grid-four": Grid2X2,

  // Keypad
  keypad: LayoutGrid,
  "keypad-outline": LayoutGrid,

  // Code
  code: Code,
  "code-outline": Code,
  "code-slash": Code,
  "code-slash-outline": Code,

  // Code Block
  codeBlock: Bug,
  "code-block": Bug,

  // Bug
  bug: Bug,
  "bug-outline": Bug,

  // Wrench
  wrench: Wrench,
  "wrench-outline": Wrench,

  // Hammer
  hammer: Hammer,
  "hammer-outline": Hammer,

  // Sliders
  sliders: Sliders,
  "sliders-outline": Sliders,
  options: Sliders,
  "options-outline": Sliders,

  // Circle
  circle: Circle,
  "circle-outline": Circle,

  // Square
  square: Square,
  "square-outline": Square,

  // Triangle
  triangle: Triangle,
  "triangle-outline": Triangle,

  // Zero
  zero: CircleDot,
  numberZero: CircleDot,

  // One
  one: CircleDashed,
  numberOne: CircleDashed,

  // Two - using Circle as placeholder
  two: Circle,
  numberTwo: Circle,

  // Three - using Circle as placeholder
  three: Circle,
  numberThree: Circle,

  // Four - using Circle as placeholder
  four: Circle,
  numberFour: Circle,

  // Five - using Circle as placeholder
  five: Circle,
  numberFive: Circle,

  // Six - using Circle as placeholder
  six: Circle,
  numberSix: Circle,

  // Seven - using Circle as placeholder
  seven: Circle,
  numberSeven: Circle,

  // Eight - using Circle as placeholder
  eight: Circle,
  numberEight: Circle,

  // Nine - using Circle as placeholder
  nine: Circle,
  numberNine: Circle,

  // Gift card occasion icons
  balloon: Gem,
  diamond: Gem,
  handPalm: Hand,
  snowflake: Snowflake,
  graduationCap: GraduationCap,
  flower: Flower2,
  smiley: Flower2,
  flowerLotus: Flower2,
  handWaving: Hand,
  fire: Flame,
  arrowsLeftRight: ArrowLeftRight,
  paperPlaneTilt: Send,
  send: Send,
  "send-outline": Send,
  chatCircleDots: MessageCircle,
  fileDoc: File,
  idCard: CreditCard,
  shoppingCart: ShoppingCart,
  calculator: Calculator,
  package: Package,
};

function IonIcon({ name, ...props }: IonIconProps) {
  const Icon = iconMap[name];

  if (!Icon) {
    console.warn(`Icon "${name}" not found in ion-icon mapping.`);
    return null;
  }

  return <Icon {...props} />;
}

export default memo(IonIcon);
export { IonIcon };
export type { IonIconProps };
