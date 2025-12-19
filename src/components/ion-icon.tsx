"use client";

import {
  Phone,
  PhoneCall,
  Envelope,
  EnvelopeSimple,
  Lock,
  LockSimple,
  Eye,
  EyeSlash,
  User,
  UserCircle,
  Gift,
  CheckCircle,
  Bell,
  Gear,
  Wallet,
  CreditCard,
  PlusCircle,
  ArrowCircleUp,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  WifiHigh,
  Television,
  Lightning,
  SoccerBall,
  Receipt,
  TrendUp,
  Clock,
  House,
  HouseLine,
  SignOut,
  CaretDown,
  CaretUp,
  CaretRight,
  CaretLeft,
  X,
  Check,
  Copy,
  Share,
  Download,
  Warning,
  Info,
  ShieldCheck,
  Star,
  Trophy,
  Sparkle,
  Heart,
  ThumbsUp,
  ChatCircle,
  MagnifyingGlass,
  Funnel,
  Calendar,
  MapPin,
  Bank,
  Money,
  Tag,
  Ticket,
  GameController,
  DotsThree,
  List,
  SquaresFour,
  Image,
  Camera,
  FileText,
  Clipboard,
  PencilSimple,
  Trash,
  Plus,
  Question,
  Prohibit,
  CloudSlash,
  Broadcast,
  Users,
  UserPlus,
  Link as LinkIcon,
  QrCode,
  Barcode,
  Fingerprint,
  Key,
  LockOpen,
  Power,
  Moon,
  Sun,
  Palette,
  Globe,
  Headset,
  Lifebuoy,
  BookOpen,
  Newspaper,
  Megaphone,
  Flag,
  Medal,
  Coin,
  Coins,
  ChartLine,
  ChartBar,
  Pulse,
  Timer,
  Hourglass,
  Repeat,
  ArrowsClockwise,
  ArrowClockwise,
  Play,
  Pause,
  Stop,
  SkipForward,
  SkipBack,
  SpeakerHigh,
  SpeakerSlash,
  DeviceMobile,
  Desktop,
  Laptop,
  Cloud,
  CloudArrowUp,
  CloudArrowDown,
  Folder,
  FolderOpen,
  Files,
  Chats,
  ListBullets,
  GridFour,
  Code,
  CodeBlock,
  Bug,
  Wrench,
  Hammer,
  Sliders,
  Circle,
  Square,
  Triangle,
  NumberCircleZero,
  NumberCircleOne,
  NumberCircleTwo,
  NumberCircleThree,
  NumberCircleFour,
  NumberCircleFive,
  NumberCircleSix,
  NumberCircleSeven,
  NumberCircleEight,
  NumberCircleNine,
  // Gift card occasion icons
  Balloon,
  Diamond,
  HandPalm,
  Snowflake,
  GraduationCap,
  Flower,
  Smiley,
  FlowerLotus,
  HandWaving,
  NumberSquareNine,
  Fire,
  ArrowsLeftRight,
  PaperPlaneTilt,
  ChatCircleDots,
  FileDoc,
  IdentificationCard,
  ShoppingCart,
  ShoppingCartSimple,
  type IconProps,
} from "@phosphor-icons/react";

