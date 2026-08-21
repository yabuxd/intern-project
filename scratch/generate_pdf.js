const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Restaurant Management System - Technical Architecture & Presentation Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    :root {
      --primary: #1e293b;
      --primary-dark: #0f172a;
      --accent: #2563eb;
      --accent-light: #eff6ff;
      --accent-gold: #d97706;
      --gold-light: #fef3c7;
      --emerald: #059669;
      --emerald-light: #ecfdf5;
      --rose: #e11d48;
      --rose-light: #fff1f2;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --bg-light: #f8fafc;
      --border: #e2e8f0;
      --border-dark: #cbd5e1;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: var(--text-main);
      background-color: #ffffff;
      line-height: 1.55;
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #94a3b8;
        font-family: 'Inter', sans-serif;
      }
    }

    .page-break {
      page-break-before: always;
    }

    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* Cover / Header Section */
    .doc-header {
      border-bottom: 2px solid var(--primary);
      padding-bottom: 18px;
      margin-bottom: 24px;
    }

    .doc-badge {
      display: inline-block;
      background: var(--accent-light);
      color: var(--accent);
      font-weight: 600;
      font-size: 8.5pt;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }

    .doc-title {
      font-size: 24pt;
      font-weight: 800;
      color: var(--primary-dark);
      line-height: 1.2;
      margin-bottom: 6px;
    }

    .doc-subtitle {
      font-size: 12pt;
      color: var(--text-muted);
      font-weight: 500;
      margin-bottom: 12px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: var(--bg-light);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 8.5pt;
    }

    .meta-item strong {
      display: block;
      color: var(--text-muted);
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .meta-item span {
      color: var(--primary-dark);
      font-weight: 600;
    }

    /* Section Headings */
    h2 {
      font-size: 14pt;
      font-weight: 700;
      color: var(--primary-dark);
      margin-top: 22px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1.5px solid var(--border);
      padding-bottom: 4px;
    }

    h2 .num {
      background: var(--primary-dark);
      color: #ffffff;
      width: 22px;
      height: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 700;
    }

    h3 {
      font-size: 11.5pt;
      font-weight: 700;
      color: var(--primary);
      margin-top: 14px;
      margin-bottom: 6px;
    }

    h4 {
      font-size: 10pt;
      font-weight: 600;
      color: var(--accent);
      margin-top: 10px;
      margin-bottom: 4px;
    }

    p {
      margin-bottom: 8px;
      font-size: 10pt;
      color: #334155;
    }

    ul, ol {
      margin-left: 18px;
      margin-bottom: 10px;
      font-size: 9.5pt;
      color: #334155;
    }

    li {
      margin-bottom: 4px;
    }

    strong {
      color: var(--primary-dark);
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 8.5pt;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }

    th, td {
      padding: 7px 10px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    th {
      background: var(--bg-light);
      color: var(--primary-dark);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.04em;
    }

    tr:last-child td {
      border-bottom: none;
    }

    /* Code Blocks & Mono */
    code {
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 8.5pt;
      background: var(--bg-light);
      border: 1px solid var(--border);
      padding: 1px 4px;
      border-radius: 4px;
      color: #0f172a;
    }

    pre {
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 8pt;
      background: #0f172a;
      color: #e2e8f0;
      padding: 10px 12px;
      border-radius: 6px;
      margin: 8px 0 12px 0;
      overflow-x: auto;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    pre .kw { color: #f43f5e; font-weight: 600; }
    pre .fn { color: #38bdf8; }
    pre .str { color: #a3e635; }
    pre .comment { color: #64748b; font-style: italic; }

    /* Callouts & Alert Boxes */
    .callout {
      border-left: 4px solid var(--accent);
      background: var(--accent-light);
      padding: 10px 12px;
      border-radius: 0 6px 6px 0;
      margin: 10px 0 12px 0;
      font-size: 9.5pt;
    }

    .callout-gold {
      border-left-color: var(--accent-gold);
      background: var(--gold-light);
    }

    .callout-emerald {
      border-left-color: var(--emerald);
      background: var(--emerald-light);
    }

    .callout-rose {
      border-left-color: var(--rose);
      background: var(--rose-light);
    }

    .callout-title {
      font-weight: 700;
      font-size: 9.5pt;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .callout-gold .callout-title { color: #92400e; }
    .callout-emerald .callout-title { color: #065f46; }
    .callout-rose .callout-title { color: #9f1239; }
    .callout .callout-title { color: #1e40af; }

    /* Diagram Boxes */
    .diagram-box {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      color: #38bdf8;
      line-height: 1.35;
      margin: 10px 0 14px 0;
      white-space: pre;
    }

    /* Grid cards */
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 8px 0 12px 0;
    }

    .card {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      background: #ffffff;
    }

    .card h4 {
      margin-top: 0;
      font-size: 9.5pt;
      margin-bottom: 4px;
    }

    .card p {
      font-size: 8.5pt;
      margin-bottom: 0;
      color: var(--text-muted);
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
  </style>
</head>
<body>

  <!-- COVER / HEADER -->
  <div class="doc-header">
    <div class="doc-badge">Presentation & Technical Defense Guide</div>
    <h1 class="doc-title">Restaurant Order & Table Management System</h1>
    <div class="doc-subtitle">Full-Stack Hospitality Platform &bull; React 19 &bull; Laravel 12 &bull; Supabase Postgres &bull; Chapa Fintech</div>
    <div class="meta-grid">
      <div class="meta-item">
        <strong>Monorepo Type</strong>
        <span>Decoupled SPA + API</span>
      </div>
      <div class="meta-item">
        <strong>Core Currency & Domain</strong>
        <span>ETB &bull; Ethiopian Hospitality</span>
      </div>
      <div class="meta-item">
        <strong>Authentication</strong>
        <span>Supabase ES256 JWT / JWKS</span>
      </div>
      <div class="meta-item">
        <strong>Realtime Engine</strong>
        <span>Postgres Changes + Polling</span>
      </div>
    </div>
  </div>

  <!-- SECTION 1: HIGH LEVEL OVERVIEW -->
  <section class="avoid-break">
    <h2><span class="num">1</span> High-Level Overview</h2>
    
    <h3>Purpose & Problem Statement</h3>
    <p>
      The <strong>Restaurant Order and Table Management System</strong> is a full-scale, multi-role hospitality platform built to streamline end-to-end restaurant operations. In traditional food and beverage environments, paper tickets, disconnected phone orders, manual cash logging, and delayed kitchen communication create costly operational friction, inventory discrepancies, and extended customer wait times.
    </p>
    <p>
      This platform completely synchronizes front-of-house customer interactions, kitchen order processing, delivery logistics, cashier payment reconciliation, table reservations, and executive analytics into a single responsive digital ecosystem.
    </p>

    <h3>Target End Users</h3>
    <div class="cards-grid">
      <div class="card">
        <h4>1. Guests & Customers</h4>
        <p>Browse Ethiopian cuisine (Doro Wat, Tibs, Kitfo) priced in ETB, place Dine-In or Delivery orders, pay via Chapa or Cash, book table reservations, and track live status with printable digital receipts.</p>
      </div>
      <div class="card">
        <h4>2. Kitchen Staff & Chefs</h4>
        <p>Live Kitchen Display System (KDS) queue tracking orders through distinct states (<code>pending</code> &rarr; <code>preparing</code> &rarr; <code>ready</code> &rarr; <code>served</code>) with instant sound/visual updates via Realtime feeds.</p>
      </div>
      <div class="card">
        <h4>3. Delivery Drivers</h4>
        <p>Dedicated logistics board to view ready deliveries, accept assignments, access customer delivery phone/address/notes, and advance orders to <code>out_for_delivery</code> and <code>delivered</code>.</p>
      </div>
      <div class="card">
        <h4>4. Cashiers & Front Desk</h4>
        <p>Centralized Cashier Payment Desk to validate incoming online Chapa transactions before releasing them to the kitchen queue, and record physical cash collections.</p>
      </div>
      <div class="card">
        <h4>5. Hosts & Floor Managers</h4>
        <p>Interactive floor status viewer (<code>free</code>, <code>reserved</code>, <code>occupied</code>) and conflict-free table reservation scheduler.</p>
      </div>
      <div class="card">
        <h4>6. Administrators & Managers</h4>
        <p>Manage RBAC roles and permissions, approve/reject staff menu change requests, manage user accounts, and review executive KPI dashboards (revenue, AOV, top sellers, occupancy).</p>
      </div>
    </div>

    <h3>Tech Stack Summary</h3>
    <table>
      <thead>
        <tr>
          <th>Layer</th>
          <th>Technology</th>
          <th>Role & Key Libraries</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Frontend (SPA)</strong></td>
          <td>React 19, TypeScript, Vite, Tailwind CSS</td>
          <td>TanStack Query (React Query v5), React Router DOM v7, Supabase JS client</td>
        </tr>
        <tr>
          <td><strong>Backend (API)</strong></td>
          <td>Laravel 12 (PHP 8.3+)</td>
          <td>Eloquent ORM, Gates & Policies, Form Requests, Keyset Pagination, ApiCacheService</td>
        </tr>
        <tr>
          <td><strong>Database</strong></td>
          <td>Supabase PostgreSQL &bull; SQLite (Local)</td>
          <td>Row-Level Security (RLS) policies, Realtime Publication, custom composite indexes</td>
        </tr>
        <tr>
          <td><strong>Authentication</strong></td>
          <td>Supabase Auth (ES256 JWT)</td>
          <td>Asymmetric public JWKS verification in Laravel, 90s claim caching, user table sync</td>
        </tr>
        <tr>
          <td><strong>Payments</strong></td>
          <td>Chapa Payment Gateway</td>
          <td>Ethiopian Birr (ETB) checkout (Telebirr, CBE, Cards), webhook signature verification</td>
        </tr>
        <tr>
          <td><strong>Shared Contracts</strong></td>
          <td><code>@intern/shared</code> (npm workspace)</td>
          <td>Shared TypeScript interfaces, DTOs, Enums, and Permission constants</td>
        </tr>
      </tbody>
    </table>

    <div class="callout callout-emerald avoid-break">
      <div class="callout-title">30-Second Elevator Pitch (Speaker Script)</div>
      "Our Restaurant Order & Table Management System is an enterprise-grade, full-stack hospitality platform that eliminates communication gaps between customers, kitchen crews, delivery drivers, and managers. Built with React 19, Laravel 12, Supabase PostgreSQL, and Chapa digital payments, it seamlessly coordinates dine-in seating, online orders, real-time kitchen queues, driver dispatch, and cashier verification. By decoupling identity with Supabase JWTs, syncing live orders over Postgres Realtime streams, and enforcing granular role-based access control, the system transforms chaotic floor operations into an efficient, transparent, and data-driven powerhouse."
    </div>
  </section>

  <div class="page-break"></div>

  <!-- SECTION 2: SYSTEM ARCHITECTURE -->
  <section>
    <h2><span class="num">2</span> System Architecture</h2>

    <h3>Architectural Paradigm</h3>
    <p>
      The system implements a <strong>Decoupled Modular Monorepo Architecture</strong>. The frontend Single Page Application (SPA) and backend REST API operate as independent services while sharing a central TypeScript type contract package (<code>shared/</code>). Managed cloud services provide specialized capabilities: Supabase handles identity, user credentials, and database event streaming, while Chapa handles banking and fintech settlement.
    </p>

    <div class="diagram-box avoid-break">
+-----------------------------------------------------------------------------------------------+
|                                      REACT 19 CLIENT (SPA)                                    |
|   Vite &bull; TypeScript &bull; Tailwind CSS &bull; TanStack Query &bull; Supabase JS Client &bull; React Router 7   |
|                                                                                               |
|  [Guest Menu & Cart]   [Kitchen Queue (KDS)]   [Driver Board]   [Cashier Desk]   [Admin Ops]  |
+---------------+---------------------+--------------------+--------------------+---------------+
                |                     |                    |                    |
         (1) Auth / Token      (2) Bearer JWT       (3) Supabase         (4) 5s Polling
             Exchange              API Requests         Realtime Channel     Fallback Timer
                v                     v                    ^                    v
    +-----------------------+ +--------------------+       |        +-----------------------+
    |     SUPABASE AUTH     | |   LARAVEL 12 API   |       |        |    LARAVEL 12 API     |
    |  - Password Hashing   | |  - VerifySupabase- |       |        |  - /api/orders/queue  |
    |  - ES256 Asymmetric   | |    Jwt Middleware  |       |        |  - /api/deliveries    |
    |    JWT Token Issuance | |  - RBAC Gates/Roles|       |        |  - /api/payments/desk |
    +-----------------------+ |  - ApiCacheService |       |        +-----------+-----------+
                              |  - ChapaPaymentSvc |       |                    |
                              +---------+----------+       |                    |
                                        |                  |                    |
                                 (5) Eloquent ORM          |             (5) Eloquent ORM
                                        |                  |                    |
                                        v                  |                    v
                      +------------------------------------+--------------------+---------------+
                      |                   DATABASE LAYER (PostgreSQL / SQLite)                  |
                      | - PostgreSQL tables with Row-Level Security (RLS) policies              |
                      | - Realtime publication (supabase_realtime on public.orders)             |
                      | - Keyset pagination indexes & FK referential integrity constraints      |
                      +------------------------------------+------------------------------------+
                                                           |
                                            (6) Initialize / Webhook
                                                           v
                                            +-------------------------------+
                                            |     CHAPA PAYMENT GATEWAY     |
                                            | (Telebirr, CBE, Cards in ETB) |
                                            +-------------------------------+
    </div>

    <h3>Communication Channels & Protocols</h3>
    <ul>
      <li><strong>Client to Backend API:</strong> RESTful HTTP/JSON over HTTPS. Every authenticated request includes an <code>Authorization: Bearer &lt;access_token&gt;</code> header. Responses follow standard JSON envelopes (<code>{ success: true, data: ..., message?: string }</code>).</li>
      <li><strong>Keyset Cursor Pagination:</strong> High-volume endpoints (<code>/api/orders</code>, <code>/api/reservations</code>, <code>/api/admin/users</code>) utilize cursor pagination (<code>?after_id=100&limit=50</code>), preventing database scan degradation.</li>
      <li><strong>Realtime Event Pipeline:</strong> Kitchen and delivery screens open a WebSocket connection via Supabase Realtime (<code>postgres_changes</code> on <code>public.orders</code>). When an order is updated, the socket immediately pushes the event to the client, triggering an instant TanStack Query cache invalidation.</li>
      <li><strong>Resilient Fallback:</strong> If WebSocket connectivity drops or local SQLite is used, the custom <code>useOrdersRealtime</code> hook seamlessly activates a 5-second polling interval.</li>
    </ul>
  </section>

  <!-- SECTION 3: FOLDER & FILE STRUCTURE -->
  <section>
    <h2><span class="num">3</span> Folder & File Structure</h2>

    <p>The repository is organized as an npm monorepo with three top-level workspaces/directories:</p>

    <div class="avoid-break">
      <pre>
intern-project/
├── <span class="str">client/</span>                          <span class="comment"># React 19 Single Page Application (Vite + TypeScript + Tailwind)</span>
│   ├── <span class="str">src/</span>
│   │   ├── <span class="str">main.tsx</span>                 <span class="comment"># Client entry point: mounts React DOM & TanStack Query client</span>
│   │   ├── <span class="str">App.tsx</span>                  <span class="comment"># Root router: AuthLayout, AppLayout, and ProtectedRoute tree</span>
│   │   ├── <span class="str">store/AuthContext.tsx</span>    <span class="comment"># Global auth provider: Supabase session sync & RBAC permissions</span>
│   │   ├── <span class="str">services/api.ts</span>          <span class="comment"># Strongly-typed API client for all Laravel REST endpoints</span>
│   │   ├── <span class="str">services/supabase.ts</span>     <span class="comment"># Supabase JS client configuration singleton</span>
│   │   ├── <span class="str">hooks/useOrdersRealtime.ts</span><span class="comment"># Supabase Realtime channel subscription + 5s polling fallback</span>
│   │   ├── <span class="str">pages/</span>                   <span class="comment"># 13 UI Pages (HomePage, MenuPage, OrderQueuePage, PaymentsPage, etc.)</span>
│   │   ├── <span class="str">layouts/</span>                 <span class="comment"># AppLayout (nav, notification bell), AuthLayout, AdminLayout</span>
│   │   └── <span class="str">components/ui/</span>           <span class="comment"># Skeletons, loading states, and atomic UI widgets</span>
├── <span class="str">server/</span>                          <span class="comment"># Laravel 12 REST API (PHP 8.3+)</span>
│   ├── <span class="str">routes/api.php</span>               <span class="comment"># API route definitions (public routes & VerifySupabaseJwt group)</span>
│   ├── <span class="str">app/Http/Controllers/Api/</span>    <span class="comment"># 12 REST Controllers (OrderController, CashierController, etc.)</span>
│   ├── <span class="str">app/Http/Middleware/</span>        <span class="comment"># VerifySupabaseJwt.php (ES256 JWKS verification & user sync)</span>
│   ├── <span class="str">app/Http/Requests/</span>          <span class="comment"># Form request validation classes (StoreOrderRequest, etc.)</span>
│   ├── <span class="str">app/Models/</span>                 <span class="comment"># 11 Eloquent models (Order, MenuItem, Table, User, Role, etc.)</span>
│   ├── <span class="str">app/Policies/</span>               <span class="comment"># RBAC policy guards (OrderPolicy, MenuItemPolicy, UserPolicy, etc.)</span>
│   ├── <span class="str">app/Services/</span>               <span class="comment"># Domain services (ChapaPaymentService, ApiCacheService, etc.)</span>
│   ├── <span class="str">app/Support/KeysetPaginator.php</span> <span class="comment"># O(1) cursor pagination engine</span>
│   ├── <span class="str">database/migrations/</span>        <span class="comment"># 19 Schema migrations (RLS policies, realtime publications, indexes)</span>
│   └── <span class="str">database/seeders/</span>           <span class="comment"># Seeders for Ethiopian menu dishes, tables, roles, and permissions</span>
├── <span class="str">shared/</span>                          <span class="comment"># TypeScript Package (@intern/shared)</span>
│   ├── <span class="str">types/index.ts</span>               <span class="comment"># Unified TypeScript interfaces (Order, MenuItem, AuthUser, etc.)</span>
│   └── <span class="str">index.ts</span>                     <span class="comment"># Exported permission constants (PERMISSIONS) and role catalogs</span>
└── <span class="str">docs/</span>                            <span class="comment"># Technical setup and architecture specifications</span></pre>
    </div>

    <h3>Application Entry Points & Configuration</h3>
    <ul>
      <li><strong>Frontend Entry Point:</strong> <code>client/src/main.tsx</code> initializes <code>QueryClient</code>, wraps the root in <code>AuthProvider</code>, and renders <code>App.tsx</code> with the routing table.</li>
      <li><strong>Backend Entry Point:</strong> <code>server/public/index.php</code> boots the Laravel HTTP kernel through <code>bootstrap/app.php</code> and executes middleware and route bindings in <code>routes/api.php</code>.</li>
      <li><strong>Configuration Files:</strong>
        <ul>
          <li><code>client/.env</code>: Controls <code>VITE_API_BASE_URL</code>, <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>.</li>
          <li><code>server/.env</code>: Controls database connection (<code>DB_CONNECTION=pgsql</code> / <code>sqlite</code>), Supabase keys (<code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>), and payment credentials (<code>CHAPA_SECRET_KEY</code>, <code>CHAPA_BASE_URL</code>).</li>
        </ul>
      </li>
    </ul>
  </section>

  <div class="page-break"></div>

  <!-- SECTION 4: CORE FEATURES & MODULES -->
  <section>
    <h2><span class="num">4</span> Core Features & Functional Modules</h2>

    <div class="avoid-break">
      <h3>1. Authentication & Identity Synchronization</h3>
      <p>
        <strong>What it does:</strong> Enables secure user registration and login using Supabase Auth, handles email confirmation, and automatically provisions a matching record in the local database with the default <code>customer</code> role.
      </p>
      <p>
        <strong>Files & Functions:</strong> <code>client/src/store/AuthContext.tsx</code>, <code>server/app/Http/Middleware/VerifySupabaseJwt.php</code>, <code>server/app/Http/Controllers/Api/MeController.php</code>.
      </p>
      <p>
        <strong>Data Flow:</strong> Client signs in via Supabase JS SDK &rarr; receives ES256 JWT &rarr; passes token to Laravel &rarr; middleware verifies signature against cached JWKS &rarr; upserts record in <code>users</code> &rarr; caches user auth profile &rarr; returns profile, roles, and effective permissions via <code>GET /api/me</code>.
      </p>
    </div>

    <div class="avoid-break">
      <h3>2. Digital Menu & 2-Phase Change Approval Workflow</h3>
      <p>
        <strong>What it does:</strong> Displays categorized Ethiopian dishes with high-res photos and ETB pricing. For menu governance, staff with <code>can_propose_menu_changes</code> submit change requests (create/delete) into a staging table; managers or admins review and approve/reject them.
      </p>
      <p>
        <strong>Files & Functions:</strong> <code>MenuController.php</code>, <code>MenuItemController.php</code>, <code>MenuChangeRequestController.php</code>, <code>MenuChangeRequestService.php</code>, <code>ManageMenuPage.tsx</code>.
      </p>
      <p>
        <strong>Data Flow:</strong> Staff submits proposal &rarr; stored in <code>menu_change_requests</code> with status <code>pending</code> &rarr; Manager calls <code>PATCH /api/menu-change-requests/{id}/approve</code> &rarr; service executes database mutation on <code>menu_items</code> &rarr; <code>ApiCacheService::forgetMenu()</code> clears cached menu &rarr; updated menu broadcasts to clients.
      </p>
    </div>

    <div class="avoid-break">
      <h3>3. Cart, Dual Fulfillment & Order Processing</h3>
      <p>
        <strong>What it does:</strong> Allows guests to add items to cart, select <strong>Dine-In</strong> (with designated table ID) or <strong>Delivery</strong> (with delivery address, phone, and driver instructions), and choose payment method (Chapa online vs. Cash-on-delivery/pay-later).
      </p>
      <p>
        <strong>Files & Functions:</strong> <code>OrderController::store</code>, <code>StoreOrderRequest.php</code>, <code>MenuPage.tsx</code>, <code>OrdersPage.tsx</code>.
      </p>
      <p>
        <strong>Data Flow:</strong> Client submits order payload &rarr; wrapped in database transaction &rarr; server checks item availability and recalculates prices &rarr; creates <code>orders</code> and <code>order_items</code> &rarr; if Chapa: initiates gateway transaction & returns checkout URL; if Cash: dispatches manager notification and sets payment to <code>not_required</code>.
      </p>
    </div>

    <div class="avoid-break">
      <h3>4. Dual Payment Gateway & Cashier Validation Desk</h3>
      <p>
        <strong>What it does:</strong> Supports online fintech payments via Chapa (Telebirr, CBE Birr, cards) and physical cash payments. Implements a critical <strong>2-Phase Validation Guard</strong>: online Chapa payments must be approved at the Cashier Desk before appearing on the kitchen queue, protecting the kitchen from preparing unpaid or unverified orders.
      </p>
      <p>
        <strong>Files & Functions:</strong> <code>CashierController.php</code>, <code>ChapaPaymentController.php</code>, <code>ChapaPaymentService.php</code>, <code>PaymentsPage.tsx</code>.
      </p>
      <p>
        <strong>Data Flow:</strong> Customer pays on Chapa &rarr; Chapa webhook/callback verifies transaction with secret HMAC &rarr; order marked <code>payment_status = paid</code> &rarr; appears in Cashier Desk &rarr; Cashier clicks "Validate" &rarr; <code>cashier_approved_at</code> timestamp set &rarr; order immediately enters kitchen queue.
      </p>
    </div>

    <div class="avoid-break">
      <h3>5. Live Kitchen Display System (KDS) & Realtime Sync</h3>
      <p>
        <strong>What it does:</strong> Real-time ticket management board for kitchen staff showing live orders needing preparation. Kitchen chefs advance tickets through <code>pending</code> &rarr; <code>preparing</code> &rarr; <code>ready</code> &rarr; <code>served</code>.
      </p>
      <p>
        <strong>Files & Functions:</strong> <code>OrderController::queue</code>, <code>OrderController::updateStatus</code>, <code>useOrdersRealtime.ts</code>, <code>OrderQueuePage.tsx</code>.
      </p>
      <p>
        <strong>Data Flow:</strong> Kitchen screen loads filtered queue via <code>GET /api/orders/queue</code> &rarr; subscribes to Supabase Realtime channel &rarr; status transitions PATCHed to server &rarr; validated against <code>OrderPolicy</code> and state machine rules &rarr; database updated &rarr; realtime broadcast updates all connected screens.
      </p>
    </div>

    <div class="avoid-break">
      <h3>6. Delivery Logistics & Driver Dispatch Portal</h3>
      <p>
        <strong>What it does:</strong> Manages delivery orders from acceptance to customer doorstep. Allows managers to assign orders to active drivers, and enables drivers to update status to <code>out_for_delivery</code> and <code>delivered</code>.
      </p>
      <p>
        <strong>Files & Functions:</strong> <code>OrderController::deliveries</code>, <code>OrderController::assignDriver</code>, <code>DeliveriesPage.tsx</code>.
      </p>
    </div>

    <div class="avoid-break">
      <h3>7. Floor Table Management & Collision-Free Reservations</h3>
      <p>
        <strong>What it does:</strong> Visualizes dining room floor tables (capacity, status) and handles table reservations with automatic time-slot overlap detection.
      </p>
      <p>
        <strong>Files & Functions:</strong> <code>TableController.php</code>, <code>ReservationController.php</code>, <code>ReservationAvailabilityService.php</code>, <code>ReservationsPage.tsx</code>.
      </p>
      <p>
        <strong>Conflict Query:</strong> Checks if <code>starts_at &lt; new_ends_at AND ends_at &gt; new_starts_at</code> for the selected table before confirming reservation.
      </p>
    </div>

    <div class="avoid-break">
      <h3>8. Executive BI Analytics & RBAC Admin Matrix</h3>
      <p>
        <strong>What it does:</strong> Aggregates financial performance, Average Order Value (AOV), top selling dishes, floor utilization, and provides a full matrix editor to configure roles and permissions.
      </p>
      <p>
        <strong>Files & Functions:</strong> <code>AdminDashboardController.php</code>, <code>UserPermissionController.php</code>, <code>AdminDashboardPage.tsx</code>, <code>AdminRolesPage.tsx</code>.
      </p>
    </div>
  </section>

  <div class="page-break"></div>

  <!-- SECTION 5: DATA FLOW / REQUEST LIFECYCLE -->
  <section>
    <h2><span class="num">5</span> Data Flow & Request Lifecycle</h2>

    <h3>End-to-End Journey: Online Delivery Order via Chapa Payment</h3>
    <ol>
      <li><strong>Customer Action (UI):</strong> The customer adds items to cart on <code>MenuPage.tsx</code>, selects <em>Delivery</em>, fills in delivery address & phone number, chooses <em>Chapa</em>, and clicks <strong>"Place Order"</strong>.</li>
      <li><strong>Client API Request:</strong> <code>services/api.ts</code> sends a <code>POST /api/orders</code> request with the Bearer JWT token and order JSON payload.</li>
      <li><strong>Authentication & Gate Validation:</strong>
        <ul>
          <li><code>VerifySupabaseJwt</code> middleware checks the token, reads claims from 90-second cache, and resolves the authenticated <code>User</code> instance.</li>
          <li><code>StoreOrderRequest</code> validates data types, quantities, and phone formats.</li>
        </ul>
      </li>
      <li><strong>Database Transaction & Price Recalculation:</strong>
        <ul>
          <li>Within a <code>DB::transaction()</code> block, <code>OrderController</code> fetches active menu items from the database.</li>
          <li>Line totals and order grand total are computed on the server (preventing frontend price tampering).</li>
          <li>Inserts records into <code>orders</code> and <code>order_items</code>.</li>
        </ul>
      </li>
      <li><strong>Payment Gateway Initialization:</strong>
        <ul>
          <li><code>ChapaPaymentService</code> invokes Chapa API (<code>POST /v1/transaction/initialize</code>) passing amount in ETB, transaction reference, return URL, and callback URL.</li>
          <li>Chapa returns a hosted checkout URL (e.g. <code>https://checkout.chapa.co/...</code>).</li>
        </ul>
      </li>
      <li><strong>Customer Payment & Return:</strong>
        <ul>
          <li>Customer is redirected to Chapa and completes payment via Telebirr or Card.</li>
          <li>Customer is redirected back to <code>/orders?order_id=X</code>. Client invokes <code>GET /api/orders/{id}/payment/verify</code>.</li>
          <li>Simultaneously, Chapa dispatches an asynchronous webhook (<code>POST /api/payments/chapa/webhook</code>) with HMAC-SHA256 signature verification.</li>
          <li>Order payment status transitions to <code>paid</code>.</li>
        </ul>
      </li>
      <li><strong>Cashier Desk Validation:</strong>
        <ul>
          <li>Cashier views the paid order on <code>PaymentsPage.tsx</code> and clicks <strong>"Validate Payment"</strong>.</li>
          <li><code>CashierController::approve</code> sets <code>cashier_approved_at</code> timestamp.</li>
        </ul>
      </li>
      <li><strong>Kitchen KDS Realtime Event:</strong>
        <ul>
          <li>PostgreSQL triggers the <code>supabase_realtime</code> publication event.</li>
          <li>The kitchen screen receives the WebSocket broadcast, immediately re-fetching <code>GET /api/orders/queue</code>.</li>
          <li>Kitchen prepares the dish and marks it <code>ready</code>.</li>
        </ul>
      </li>
      <li><strong>Driver Dispatch & Delivery:</strong>
        <ul>
          <li>Manager assigns a driver via <code>PATCH /api/orders/{id}/driver</code>.</li>
          <li>Driver takes the food, clicks <strong>"Start Delivery"</strong> (<code>out_for_delivery</code>), and upon arrival clicks <strong>"Delivered"</strong>.</li>
          <li>Customer downloads the digital invoice receipt via <code>ReceiptPage.tsx</code>.</li>
        </ul>
      </li>
    </ol>

    <div class="callout callout-gold avoid-break">
      <div class="callout-title">Comprehensive Error & Validation Handling</div>
      <ul>
        <li><strong>401 Unauthorized:</strong> Intercepted by client API client; clears invalid session and redirects to <code>/login</code>.</li>
        <li><strong>403 Forbidden:</strong> Laravel Gate policies abort unauthorized role actions before database queries run.</li>
        <li><strong>422 Unprocessable Entity:</strong> Form request validation errors return field-specific messages shown as inline red callouts.</li>
        <li><strong>Network Drop / Realtime Error:</strong> Automatic polling fallback ensures no orders are lost during WebSocket disconnections.</li>
      </ul>
    </div>
  </section>

  <div class="page-break"></div>

  <!-- SECTION 6: DATABASE DESIGN -->
  <section>
    <h2><span class="num">6</span> Database Design & Schema</h2>

    <h3>Database Engine Selection</h3>
    <p>
      The production system uses <strong>Supabase PostgreSQL</strong> for relational integrity, JSONB support, Row-Level Security (RLS), and native Realtime replication. For local developer experience and automated PHPUnit test suites, <strong>SQLite</strong> is supported out of the box with zero external configuration.
    </p>

    <h3>Relational Schema Breakdown (ER Overview)</h3>
    <table>
      <thead>
        <tr>
          <th>Table Name</th>
          <th>Primary Key</th>
          <th>Foreign Keys & Relationships</th>
          <th>Key Columns & Constraints</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>users</code></td>
          <td><code>id (UUID)</code></td>
          <td>Matches Supabase <code>auth.users.id</code></td>
          <td><code>name</code>, <code>email (unique)</code>, <code>email_verified_at</code></td>
        </tr>
        <tr>
          <td><code>roles</code></td>
          <td><code>id (bigint)</code></td>
          <td>BelongsToMany <code>users</code>, <code>permissions</code></td>
          <td><code>name (unique)</code>: customer, kitchen, host, manager, admin, driver, cashier</td>
        </tr>
        <tr>
          <td><code>permissions</code></td>
          <td><code>id (bigint)</code></td>
          <td>BelongsToMany <code>roles</code></td>
          <td><code>name (unique)</code>: 11 catalogued permissions</td>
        </tr>
        <tr>
          <td><code>user_roles</code></td>
          <td><code>id</code></td>
          <td><code>user_id &rarr; users.id</code>, <code>role_id &rarr; roles.id</code></td>
          <td>Pivot table for User-to-Role assignments</td>
        </tr>
        <tr>
          <td><code>role_permissions</code></td>
          <td><code>id</code></td>
          <td><code>role_id &rarr; roles.id</code>, <code>permission_id &rarr; permissions.id</code></td>
          <td>Pivot table for Role-to-Permission assignments</td>
        </tr>
        <tr>
          <td><code>menu_categories</code></td>
          <td><code>id (bigint)</code></td>
          <td>HasMany <code>menu_items</code></td>
          <td><code>name</code>, <code>sort_order</code></td>
        </tr>
        <tr>
          <td><code>menu_items</code></td>
          <td><code>id (bigint)</code></td>
          <td><code>menu_category_id &rarr; menu_categories.id</code></td>
          <td><code>name</code>, <code>price (decimal:2)</code>, <code>image_url</code>, <code>is_available (bool)</code></td>
        </tr>
        <tr>
          <td><code>tables</code></td>
          <td><code>id (bigint)</code></td>
          <td>HasMany <code>orders</code>, <code>reservations</code></td>
          <td><code>name</code>, <code>capacity (int)</code>, <code>status (free, reserved, occupied)</code></td>
        </tr>
        <tr>
          <td><code>orders</code></td>
          <td><code>id (bigint)</code></td>
          <td><code>user_id</code>, <code>table_id</code>, <code>driver_id</code></td>
          <td><code>fulfillment_type</code>, <code>status</code>, <code>total</code>, <code>payment_status</code>, <code>cashier_approved_at</code></td>
        </tr>
        <tr>
          <td><code>order_items</code></td>
          <td><code>id (bigint)</code></td>
          <td><code>order_id &rarr; orders.id</code>, <code>menu_item_id &rarr; menu_items.id</code></td>
          <td><code>quantity</code>, <code>unit_price</code>, <code>line_total</code></td>
        </tr>
        <tr>
          <td><code>reservations</code></td>
          <td><code>id (bigint)</code></td>
          <td><code>user_id &rarr; users.id</code>, <code>table_id &rarr; tables.id</code></td>
          <td><code>party_size</code>, <code>starts_at</code>, <code>ends_at</code>, <code>status (confirmed, cancelled)</code></td>
        </tr>
        <tr>
          <td><code>menu_change_requests</code></td>
          <td><code>id (bigint)</code></td>
          <td><code>requester_id</code>, <code>reviewer_id</code>, <code>menu_item_id</code></td>
          <td><code>action (create/delete)</code>, <code>payload (json)</code>, <code>status (pending/approved/rejected)</code></td>
        </tr>
        <tr>
          <td><code>staff_notifications</code></td>
          <td><code>id (bigint)</code></td>
          <td><code>user_id &rarr; users.id</code>, <code>order_id &rarr; orders.id</code></td>
          <td><code>type</code>, <code>title</code>, <code>body</code>, <code>read_at (datetime)</code></td>
        </tr>
      </tbody>
    </table>

    <h3>High-Performance Indexes & Database Security Policies</h3>
    <ul>
      <li><strong>Composite Query Indexes:</strong>
        <ul>
          <li><code>orders(user_id, created_at)</code> &bull; Accelerates customer order history queries.</li>
          <li><code>orders(status, created_at)</code> &bull; Accelerates kitchen queue queries.</li>
          <li><code>orders(fulfillment_type, status)</code> &bull; Accelerates driver logistics board queries.</li>
          <li><code>menu_items(menu_category_id, is_available, sort_order)</code> &bull; Sub-millisecond menu queries.</li>
        </ul>
      </li>
      <li><strong>Row Level Security (RLS) & Realtime Publication:</strong>
        <ul>
          <li>RLS policies (e.g. <code>orders_select</code>) ensure users only access their own orders while staff members with <code>is_staff()</code> security definer function access operational orders.</li>
          <li><code>ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;</code> enables live change streams with full row replication identity (<code>REPLICA IDENTITY FULL</code>).</li>
        </ul>
      </li>
    </ul>
  </section>

  <div class="page-break"></div>

  <!-- SECTION 7: AUTHENTICATION & AUTHORIZATION -->
  <section>
    <h2><span class="num">7</span> Authentication & Authorization (RBAC)</h2>

    <h3>Asymmetric ES256 Token Verification Workflow</h3>
    <p>
      The application utilizes <strong>Supabase Auth</strong> as the OAuth2/OpenID identity provider. Supabase signs JWTs using an asymmetric <strong>ES256 (Elliptic Curve ECDSA P-256)</strong> private key. When the React client sends the token to Laravel:
    </p>
    <ol>
      <li><code>VerifySupabaseJwt</code> extracts the bearer token and checks an in-memory hash cache (<code>auth.jwt.&lt;sha256&gt;</code>) for <strong>90 seconds</strong> to avoid excessive network calls.</li>
      <li>If uncached, <code>SupabaseJwtService</code> fetches the public JWKS keys from Supabase (cached for 24 hours) and mathematically validates the cryptographic signature.</li>
      <li>If JWKS fails (e.g. strict corporate proxy), it gracefully falls back to direct introspection via the <code>/auth/v1/user</code> endpoint.</li>
      <li>The user's UUID is extracted from the <code>sub</code> claim and synced into the local <code>users</code> table via <code>User::firstOrCreate()</code>. Newly created users are automatically assigned the default <code>customer</code> role.</li>
    </ol>

    <h3>Role-Based Access Control (RBAC) Matrix</h3>
    <table>
      <thead>
        <tr>
          <th>Role</th>
          <th>Assigned Permissions</th>
          <th>Access Scope</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge badge-blue">Customer</span></td>
          <td><code>can_place_order</code>, <code>can_create_reservation</code></td>
          <td>Menu browsing, personal cart checkout, order history, table booking</td>
        </tr>
        <tr>
          <td><span class="badge badge-amber">Kitchen</span></td>
          <td><code>can_view_all_orders</code>, <code>can_update_order_status</code>, <code>can_propose_menu_changes</code></td>
          <td>Live kitchen queue board, order status progression, menu change proposals</td>
        </tr>
        <tr>
          <td><span class="badge badge-purple">Driver</span></td>
          <td><code>can_manage_deliveries</code>, <code>can_accept_delivery_orders</code>, <code>can_update_order_status</code></td>
          <td>Delivery orders board, driver assignment, out-for-delivery/delivered updates</td>
        </tr>
        <tr>
          <td><span class="badge badge-green">Cashier</span></td>
          <td><code>can_manage_payments</code></td>
          <td>Cashier Payment Desk: Chapa payment validation, cash collection recording</td>
        </tr>
        <tr>
          <td><span class="badge badge-blue">Host</span></td>
          <td><code>can_manage_tables</code>, <code>can_create_reservation</code></td>
          <td>Floor table layout management, table status updates, reservation scheduling</td>
        </tr>
        <tr>
          <td><span class="badge badge-amber">Manager</span></td>
          <td>All operational permissions + <code>can_manage_menu</code></td>
          <td>Menu change request review/approval, floor management, operational overview</td>
        </tr>
        <tr>
          <td><span class="badge badge-purple">Admin</span></td>
          <td>All 11 permissions + <code>can_manage_permissions</code></td>
          <td>Full system access, role-permission matrix editor, admin user provisioning</td>
        </tr>
      </tbody>
    </table>

    <div class="callout avoid-break">
      <div class="callout-title">Cached Permissions Engine (ApiCacheService)</div>
      Effective permissions are dynamically aggregated across all of a user's assigned roles and cached per user ID (<code>api.user.auth.{id}</code>). When an admin updates a role or alters permissions in <code>/admin/roles</code>, the cache is instantly invalidated via <code>forgetUserAuth()</code> or <code>forgetUsersWithRole()</code>.
    </div>
  </section>

  <!-- SECTION 8: THE AI COMPONENT -->
  <section class="avoid-break">
    <h2><span class="num">8</span> The AI Component & AI-Assisted Engineering</h2>

    <h3>AI Pair-Programming & Architectural Scaffolding</h3>
    <p>
      The architecture and codebase were designed and engineered utilizing cutting-edge <strong>Agentic AI Pair-Programming workflows</strong>. The AI assistant was utilized as a senior full-stack architect to:
    </p>
    <ul>
      <li><strong>Contract Specification:</strong> Generate the <code>@intern/shared</code> contract package to establish strict TypeScript type parity between the Laravel backend and React frontend.</li>
      <li><strong>Defensive Systems Design:</strong> Architect high-resilience failure models, such as dual JWKS/Auth-API token verification, 90-second token caching, and automated WebSocket-to-polling fallback.</li>
      <li><strong>Database Schema & Security Hardening:</strong> Author PostgreSQL migrations with composite query indexes and Row-Level Security (RLS) policies.</li>
      <li><strong>Domain Seeders:</strong> Generate realistic, culturally authentic Ethiopian culinary datasets (Doro Wat, Kitfo, Tibs, Shiro, Sambusa) with accurate ETB pricing and category taxonomies.</li>
    </ul>

    <h3>System AI Extensibility Roadmap (Future Capabilities)</h3>
    <p>The codebase is architected with clean service boundaries, enabling seamless integration of specialized AI/ML models:</p>
    <div class="cards-grid">
      <div class="card">
        <h4>1. AI Culinary Sommelier (LLM)</h4>
        <p>Conversational food assistant analyzing customer dietary restrictions, spice tolerance, and pairing Ethiopian dishes with traditional beverages.</p>
      </div>
      <div class="card">
        <h4>2. Predictive Kitchen Prep Time (ML)</h4>
        <p>Regression model trained on historical order volume, active kitchen queue size, and dish complexity to provide ultra-accurate delivery ETAs.</p>
      </div>
    </div>
  </section>

  <div class="page-break"></div>

  <!-- SECTION 9: NOTABLE DESIGN DECISIONS -->
  <section>
    <h2><span class="num">9</span> Notable Design Decisions & Defense Points</h2>

    <h3>Key Architectural & Design Decisions</h3>
    <ul>
      <li><strong>Keyset Cursor Pagination (<code>after_id</code>):</strong> Traditional <code>OFFSET</code> pagination requires the database to scan and discard thousands of rows. Our custom <code>KeysetPaginator</code> uses index seeks (<code>WHERE id &gt; 100 ORDER BY id LIMIT 51</code>), delivering consistent sub-5ms queries regardless of dataset size.</li>
      <li><strong>2-Phase Cashier Validation for Online Orders:</strong> Rather than allowing webhooks to blindly dispatch orders to the kitchen, online Chapa payments require cashier desk verification. This mirrors real-world restaurant cash-flow control and prevents food wastage from disputed transactions.</li>
      <li><strong>Centralized Multi-Tier Caching:</strong> <code>ApiCacheService</code> wraps static and semi-static data (menus, tables, permission catalogs, user claims) with targeted cache-invalidation hooks (e.g. <code>forgetMenu()</code> upon approval).</li>
      <li><strong>Zero-Overhead Shared Types:</strong> Monorepo structure links <code>@intern/shared</code> directly into the React build, guaranteeing complete frontend compile-time type safety.</li>
    </ul>

    <h3>Fragile / Edge Case Areas & How to Defend Them in Q&A</h3>
    <div class="cards-grid">
      <div class="card">
        <h4>1. Webhook vs. Return URL Race Condition</h4>
        <p><em>Defense:</em> Both Chapa callback and webhook route to idempotent verification logic. If the customer returns first, the verify API confirms payment; if the webhook arrives first, it sets status to <code>paid</code> safely without duplicate processing.</p>
      </div>
      <div class="card">
        <h4>2. WebSocket Realtime Failure</h4>
        <p><em>Defense:</em> The <code>useOrdersRealtime</code> hook actively monitors connection status. If the WebSocket drops or times out (after 2.5s), it automatically engages a background 5-second polling interval, ensuring kitchen tickets never stall.</p>
      </div>
      <div class="card">
        <h4>3. Database Portability (Postgres vs SQLite)</h4>
        <p><em>Defense:</em> Migrations utilize conditional driver checks (<code>DB::getDriverName() === 'pgsql'</code>). Production leverages PostgreSQL RLS and Realtime publications, while local testing runs seamlessly in lightweight SQLite.</p>
      </div>
      <div class="card">
        <h4>4. High-Volume RBAC Evaluation</h4>
        <p><em>Defense:</em> Effective permissions are evaluated once per user and cached in Laravel memory/Redis. Gates perform fast in-memory array lookups (<code>in_array</code>) instead of executing nested SQL joins on every request.</p>
      </div>
    </div>
  </section>

  <!-- SECTION 10: PRESENTATION READY SUMMARY -->
  <section class="avoid-break">
    <h2><span class="num">10</span> Presentation-Ready Summary & Defense Guide</h2>

    <h3>Speaker Notes (5–7 Key Bullet Points)</h3>
    <ul>
      <li><strong>Unified Ecosystem:</strong> "Our platform unites customer discovery, live kitchen displays, driver dispatching, cashier validation, and administrative analytics into a single synchronized system."</li>
      <li><strong>Modern Decoupled Stack:</strong> "Powered by React 19, Laravel 12, Supabase PostgreSQL, and Chapa fintech payments, giving us extreme responsiveness and rapid scalability."</li>
      <li><strong>Realtime Operational Sync:</strong> "PostgreSQL Realtime change streams instantly push new orders and status updates to kitchen and driver screens with an automatic 5-second polling fallback."</li>
      <li><strong>Strict Cash & Payment Security:</strong> "Features a dual-phase payment desk where online Chapa transactions must be validated by the cashier before kitchen preparation begins."</li>
      <li><strong>Granular Role-Based Access:</strong> "7 dedicated user roles and 11 permissions cached at the service layer guarantee watertight operational security."</li>
      <li><strong>High-Performance Engineering:</strong> "Utilizes keyset cursor pagination and multi-tier API caching to guarantee sub-millisecond response times under peak dining loads."</li>
    </ul>

    <h3>Anticipated Judge Questions & Winning Answers</h3>
    <div class="callout callout-emerald avoid-break">
      <p><strong>Q1: Why did you choose a decoupled SPA + API architecture instead of full-stack Inertia or Next.js?</strong></p>
      <p><em>Answer:</em> "Decoupling React 19 from Laravel 12 gives us total flexibility. The API serves as a clean, headless backend that can easily support mobile apps (iOS/Android) or third-party delivery integrations in the future without changing business logic."</p>
    </div>

    <div class="callout callout-emerald avoid-break">
      <p><strong>Q2: How do you prevent double-spending or unpaid food preparation with online payments?</strong></p>
      <p><em>Answer:</em> "We implement a 2-phase validation model. When Chapa confirms payment, the order is flagged as paid but remains invisible to the kitchen until the cashier validates the transaction at the Payment Desk, eliminating unauthorized food prep."</p>
    </div>

    <div class="callout callout-emerald avoid-break">
      <p><strong>Q3: How do you handle simultaneous table reservation requests for the same time slot?</strong></p>
      <p><em>Answer:</em> "Our <code>ReservationAvailabilityService</code> performs an atomic overlap query verifying that <code>starts_at &lt; new_ends_at AND ends_at &gt; new_starts_at</code>. Combined with table capacity checks, it eliminates double-booking conflicts."</p>
    </div>

    <div class="callout callout-emerald avoid-break">
      <p><strong>Q4: How does the system perform when hundreds of orders are created simultaneously?</strong></p>
      <p><em>Answer:</em> "We optimized the database with composite indexes on status, fulfillment, and user IDs, replaced heavy offset pagination with O(1) keyset cursor pagination, and cached JWT claims and permissions for 90 seconds to eliminate redundant database load."</p>
    </div>

    <h3>Slide Visual Concept (Sketch on a Slide)</h3>
    <p>
      Draw 4 horizontal pillars: <strong>[1. Customer / App]</strong> &rarr; <strong>[2. Cashier Desk & Chapa]</strong> &rarr; <strong>[3. Realtime Kitchen Queue]</strong> &rarr; <strong>[4. Driver Dispatch & Delivery]</strong>, with a central cloud badge in the middle representing <strong>[Laravel API & Supabase Postgres Hub]</strong> coordinating data flow between all four pillars.
    </p>
  </section>

</body>
</html>`;

async function generatePdf() {
  const outputPath = path.resolve(__dirname, '..', 'Restaurant_Management_System_Technical_Guide.pdf');
  const tempHtmlPath = path.resolve(__dirname, 'temp_guide.html');

  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');
  console.log('Temporary HTML created at:', tempHtmlPath);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '14mm',
      right: '14mm',
    },
  });

  await browser.close();
  fs.unlinkSync(tempHtmlPath);
  console.log('PDF successfully generated at:', outputPath);
}

generatePdf().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
