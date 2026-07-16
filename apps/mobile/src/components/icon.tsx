import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Home01Icon,
  UserGroupIcon,
  UserIcon,
  FootballIcon,
  ShoppingCart01Icon,
  Shield01Icon,
  Shield02Icon,
  CoinsDollarIcon,
  DiamondIcon,
  EnergyIcon,
  PlusSignIcon,
  Clock01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  RunningShoesIcon,
  StarIcon,
  ViewIcon,
  CheckmarkCircle01Icon,
  CircleIcon,
  Alert02Icon,
  CubeIcon,
  Notification03Icon,
  ChampionIcon,
  ArrowReloadHorizontalIcon,
  TradeUpIcon,
  TradeDownIcon,
  MinusSignIcon,
  Exchange01Icon,
  Target01Icon,
  FavouriteIcon,
  GridViewIcon,
  Search01Icon,
  FilterHorizontalIcon,
  FireIcon,
  SnowIcon,
  ThermometerIcon,
  TShirtIcon,
  File01Icon,
  Bookmark01Icon,
  GlobeIcon,
  Tag01Icon,
  PulseIcon,
  Wallet01Icon,
  WrenchIcon,
  Building01Icon,
  DumbbellIcon,
  MortarboardIcon,
  Medicine01Icon,
} from "@hugeicons/core-free-icons";
import { Handshake, Workflow, type LucideIcon } from "lucide-react-native";
import { color as palette } from "@/theme";

/**
 * Ícones do app. Padrão: Hugeicons (set free). Quando o Hugeicons não tem o
 * ícone certo (evitar substituto que não encaixa), usa-se Lucide como fallback.
 * As telas seguem usando nomes semânticos estáveis (`<Icon name="football" />`),
 * desacopladas de qual biblioteca serve cada ícone.
 */
type HugeIcon = React.ComponentProps<typeof HugeiconsIcon>["icon"];
type Entry = { readonly hi: HugeIcon } | { readonly lu: LucideIcon };

const hi = (icon: HugeIcon): Entry => ({ hi: icon });
const lu = (icon: LucideIcon): Entry => ({ lu: icon });

const MAP = {
  home: hi(Home01Icon),
  people: hi(UserGroupIcon),
  person: hi(UserIcon),
  football: hi(FootballIcon),
  trophy: hi(ChampionIcon),
  cart: hi(ShoppingCart01Icon),
  transfer: hi(ArrowReloadHorizontalIcon),
  shield: hi(Shield01Icon),
  "shield-half": hi(Shield02Icon),
  "logo-usd": hi(CoinsDollarIcon),
  diamond: hi(DiamondIcon),
  flash: hi(EnergyIcon),
  add: hi(PlusSignIcon),
  time: hi(Clock01Icon),
  "time-outline": hi(Clock01Icon),
  "chevron-forward": hi(ArrowRight01Icon),
  "chevron-down": hi(ArrowDown01Icon),
  "chevron-up": hi(ArrowUp01Icon),
  "arrow-back": hi(ArrowLeft01Icon),
  "arrow-forward": hi(ArrowRight01Icon),
  "arrow-up": hi(ArrowUp01Icon),
  "arrow-down": hi(ArrowDown01Icon),
  "arrow-up-circle": hi(ArrowUp01Icon),
  "arrow-down-circle": hi(ArrowDown01Icon),
  walk: hi(RunningShoesIcon),
  star: hi(StarIcon),
  "star-outline": hi(StarIcon),
  eye: hi(ViewIcon),
  "checkmark-circle": hi(CheckmarkCircle01Icon),
  ellipse: hi(CircleIcon),
  warning: hi(Alert02Icon),
  cube: hi(CubeIcon),
  notifications: hi(Notification03Icon),
  "notifications-outline": hi(Notification03Icon),
  "trending-up": hi(TradeUpIcon),
  "trending-down": hi(TradeDownIcon),
  remove: hi(MinusSignIcon),
  "swap-horizontal": hi(Exchange01Icon),
  locate: hi(Target01Icon),
  heart: hi(FavouriteIcon),
  grid: hi(GridViewIcon),
  search: hi(Search01Icon),
  "search-circle": hi(Search01Icon),
  options: hi(FilterHorizontalIcon),
  flame: hi(FireIcon),
  snow: hi(SnowIcon),
  thermometer: hi(ThermometerIcon),
  shirt: hi(TShirtIcon),
  "document-text": hi(File01Icon),
  bookmark: hi(Bookmark01Icon),
  globe: hi(GlobeIcon),
  pricetag: hi(Tag01Icon),
  pulse: hi(PulseIcon),
  wallet: hi(Wallet01Icon),
  construct: hi(WrenchIcon),
  business: hi(Building01Icon),
  barbell: hi(DumbbellIcon),
  school: hi(MortarboardIcon),
  medkit: hi(Medicine01Icon),
  // Fallbacks Lucide (Hugeicons sem ícone que encaixe):
  "hand-left": lu(Handshake), // agentes livres
  "git-network": lu(Workflow), // estratégia de mercado
} satisfies Record<string, Entry>;

export type IconName = keyof typeof MAP;

export function Icon({
  name,
  size = 20,
  color = palette.text,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const entry: Entry = MAP[name] ?? { hi: CircleIcon };
  if ("lu" in entry) {
    const L = entry.lu;
    return <L size={size} color={color} strokeWidth={strokeWidth} />;
  }
  return <HugeiconsIcon icon={entry.hi} size={size} color={color} strokeWidth={strokeWidth} />;
}
