# Keyword Auth Gate + OpenChat Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect all dashboard routes with a single-password JWT cookie auth gate, and rename every "AutoDM"/"ManyChat Clone" occurrence to "OpenChat" throughout the codebase.

**Architecture:** Next.js 16 middleware intercepts all non-public requests and validates a `auth_token` JWT cookie signed with `jose`. A `/login` page posts the password to `/api/auth/login`, which validates against `ACCESS_PASSWORD` env var and sets the cookie. Brand rename is a string replacement pass across two files (`app/layout.tsx` and `components/layout/Sidebar.tsx`).

**Tech Stack:** Next.js 16.2.9, jose ^6.2.3 (already installed), TypeScript, Tailwind CSS, lucide-react

## Global Constraints

- `jose` version ^6.2.3 — already installed, do not upgrade or add new deps
- Next.js 16.2.9 — read `node_modules/next/dist/docs/` before writing middleware or route handlers if unsure of APIs
- Brand name: "OpenChat" (PascalCase for display), "openchat" (lowercase for slugs/IDs), never "AutoDM" or "ManyChat"
- Env vars must be added to `.env.local` only — no hardcoded secrets
- Cookie name: `auth_token`, JWT algo: HS256, expiry: 30 days
- Webhook route `/api/webhook` must remain publicly accessible (no auth)
- `npm run build` must pass 0 errors after all changes

---

### Task 1: Add env vars to `.env.local`

**Files:**
- Modify: `.env.local`

**Interfaces:**
- Produces: `process.env.ACCESS_PASSWORD` and `process.env.AUTH_SECRET` available at runtime

- [ ] **Step 1: Append env vars to `.env.local`**

Open `/Users/luccamaggiore/manychat-clone/.env.local` and add these two lines at the end:

```
ACCESS_PASSWORD="visivo2026"
AUTH_SECRET="supersecret_openchat_2026"
```

- [ ] **Step 2: Verify vars are present**

```bash
grep "ACCESS_PASSWORD\|AUTH_SECRET" /Users/luccamaggiore/manychat-clone/.env.local
```

Expected output:
```
ACCESS_PASSWORD="visivo2026"
AUTH_SECRET="supersecret_openchat_2026"
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/luccamaggiore/manychat-clone add .env.local
git -C /Users/luccamaggiore/manychat-clone commit -m "chore: add ACCESS_PASSWORD and AUTH_SECRET to .env.local"
```

---

### Task 2: Create login API route (`/api/auth/login`)

**Files:**
- Create: `app/api/auth/login/route.ts`

**Interfaces:**
- Consumes: `process.env.ACCESS_PASSWORD`, `process.env.AUTH_SECRET`
- Produces: `POST /api/auth/login` — accepts `{ password: string }`, returns `{ ok: true }` with `auth_token` cookie on success, or `{ error: string }` with 401 on failure

- [ ] **Step 1: Create directory and file**