// Map Ionicon names to Phosphor components
const iconMap: Record<string, React.ComponentType<IconProps>> = {
  // Phone/Call
  call: PhoneCall,
  "call-outline": Phone,
  phone: PhoneCall,
  "phone-outline": Phone,

  // Mail
  mail: EnvelopeSimple,
  "mail-outline": Envelope,

  // Lock/Security
  "lock-closed": LockSimple,
  "lock-closed-outline": Lock,
  "lock-open": LockOpen,
  "lock-open-outline": LockOpen,
  shield: ShieldCheck,
  "shield-outline": ShieldCheck,
  "shield-checkmark": ShieldCheck,
  "shield-checkmark-outline": ShieldCheck,
  key: Key,
  "key-outline": Key,
  "finger-print": Fingerprint,
  "finger-print-outline": Fingerprint,

  // Eye
  eye: Eye,
  "eye-outline": Eye,
  "eye-off": EyeSlash,
  "eye-off-outline": EyeSlash,

  // User/Person
  person: UserCircle,
  "person-outline": User,
  "person-circle": IdentificationCard,
  "person-circle-outline": IdentificationCard,
  "person-add": UserPlus,
  "person-add-outline": UserPlus,
  people: Users,
  "people-outline": Users,

  // Gift
  gift: Gift,
  "gift-outline": Gift,

  // Keypad
  keypad: NumberSquareNine,
  "keypad-outline": NumberSquareNine,

  // Flame/Fire
  flame: Fire,
  "flame-outline": Fire,

  // Construct/Build
  construct: Wrench,
  "construct-outline": Wrench,

  // Check/Success
  checkmark: Check,
  "checkmark-outline": Check,
  "checkmark-circle": CheckCircle,
  "checkmark-circle-outline": CheckCircle,

  // Notifications
  notifications: Bell,
  "notifications-outline": Bell,

  // Settings
  settings: Gear,
  "settings-outline": Gear,
  options: Sliders,
  "options-outline": Sliders,

  // Wallet/Money
  wallet: Wallet,
  "wallet-outline": Wallet,
  card: CreditCard,
  "card-outline": CreditCard,
  cash: Money,
  "cash-outline": Money,

  // Add/Plus
  add: Plus,
  "add-outline": Plus,
  "add-circle": PlusCircle,
  "add-circle-outline": PlusCircle,

  // Arrows
  "arrow-up": ArrowUp,
  "arrow-up-outline": ArrowUp,
  "arrow-down": ArrowDown,
  "arrow-down-outline": ArrowDown,
  "arrow-back": ArrowLeft,
  "arrow-back-outline": ArrowLeft,
  "arrow-forward": ArrowRight,
  "arrow-forward-outline": ArrowRight,
  "arrow-up-circle": ArrowCircleUp,
  "arrow-up-circle-outline": ArrowCircleUp,

  // Chevrons/Carets
  "chevron-down": CaretDown,
  "chevron-down-outline": CaretDown,
  "chevron-up": CaretUp,
  "chevron-up-outline": CaretUp,
  "chevron-forward": CaretRight,
  "chevron-forward-outline": CaretRight,
  "chevron-back": CaretLeft,
  "chevron-back-outline": CaretLeft,

  // Close/X
  close: X,
  "close-outline": X,
  "close-circle": X,
  "close-circle-outline": X,

  // WiFi/Data
  wifi: WifiHigh,
  "wifi-outline": WifiHigh,
  cellular: Broadcast,
  "cellular-outline": Broadcast,

  // TV
  tv: Television,
  "tv-outline": Television,

  // Lightning/Flash
  flash: Lightning,
  "flash-outline": Lightning,

  // Sports/Games
  football: SoccerBall,
  "football-outline": SoccerBall,
  "game-controller": GameController,
  "game-controller-outline": GameController,

  // Receipt/Transactions
  receipt: Receipt,
  "receipt-outline": Receipt,

  // Trending
  "trending-up": TrendUp,
  "trending-up-outline": TrendUp,

  // Time
  time: Clock,
  "time-outline": Clock,
  timer: Timer,
  "timer-outline": Timer,
  hourglass: Hourglass,
  "hourglass-outline": Hourglass,

  // Home
  home: House,
  "home-outline": HouseLine,

  // Logout
  "log-out": SignOut,
  "log-out-outline": SignOut,
  exit: SignOut,
  "exit-outline": SignOut,

  // Copy/Share
  copy: Copy,
  "copy-outline": Copy,

  // Paper Plane / Send
  "paper-plane": PaperPlaneTilt,
  "paper-plane-outline": PaperPlaneTilt,
  send: PaperPlaneTilt,
  "send-outline": PaperPlaneTilt,
  share: Share,
  "share-outline": Share,
  "share-social": Share,
  "share-social-outline": Share,

  // Download
  download: Download,
  "download-outline": Download,
  "cloud-download": CloudArrowDown,
  "cloud-download-outline": CloudArrowDown,

  // Warning/Info
  warning: Warning,
  "warning-outline": Warning,
  alert: Warning,
  "alert-outline": Warning,
  "alert-circle": Warning,
  "alert-circle-outline": Warning,
  information: Info,
  "information-outline": Info,
  "information-circle": Info,
  "information-circle-outline": Info,
  help: Question,
  "help-outline": Question,
  "help-circle": Question,
  "help-circle-outline": Question,

  // Star/Rating
  star: Star,
  "star-outline": Star,

  // Trophy/Awards
  trophy: Trophy,
  "trophy-outline": Trophy,
  medal: Medal,
  "medal-outline": Medal,
  ribbon: Medal,
  "ribbon-outline": Medal,

  // Sparkle/Effects
  sparkles: Sparkle,
  "sparkles-outline": Sparkle,

  // Heart/Like
  heart: Heart,
  "heart-outline": Heart,
  "thumbs-up": ThumbsUp,
  "thumbs-up-outline": ThumbsUp,

  // Chat/Message
  chatbubble: ChatCircle,
  "chatbubble-outline": ChatCircle,
  "chatbubble-ellipses": ChatCircleDots,
  "chatbubble-ellipses-outline": ChatCircleDots,
  chatbubbles: Chats,
  "chatbubbles-outline": Chats,

  // Search
  search: MagnifyingGlass,
  "search-outline": MagnifyingGlass,

  // Filter
  filter: Funnel,
  "filter-outline": Funnel,
  funnel: Funnel,
  "funnel-outline": Funnel,

  // Calendar
  calendar: Calendar,
  "calendar-outline": Calendar,

  // Location
  location: MapPin,
  "location-outline": MapPin,
  pin: MapPin,
  "pin-outline": MapPin,

  // Bank
  business: Bank,
  "business-outline": Bank,

  // Percent/Discount
  pricetag: Tag,
  "pricetag-outline": Tag,
  pricetags: Tag,
  "pricetags-outline": Tag,

  // Ticket
  ticket: Ticket,
  "ticket-outline": Ticket,

  // Spinner/Loading
  sync: ArrowsClockwise,
  "sync-outline": ArrowsClockwise,
  refresh: ArrowClockwise,
  "refresh-outline": ArrowClockwise,
  reload: ArrowClockwise,
  "reload-outline": ArrowClockwise,

  // Menu/List
  menu: List,
  "menu-outline": List,
  list: ListBullets,
  "list-outline": ListBullets,
  grid: GridFour,
  "grid-outline": SquaresFour,
  apps: SquaresFour,
  "apps-outline": SquaresFour,

  // Image/Camera
  image: Image,
  "image-outline": Image,
  images: Image,
  "images-outline": Image,
  camera: Camera,
  "camera-outline": Camera,

  // Document/File
  document: FileText,
  "document-outline": FileText,
  "document-text": FileDoc,
  "document-text-outline": FileDoc,
  documents: Files,
  "documents-outline": Files,
  clipboard: Clipboard,
  "clipboard-outline": Clipboard,

  // Edit/Write
  create: PencilSimple,
  "create-outline": PencilSimple,
  pencil: PencilSimple,
  "pencil-outline": PencilSimple,

  // Delete/Trash
  trash: Trash,
  "trash-outline": Trash,

  // Link
  link: LinkIcon,
  "link-outline": LinkIcon,

  // QR/Barcode
  "qr-code": QrCode,
  "qr-code-outline": QrCode,
  barcode: Barcode,
  "barcode-outline": Barcode,

  // Power
  power: Power,
  "power-outline": Power,

  // Theme
  moon: Moon,
  "moon-outline": Moon,
  sunny: Sun,
  "sunny-outline": Sun,
  contrast: Palette,
  "contrast-outline": Palette,

  // Globe/Language
  globe: Globe,
  "globe-outline": Globe,
  earth: Globe,
  "earth-outline": Globe,
  language: Globe,
  "language-outline": Globe,

  // Support
  headset: Headset,
  "headset-outline": Headset,
  "help-buoy": Lifebuoy,
  "help-buoy-outline": Lifebuoy,

  // Book/Learn
  book: BookOpen,
  "book-outline": BookOpen,
  newspaper: Newspaper,
  "newspaper-outline": Newspaper,

  // Megaphone/Announce
  megaphone: Megaphone,
  "megaphone-outline": Megaphone,

  // Flag
  flag: Flag,
  "flag-outline": Flag,

  // Coins/Money
  "logo-usd": Coin,
  coins: Coins,

  // Chart/Stats
  "stats-chart": ChartLine,
  "stats-chart-outline": ChartLine,
  "bar-chart": ChartBar,
  "bar-chart-outline": ChartBar,
  analytics: ChartLine,
  "analytics-outline": ChartLine,
  pulse: Pulse,
  "pulse-outline": Pulse,

  // Repeat/Refresh
  repeat: Repeat,
  "repeat-outline": Repeat,

  // Swap
  "swap-horizontal": ArrowsLeftRight,
  "swap-horizontal-outline": ArrowsLeftRight,
  "swap-vertical": ArrowsLeftRight,
  "swap-vertical-outline": ArrowsLeftRight,

  // Play/Media
  play: Play,
  "play-outline": Play,
  pause: Pause,
  "pause-outline": Pause,
  stop: Stop,
  "stop-outline": Stop,
  "play-forward": SkipForward,
  "play-forward-outline": SkipForward,
  "play-back": SkipBack,
  "play-back-outline": SkipBack,

  // Volume
  "volume-high": SpeakerHigh,
  "volume-high-outline": SpeakerHigh,
  "volume-mute": SpeakerSlash,
  "volume-mute-outline": SpeakerSlash,

  // Device
  "phone-portrait": DeviceMobile,
  "phone-portrait-outline": DeviceMobile,
  desktop: Desktop,
  "desktop-outline": Desktop,
  laptop: Laptop,
  "laptop-outline": Laptop,

  // Cloud
  cloud: Cloud,
  "cloud-outline": Cloud,
  "cloud-upload": CloudArrowUp,
  "cloud-upload-outline": CloudArrowUp,

  // Folder/File
  folder: Folder,
  "folder-outline": Folder,
  "folder-open": FolderOpen,
  "folder-open-outline": FolderOpen,

  // Ellipsis/More
  "ellipsis-horizontal": DotsThree,
  "ellipsis-horizontal-outline": DotsThree,
  "ellipsis-vertical": DotsThree,
  "ellipsis-vertical-outline": DotsThree,

  // Prohibit/Block
  ban: Prohibit,
  "ban-outline": Prohibit,

  // Offline
  "cloud-offline": CloudSlash,
  "cloud-offline-outline": CloudSlash,

  // Code
  code: Code,
  "code-outline": Code,
  "code-slash": CodeBlock,
  "code-slash-outline": CodeBlock,

  // Bug
  bug: Bug,
  "bug-outline": Bug,

  // Build/Tools
  build: Wrench,
  "build-outline": Wrench,
  hammer: Hammer,
  "hammer-outline": Hammer,

  // Shapes
  square: Square,
  "square-outline": Square,
  triangle: Triangle,
  "triangle-outline": Triangle,

  // Gift card occasion icons
  balloon: Balloon,
  "balloon-outline": Balloon,
  diamond: Diamond,
  "diamond-outline": Diamond,
  "hand-left": HandPalm,
  "hand-left-outline": HandPalm,
  snow: Snowflake,
  "snow-outline": Snowflake,
  school: GraduationCap,
  "school-outline": GraduationCap,
  flower: Flower,
  "flower-outline": Flower,
  rose: FlowerLotus,
  "rose-outline": FlowerLotus,
  happy: Smiley,
  "happy-outline": Smiley,
  "hand-right": HandWaving,
  "hand-right-outline": HandWaving,

  // Social/Logo icons (map to closest Phosphor equivalent)
  "logo-whatsapp": ChatCircle,
  "logo-facebook": Globe,
  "logo-twitter": Globe,
  "logo-instagram": Camera,
  "logo-google": Globe,
  "logo-apple": DeviceMobile,
  "logo-android": DeviceMobile,

  // Additional commonly used icons
  "checkmark-done": Check,
  "checkmark-done-outline": Check,
  sad: Smiley,
  "sad-outline": Smiley,

  // Cart/Shopping
  cart: ShoppingCart,
  "cart-outline": ShoppingCartSimple,
  bag: ShoppingCart,
  "bag-outline": ShoppingCartSimple,

  // Numbers
  "0": NumberCircleZero,
  "1": NumberCircleOne,
  "2": NumberCircleTwo,
  "3": NumberCircleThree,
  "4": NumberCircleFour,
  "5": NumberCircleFive,
  "6": NumberCircleSix,
  "7": NumberCircleSeven,
  "8": NumberCircleEight,
  "9": NumberCircleNine,
};

// Fallback icon for unmapped names
const FallbackIcon = Circle;

interface IonIconProps {
  name: string;
  size?: string;
  color?: string;
  className?: string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}

export function IonIcon({
  name,
  size = "20px",
  color,
  className = "",
  weight = "regular",
}: IonIconProps) {
  const IconComponent = iconMap[name] || FallbackIcon;
  const sizeNum = parseInt(size.replace("px", ""), 10) || 20;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        width: size,
        height: size,
        color,
      }}
    >
      <IconComponent size={sizeNum} weight={weight} />
    </span>
  );
}
