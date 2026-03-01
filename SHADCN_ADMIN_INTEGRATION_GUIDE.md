# shadcn-admin Template Integration Guide

**Template:** https://github.com/satnaing/shadcn-admin.git  
**Target:** TADA VTU Admin Dashboard  
**Timeline:** 2-3 days for core integration  

---

## 🎨 Step 1: Update Color Scheme (30 minutes)

### Update `src/app/globals.css`

Replace the existing `@layer base` section with:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    
    /* TADA Green Primary */
    --primary: 142.1 76.2% 36.3%;
    --primary-foreground: 355.7 100% 97.3%;
    
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 142.1 76.2% 36.3%;
    --radius: 0.5rem;
    
    /* Chart Colors */
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    /* Dark Mode - Primary for Admin */
    --background: 20 14.3% 4.1%;
    --foreground: 0 0% 95%;
    --card: 24 9.8% 10%;
    --card-foreground: 0 0% 95%;
    --popover: 0 0% 9%;
    --popover-foreground: 0 0% 95%;
    
    /* TADA Green for Dark Mode */
    --primary: 142.1 70.6% 45.3%;
    --primary-foreground: 144.9 80.4% 10%;
    
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 15%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 12 6.5% 15.1%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 85.7% 97.3%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 142.4 71.8% 29.2%;
    
    /* Chart Colors for Dark Mode */
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```

---

## 📦 Step 2: Install Required Dependencies (10 minutes)

```bash
cd tada-vtu

# Install shadcn-admin dependencies
npm install @tanstack/react-table
npm install date-fns
npm install recharts  # Already installed, but verify
npm install lucide-react  # For icons
npm install class-variance-authority
npm install clsx
npm install tailwind-merge

# Optional but recommended
npm install @radix-ui/react-tabs
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-popover
```

---

## 🗂️ Step 3: Copy Components from shadcn-admin (2 hours)

### 3.1 Clone the Template (Temporary)

```bash
# In a separate directory
cd ..
git clone https://github.com/satnaing/shadcn-admin.git
cd shadcn-admin
```

### 3.2 Components to Copy

Copy these files from `shadcn-admin/src/components/` to `tada-vtu/src/components/admin/`:

**Essential Components:**

1. **Data Table**
   - `data-table.tsx`
   - `data-table-toolbar.tsx`
   - `data-table-pagination.tsx`
   - `data-table-column-header.tsx`

2. **Charts**
   - `charts/area-chart.tsx`
   - `charts/bar-chart.tsx`
   - `charts/line-chart.tsx`
   - `charts/pie-chart.tsx`

3. **Layout**
   - `layout/sidebar.tsx`
   - `layout/header.tsx`
   - `layout/user-nav.tsx`
   - `layout/theme-toggle.tsx`

4. **Cards**
   - `cards/stat-card.tsx`
   - `cards/metric-card.tsx`

5. **UI Components** (if not already in your `src/components/ui/`)
   - `ui/table.tsx`
   - `ui/tabs.tsx`
   - `ui/tooltip.tsx`
   - `ui/popover.tsx`
   - `ui/badge.tsx`

---

## 🔧 Step 4: Adapt Components for TADA (3 hours)

### 4.1 Update Import Paths

In all copied files, update imports:

```typescript
// Change from:
import { Button } from "@/components/ui/button"

// To (if needed):
import { Button } from "@/components/ui/button"
// (Should be the same, but verify)
```

### 4.2 Customize Sidebar

**File:** `src/components/admin/layout/sidebar.tsx`

Update navigation items:

```typescript
const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: "LayoutDashboard",
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: "Users",
  },
  {
    title: "Transactions",
    href: "/admin/transactions",
    icon: "Receipt",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: "BarChart3",
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: "Settings",
  },
];
```

### 4.3 Add TADA Branding

Update the logo/branding in sidebar:

```typescript
import { LogoInline } from "@/components/logo";

// In sidebar component:
<div className="flex items-center gap-2 px-4 py-6">
  <LogoInline size="sm" />
  <span className="text-sm font-semibold">Admin</span>
</div>
```

---

## 📄 Step 5: Create Admin Layout (1 hour)

### File: `src/app/admin/layout.tsx`

```typescript
import { AdminSidebar } from "@/components/admin/layout/sidebar";
import { AdminHeader } from "@/components/admin/layout/header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 📊 Step 6: Create Dashboard Page (2 hours)

### File: `src/app/admin/page.tsx`

```typescript
import { StatCard } from "@/components/admin/cards/stat-card";
import { AreaChart } from "@/components/admin/charts/area-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  // Fetch data from Supabase
  const stats = await getAdminStats();
  
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`₦${stats.revenue.toLocaleString()}`}
          change={12.5}
          trend="up"
          subtitle="Trending up this month"
        />
        <StatCard
          title="New Customers"
          value={stats.newCustomers}
          change={-20}
          trend="down"
          subtitle="Down 20% this period"
        />
        <StatCard
          title="Active Accounts"
          value={stats.activeAccounts.toLocaleString()}
          change={12.5}
          trend="up"
          subtitle="Strong user retention"
        />
        <StatCard
          title="Growth Rate"
          value={`${stats.growthRate}%`}
          change={4.5}
          trend="up"
          subtitle="Steady performance"
        />
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Total Visitors</CardTitle>
        </CardHeader>
        <CardContent>
          <AreaChart data={stats.visitorsData} />
        </CardContent>
      </Card>
    </div>
  );
}

// Server-side data fetching
async function getAdminStats() {
  // TODO: Implement Supabase queries
  return {
    revenue: 1250000,
    newCustomers: 1234,
    activeAccounts: 45678,
    growthRate: 4.5,
    visitorsData: [],
  };
}
```