Create `/Users/luccamaggiore/manychat-clone/app/api/auth/login/route.ts` with this exact content:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.ACCESS_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'fallback')
  const token = await new SignJWT({ auth: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}
```

- [ ] **Step 2: Verify file exists**

```bash
ls /Users/luccamaggiore/manychat-clone/app/api/auth/login/route.ts
```

Expected: file listed without error.

- [ ] **Step 3: Commit**

```bash
git -C /Users/luccamaggiore/manychat-clone add app/api/auth/login/route.ts
git -C /Users/luccamaggiore/manychat-clone commit -m "feat: add /api/auth/login route"
```

---

### Task 3: Create logout API route (`/api/auth/logout`)

**Files:**
- Create: `app/api/auth/logout/route.ts`

**Interfaces:**
- Produces: `POST /api/auth/logout` — clears `auth_token` cookie, returns `{ ok: true }`

- [ ] **Step 1: Create file**

Create `/Users/luccamaggiore/manychat-clone/app/api/auth/logout/route.ts` with this exact content:

```typescript
import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('auth_token')
  return res
}
```

- [ ] **Step 2: Verify file exists**

```bash
ls /Users/luccamaggiore/manychat-clone/app/api/auth/logout/route.ts
```

Expected: file listed without error.

- [ ] **Step 3: Commit**

```bash
git -C /Users/luccamaggiore/manychat-clone add app/api/auth/logout/route.ts
git -C /Users/luccamaggiore/manychat-clone commit -m "feat: add /api/auth/logout route"
```

---

### Task 4: Create middleware to protect all dashboard routes

**Files:**
- Create: `middleware.ts` (root of project, next to `package.json`)

**Interfaces:**
- Consumes: `auth_token` cookie, `process.env.AUTH_SECRET`
- Produces: middleware that allows public paths + static files through; redirects unauthenticated requests to `/login`; deletes cookie on invalid JWT

- [ ] **Step 1: Create middleware.ts at project root**

Create `/Users/luccamaggiore/manychat-clone/middleware.ts` with this exact content:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/webhook']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths and static files
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'fallback')
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('auth_token')
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Verify file is at project root**

```bash
ls /Users/luccamaggiore/manychat-clone/middleware.ts
```

Expected: file listed without error.

- [ ] **Step 3: Commit**

```bash
git -C /Users/luccamaggiore/manychat-clone add middleware.ts
git -C /Users/luccamaggiore/manychat-clone commit -m "feat: add JWT middleware auth gate"
```

---

### Task 5: Create login page (`/login`)

**Files:**
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/login` (Task 2)
- Produces: `/login` route — a client component with password field, submits to API, redirects to `/dashboard` on success

- [ ] **Step 1: Create directory and file**

Create `/Users/luccamaggiore/manychat-clone/app/login/page.tsx` with this exact content:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Senha incorreta')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#346DF1] mx-auto mb-4 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8 12h8M8 8h8M8 16h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">OpenChat</h1>
          <p className="text-sm text-gray-400 mt-1">Digite a senha de acesso</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#346DF1]/30 focus:border-[#346DF1]"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#346DF1] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify file exists**

```bash
ls /Users/luccamaggiore/manychat-clone/app/login/page.tsx
```

Expected: file listed without error.

- [ ] **Step 3: Commit**

```bash
git -C /Users/luccamaggiore/manychat-clone add app/login/page.tsx
git -C /Users/luccamaggiore/manychat-clone commit -m "feat: add /login page with password form"
```

---

### Task 6: Add logout button to Sidebar

**Files:**
- Modify: `components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/logout` (Task 3), `useRouter` from `next/navigation`
- Produces: Sidebar with a logout button at the bottom that clears the cookie and redirects to `/login`

