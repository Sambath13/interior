export const MODULES = [
  { id: "charting", label: "Charting" },
  { id: "footprint", label: "Footprint" },
  { id: "orderflow", label: "Orderflow" },
  { id: "options", label: "Options Desk" },
  { id: "broker", label: "Broker Trading" },
  { id: "alerts", label: "Smart Alerts" },
] as const;

export const ROLES = ["trader", "analyst", "admin"] as const;
export const PLANS = ["free", "lite", "premium"] as const;
export const STATUSES = ["active", "suspended"] as const;

export type ModuleId = (typeof MODULES)[number]["id"];
export type Role = (typeof ROLES)[number];
export type Plan = (typeof PLANS)[number];
export type Status = (typeof STATUSES)[number];

export type AdminUser = {
  id: string;
  name: string;
  traderId: string;
  email: string;
  role: Role;
  plan: Plan;
  status: Status;
  modules: ModuleId[];
  createdAt: string;
};

export type UserInput = Omit<AdminUser, "id" | "createdAt">;

const STORAGE_KEY = "tradefoot-admin-users";

const SEED_USERS: AdminUser[] = [
  {
    id: "u-1001",
    name: "Gokul Krishnan",
    traderId: "gokul.trader",
    email: "gokul@tradefoot.com",
    role: "admin",
    plan: "premium",
    status: "active",
    modules: ["charting", "footprint", "orderflow", "options", "broker", "alerts"],
    createdAt: "2026-03-12",
  },
  {
    id: "u-1002",
    name: "Ananya Rao",
    traderId: "ananya.rao",
    email: "ananya@tradefoot.com",
    role: "analyst",
    plan: "premium",
    status: "active",
    modules: ["charting", "footprint", "orderflow", "alerts"],
    createdAt: "2026-05-02",
  },
  {
    id: "u-1003",
    name: "Rahul Mehta",
    traderId: "rahul.mehta",
    email: "rahul@tradefoot.com",
    role: "trader",
    plan: "lite",
    status: "active",
    modules: ["charting", "alerts"],
    createdAt: "2026-06-18",
  },
  {
    id: "u-1004",
    name: "Priya Shah",
    traderId: "priya.shah",
    email: "priya@tradefoot.com",
    role: "trader",
    plan: "free",
    status: "suspended",
    modules: ["charting"],
    createdAt: "2026-07-09",
  },
];

function createId() {
  return `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function readStore(): AdminUser[] {
  if (typeof window === "undefined") return SEED_USERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_USERS;
    const parsed = JSON.parse(raw) as AdminUser[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_USERS;
  } catch {
    return SEED_USERS;
  }
}

function writeStore(users: AdminUser[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// Dynamic local store for now. Replace each method body with fetch() later.
export const userService = {
  async list(): Promise<AdminUser[]> {
    return readStore();
  },

  async create(input: UserInput): Promise<AdminUser> {
    const users = readStore();
    const user: AdminUser = {
      id: createId(),
      createdAt: new Date().toISOString().slice(0, 10),
      ...input,
    };
    writeStore([user, ...users]);
    return user;
  },

  async update(id: string, input: UserInput): Promise<AdminUser> {
    const users = readStore();
    const current = users.find((user) => user.id === id);
    if (!current) {
      throw new Error("User not found.");
    }
    const updated: AdminUser = { ...current, ...input };
    writeStore(users.map((user) => (user.id === id ? updated : user)));
    return updated;
  },

  async remove(id: string): Promise<void> {
    writeStore(readStore().filter((user) => user.id !== id));
  },
};