---

## 🗃️ Step 7: Create Data Table Page (3 hours)

### File: `src/app/admin/users/page.tsx`

```typescript
import { DataTable } from "@/components/admin/data-table";
import { columns } from "./columns";

export default async function UsersPage() {
  const users = await getUsers();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage your users and their accounts
        </p>
      </div>
      
      <DataTable columns={columns} data={users} />
    </div>
  );
}
```

### File: `src/app/admin/users/columns.tsx`

```typescript
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/admin/data-table-column-header";

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "full_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "balance",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Balance" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("balance"));
      return `₦${amount.toLocaleString()}`;
    },
  },
  {
    accessorKey: "pricing_tier",
    header: "Tier",
    cell: ({ row }) => {
      const tier = row.getValue("pricing_tier") as string;
      return (
        <Badge variant={tier === "platinum" ? "default" : "secondary"}>
          {tier}
        </Badge>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active");
      return (
        <Badge variant={isActive ? "success" : "destructive"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
];
```

---

## 🔌 Step 8: Connect to Supabase (2 hours)

### Create Admin Data Fetching Utilities

**File:** `src/lib/admin/data.ts`

```typescript
import { createClient } from "@/lib/supabase/server";

export async function getAdminStats() {
  const supabase = createClient();
  
  // Get total revenue
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount")
    .eq("status", "success")
    .gte("created_at", getStartOfMonth());
  
  const revenue = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
  
  // Get new customers this month
  const { count: newCustomers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", getStartOfMonth());
  
  // Get active accounts
  const { count: activeAccounts } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  
  return {
    revenue,
    newCustomers: newCustomers || 0,
    activeAccounts: activeAccounts || 0,
    growthRate: 4.5, // Calculate from previous period
  };
}

export async function getUsers(page = 1, limit = 50) {
  const supabase = createClient();
  
  const { data, error, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  return {
    users: data || [],
    total: count || 0,
  };
}

function getStartOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}
```

---

## 🎨 Step 9: Add Dark Mode Toggle (30 minutes)

### File: `src/components/admin/theme-toggle.tsx`

```typescript
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

---

## 🚀 Step 10: Testing & Deployment (1 hour)

### 10.1 Test Locally

```bash
npm run dev
```

Visit:
- http://localhost:3000/admin
- http://localhost:3000/admin/users
- http://localhost:3000/admin/transactions

### 10.2 Check for Issues

- [ ] All pages load without errors
- [ ] Dark mode works correctly
- [ ] Data tables display properly
- [ ] Charts render correctly
- [ ] Mobile responsive
- [ ] TADA green color appears correctly

### 10.3 Deploy

```bash
git add -A
git commit -m "Integrate shadcn-admin template with TADA branding"
git push origin main
```

---

## 📋 Checklist

### Phase 1: Setup (Day 1)
- [ ] Update color scheme in globals.css
- [ ] Install dependencies
- [ ] Clone shadcn-admin template
- [ ] Copy essential components
- [ ] Update import paths

### Phase 2: Layout (Day 1-2)
- [ ] Create admin layout
- [ ] Customize sidebar with TADA branding
- [ ] Add header component
- [ ] Implement theme toggle
- [ ] Test navigation

### Phase 3: Dashboard (Day 2)
- [ ] Create stat cards
- [ ] Add charts
- [ ] Connect to Supabase
- [ ] Display real data
- [ ] Test responsiveness

### Phase 4: Data Tables (Day 2-3)
- [ ] Implement users table
- [ ] Add sorting/filtering
- [ ] Create transactions table
- [ ] Add pagination
- [ ] Test performance

### Phase 5: Polish (Day 3)
- [ ] Fix any styling issues
- [ ] Optimize performance
- [ ] Add loading states
- [ ] Test on mobile
- [ ] Deploy to production

---

## 🎯 Quick Start Commands

```bash
# 1. Update colors
# Edit src/app/globals.css with the color scheme above

# 2. Install dependencies
npm install @tanstack/react-table date-fns lucide-react

# 3. Clone template (in separate directory)
cd ..
git clone https://github.com/satnaing/shadcn-admin.git

# 4. Copy components
# Manually copy files from shadcn-admin to tada-vtu

# 5. Test
cd tada-vtu
npm run dev

# 6. Deploy
git add -A
git commit -m "Add shadcn-admin integration"
git push origin main
```

---

## 💡 Tips

1. **Start Small:** Implement dashboard first, then add tables
2. **Test Often:** Check each component as you add it
3. **Keep Backups:** Commit frequently
4. **Mobile First:** Test on mobile throughout
5. **Performance:** Use React Server Components where possible

---

## 🔗 Resources

- shadcn-admin: https://github.com/satnaing/shadcn-admin
- shadcn/ui docs: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com
- Radix UI: https://www.radix-ui.com
- Recharts: https://recharts.org

---

## 🆘 Troubleshooting

**Issue:** Components not found  
**Fix:** Check import paths, ensure components are in correct directory

**Issue:** Colors not applying  
**Fix:** Verify globals.css is imported in layout.tsx

**Issue:** Dark mode not working  
**Fix:** Ensure next-themes provider is set up in root layout

**Issue:** Data not loading  
**Fix:** Check Supabase connection, verify RLS policies

---

**Next Steps:**
1. Start with color scheme update (30 min)
2. Install dependencies (10 min)
3. Copy and adapt components (2-3 hours)
4. Test and iterate

Good luck! 🚀