The current `Sidebar.tsx` content (read before editing):

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Zap, GitBranch, Settings, MessageCircle, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Automações', href: '/automations', icon: Zap },
  { label: 'Flows', href: '/flows', icon: GitBranch },
  { label: 'Configurações', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-gray-200 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-[#346DF1] flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm">AutoDM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-blue-50 text-[#346DF1] font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Profile */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
          <span className="text-xs text-gray-700 font-medium flex-1 text-left truncate">
            Minha Conta
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 1: Replace Sidebar.tsx with updated version**

Replace the entire content of `/Users/luccamaggiore/manychat-clone/components/layout/Sidebar.tsx` with:

```tsx
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Zap, GitBranch, Settings, MessageCircle, ChevronDown, LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Automações', href: '/automations', icon: Zap },
  { label: 'Flows', href: '/flows', icon: GitBranch },
  { label: 'Configurações', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-gray-200 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-[#346DF1] flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm">OpenChat</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-blue-50 text-[#346DF1] font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Profile */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
          <span className="text-xs text-gray-700 font-medium flex-1 text-left truncate">
            Minha Conta
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 w-full mt-2"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify the change**

```bash
grep -n "OpenChat\|LogOut\|handleLogout\|useRouter" /Users/luccamaggiore/manychat-clone/components/layout/Sidebar.tsx
```

Expected: lines showing all four identifiers present.

- [ ] **Step 3: Commit**

```bash
git -C /Users/luccamaggiore/manychat-clone add components/layout/Sidebar.tsx
git -C /Users/luccamaggiore/manychat-clone commit -m "feat: add logout button and rename AutoDM → OpenChat in Sidebar"
```

---

### Task 7: Rename metadata title in `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: browser tab title reads "OpenChat" instead of "ManyChat Clone"

- [ ] **Step 1: Update the metadata title**

In `/Users/luccamaggiore/manychat-clone/app/layout.tsx`, change line 11-13:

Old:
```typescript
export const metadata: Metadata = {
  title: "ManyChat Clone",
  description: "Instagram automation platform",
};
```

New:
```typescript
export const metadata: Metadata = {
  title: "OpenChat",
  description: "Instagram automation platform",
};
```

- [ ] **Step 2: Verify the change**

```bash
grep "title" /Users/luccamaggiore/manychat-clone/app/layout.tsx
```

Expected output:
```
  title: "OpenChat",
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/luccamaggiore/manychat-clone add app/layout.tsx
git -C /Users/luccamaggiore/manychat-clone commit -m "chore: rename ManyChat Clone → OpenChat in metadata"
```

---

### Task 8: Run build and verify 0 errors

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run the build**

```bash
cd /Users/luccamaggiore/manychat-clone && npm run build 2>&1
```

Expected: build completes with `✓ Compiled successfully` or similar and zero TypeScript/ESLint errors. The build script runs `prisma generate && next build` — if Prisma env vars are missing from `.env.local`, it may warn but should not fail the TS compile.

- [ ] **Step 2: If build fails, diagnose**

If you see TypeScript errors, check:
- Import paths in `middleware.ts` — `jose` exports `jwtVerify` and `SignJWT` at the package root
- The `catch` block in `middleware.ts` uses an empty catch `catch {` (no variable) — this is valid TypeScript 4+
- `app/login/page.tsx` uses `'use client'` and client-side hooks — correct for a login form

- [ ] **Step 3: Final verification grep**

```bash
grep -r "AutoDM\|ManyChat Clone\|ManyChat" --include="*.tsx" --include="*.ts" /Users/luccamaggiore/manychat-clone 2>/dev/null | grep -v node_modules | grep -v ".next"
```

Expected: no output (zero matches).

- [ ] **Step 4: Commit all and push**

```bash
git -C /Users/luccamaggiore/manychat-clone add -A
git -C /Users/luccamaggiore/manychat-clone commit -m "feat: keyword auth gate + rename to OpenChat"
git -C /Users/luccamaggiore/manychat-clone push origin main
```

---

## Self-Review

### Spec coverage check

| Requirement | Task |
|---|---|
| `ACCESS_PASSWORD` + `AUTH_SECRET` in `.env.local` | Task 1 |
| `middleware.ts` at root with JWT verification | Task 4 |
| `/api/auth/login` POST route | Task 2 |
| `/api/auth/logout` POST route | Task 3 |
| `/login` page with password form | Task 5 |
| Logout button in `Sidebar.tsx` | Task 6 |
| `LogOut` icon from lucide-react | Task 6 |
| `useRouter` imported in Sidebar | Task 6 |
| `handleLogout` function | Task 6 |
| "AutoDM" → "OpenChat" in Sidebar logo | Task 6 |
| metadata title "ManyChat Clone" → "OpenChat" | Task 7 |
| `npm run build` passes 0 errors | Task 8 |
| `git push origin main` | Task 8 |

### Placeholder scan

No TBDs, no "similar to task N", all code blocks are complete. Build failure diagnostic in Task 8 Step 2 is concrete (specific things to check), not generic.

### Type consistency

- `jwtVerify` used in Task 4 (middleware) — correct jose export name
- `SignJWT` used in Task 2 (login route) — correct jose export name
- Cookie name `auth_token` consistent across Task 2 (set), Task 3 (delete), Task 4 (read)
- Route paths: `/api/auth/login` consistent in Task 2 (route file path), Task 4 (PUBLIC_PATHS), Task 5 (fetch call)
- Route paths: `/api/auth/logout` consistent in Task 3 (route file path), Task 6 (fetch call)
