# Pháp Tạng - Cash Flow & Financial Management System

A modular web application designed for multi-branch retail cash flow tracking, sales order processing, operational expense control, POS card payment reconciliation, and real-time treasury management. Built with Laravel 10, Inertia.js, React 19, and TailwindCSS.

---

## Table of Contents

- [System Architecture & Core Logic](#system-architecture--core-logic)
  - [1. Multi-Branch & Multi-Brand Structure](#1-multi-branch--multi-brand-structure)
  - [2. Sales Orders & Proportional Discount Allocation](#2-sales-orders--proportional-discount-allocation)
  - [3. Operational Expenses](#3-operational-expenses)
  - [4. POS Card Swipe & Reconciliation (Account F)](#4-pos-card-swipe--reconciliation-account-f)
  - [5. Treasury & Internal Transfers](#5-treasury--internal-transfers)
  - [6. Audit Logging & Versioning](#6-audit-logging--versioning)
  - [7. Telegram Bot Assistant](#7-telegram-bot-assistant)
  - [8. Google Sheets Synchronization](#8-google-sheets-synchronization)
- [Tech Stack](#tech-stack)
- [Module Structure](#module-structure)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Initial Setup](#initial-setup)
  - [Database Migration & Seeding](#database-migration--seeding)
  - [Default Test Credentials](#default-test-credentials)
- [Running Automated Tests](#running-automated-tests)
- [Environment Variables](#environment-variables)

---

## System Architecture & Core Logic

### 1. Multi-Branch & Multi-Brand Structure

The system models cash flows across distinct physical locations and brand divisions:

- **Branches**:
  - `A`: 240 Xã Đàn, Thanh Xuân, Hà Nội
  - `B`: 764 Nguyễn Chí Thanh, Phường Minh Phụng, TP Hồ Chí Minh
  - `C`: 11A Tôn Đức Thắng, Phường Sài Gòn, Quận 1, TP Hồ Chí Minh
- **Brands / Product Lines**:
  - `a`: Pháp Tạng
  - `b`: MGEMS
  - `c`: MJADE
- **Customer Acquisition Sources**:
  - `A`: TikTok, `B`: Facebook, `C`: Walk-in (Vãng lai), `D`: Dharma Group (Đạo tràng), `E`: Returning (Cũ), `F`: Other (Khác).

---

### 2. Sales Orders & Proportional Discount Allocation

- **Order Identification**: Automated daily sequenced code `DH-YYYYMMDD-XXXX`.
- **Discount Tiers**:
  - `A`: 3%, `B`: 5%, `C`: 10%, `D`: 15%, `E`: 0% (No discount).
- **Proportional Discount Allocation Engine** (`OrderCalculationService`):
  - Order-level discounts are calculated on total gross and allocated proportionally to each individual line item (`allocated_discount = gross_amount * (discount_amount / total_gross)`).
  - Any rounding discrepancies are adjusted on the final line item, ensuring exact net revenue reconciliation across disparate brands.
- **Payment Method Routing**:
  - **Cash**: Automatically linked to the originating branch's cash fund (`CASH_A`, `CASH_B`, or `CASH_C`).
  - **Bank Transfer**: Explicitly linked to a designated bank account (`BANK_A` through `BANK_G`, excluding `GATEWAY_F`).
  - **Card Swipe (POS)**: Routed to clearing account `GATEWAY_F` with initial status `pending_settlement`.

---

### 3. Operational Expenses

- **Expense Identification**: Automated sequenced code `CT-YYYYMMDD-XXXX`.
- **Payment Source**:
  - **Cash**: Directly drawn from the branch's cash fund.
  - **Bank Transfer**: Directly drawn from the selected active bank account.
- **Strict Business Rule**: Account `F` (`GATEWAY_F` - Card POS Gateway) is strictly **forbidden** for expense payments as it is a clearing receivable account.

---

### 4. POS Card Swipe & Reconciliation (Account F)

Card transactions undergo a two-phase clearing lifecycle managed by `CardSettlementService`:

1. **Transaction Phase**:
   - Order payment is recorded with method `card_swipe` to `GATEWAY_F` and set to `pending_settlement`.
2. **Settlement & Reconciliation Phase**:
   - Managers match the bank settlement statement against pending swipes via `/admin/cashflow/card-settlements`.
   - Enforces the strict reconciliation formula:
     $$\text{Actual Received Amount} + \text{Bank Fee Amount} == \text{Gross Swipe Amount}$$
   - Validates that the settlement date is on or after the swipe date.
   - Credits the net funds into the actual receiving bank account (`BANK_A` to `BANK_G`).

---

### 5. Treasury & Internal Transfers

- **Transfer Code**: `CKNB-YYYYMMDD-XXXX`.
- **Internal Transfers** (`InternalTransferController` & `TreasuryService`):
  - Enables authorized fund transfers between cash funds and bank accounts.
  - Direct transfers to/from clearing account `GATEWAY_F` are restricted.
- **Dynamic Balance Calculation**:
  - Accounts maintain an `effective_date` baseline via `InitialBalance`.
  - Account balance is dynamically aggregated:
    $$\text{Balance} = \text{Initial Balance} + \sum \text{Direct In} + \sum \text{Settled Cards} + \sum \text{Transfers In} - \sum \text{Expenses} - \sum \text{Transfers Out}$$

---

### 6. Audit Logging & Versioning

- **Immutable Modification Trail** (`TransactionAudit` & `AuditService`):
  - Any update or cancellation on an order or expense requires a mandatory written reason.
  - Increments record version (`version + 1`).
  - Stores complete JSON snapshots of `before_payload` and `after_payload`, recording user ID, IP address, and Telegram user ID (if triggered via bot).
- **Permissions**:
  - Role `manager`: Can update orders, cancel orders, process reconciliations, create internal transfers, and inspect audit histories.
  - Role `seller`: Permitted to record new orders and expenses, and view permitted entries.

---

### 7. Telegram Bot Assistant

- **Webhook Endpoint**: `POST /api/telegram/webhook` (CSRF excluded).
- **Service**: `TelegramBotService`.
- **Features**:
  - Role-based authorization matching `telegram_user_id` against `TelegramAuthorizedUser`.
  - Conversational interactive step-by-step wizard with inline buttons.
  - Commands: `/start` (Main Menu), `/huy` (Discard current draft).
  - Streamlined workflows for order entry, line items addition, discount selection, expense entry, and branch switching.

---

### 8. Google Sheets Synchronization

- **Service**: `GoogleSheetsSyncService`.
- Triggers non-blocking HTTP webhooks on order creation, item addition, payment capture, expense logging, and internal transfers.
- **Target Sheets**:
  - `Don_Hang`: Master sales order details.
  - `Chi_Tiet_Don`: Line item breakdown per brand with allocated discounts.
  - `Thanh_Toan`: Payment records with card settlement tracking.
  - `Data_Chi`: Operational expense records.
  - `Chuyen_Tien`: Internal treasury movements.

---

## Tech Stack

- **Backend**: Laravel 10 (PHP 8.1+ / 8.3)
- **Frontend**: React 19, TypeScript, Inertia.js 1.3
- **Styling**: TailwindCSS 3.4, Headless UI 2.2, Heroicons
- **Database**: MySQL 8.0
- **Containerization**: Laravel Sail (Docker Compose)
- **Testing**: PHPUnit 10

---

## Module Structure

The project adopts a modular architecture under `app/Modules/CashFlow`:

```
app/Modules/CashFlow/
├── Controllers/
│   ├── CardSettlementController.php  # POS Card reconciliation
│   ├── DashboardController.php       # Financial analytics & reports
│   ├── ExpenseController.php         # Operational expense CRUD & audit
│   ├── InternalTransferController.php# Treasury fund transfers
│   ├── OrderController.php           # Order management & discount logic
│   └── TelegramWebhookController.php # Telegram webhook receiver
├── Models/
│   ├── Branch.php                    # Physical retail branches
│   ├── Brand.php                     # Product line brands
│   ├── CustomerSource.php            # Acquisition channels
│   ├── Expense.php                   # Expense records
│   ├── FinancialAccount.php          # Cash funds, bank accounts & POS gateway
│   ├── InitialBalance.php            # Baseline financial balances
│   ├── InternalTransfer.php          # Internal account transfers
│   ├── Order.php                     # Sales orders
│   ├── OrderItem.php                 # Order line items
│   ├── OrderPayment.php              # Payment records & settlement tracking
│   ├── TelegramAuthorizedUser.php    # Whitelisted Telegram bot users
│   ├── TelegramSession.php           # Active conversational wizard sessions
│   └── TransactionAudit.php          # Versioned mutation snapshots
├── Services/
│   ├── AuditService.php              # Mutation auditing
│   ├── CardSettlementService.php     # Card reconciliation workflow
│   ├── ExpenseService.php            # Expense lifecycle & business checks
│   ├── GoogleSheetsSyncService.php   # Google Apps Script webhook integration
│   ├── OrderCalculationService.php   # Proportional discount calculations
│   ├── OrderService.php              # Order processing & validation
│   ├── TelegramBotService.php        # Chatbot dialogue state machine
│   └── TreasuryService.php           # Dynamic balance & transfer handling
├── database/
│   ├── migrations/                   # CashFlow module migrations
│   └── seeders/                      # CashFlowSeeder (branches, accounts, users)
└── routes.php                        # CashFlow module route definitions
```

---

## Development Setup

### Prerequisites

- **Docker** & **Docker Compose**
- **Node.js 22** (managed via `nvm`)
- **PHP 8.1+** (if running commands directly outside container)

### Initial Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Start the backend containers and frontend dev server:
   ```bash
   ./start
   ```
   *Alternatively, run with Sail manually:*
   ```bash
   ./vendor/bin/sail up -d
   npm install
   npm run dev
   ```

3. Configure alias for Sail (optional):
   ```bash
   alias sail='./vendor/bin/sail'
   ```

### Database Migration & Seeding

Run fresh migrations along with system seeders:

```bash
sail artisan migrate:fresh --seed
# Or outside container if PHP & DB are installed locally:
php artisan migrate:fresh --seed
```

### Default Test Credentials

The database seeder provisions two operational user accounts:

| Role | Email | Password | Description |
|---|---|---|---|
| **Manager** | `siteowner@local.dev` | `-^])$Eqy_r>1>dMi` | Full administrative access, audit trail, order cancellation, card reconciliation |
| **Seller** | `seller@phaptang.local` | `Seller@123456` | Sales order entry, expense entry, dashboard metrics view |

---

## Running Automated Tests

Run the full PHPUnit test suite inside Sail or locally:

```bash
# Using Sail:
sail test

# Or directly using PHPUnit:
./vendor/bin/phpunit
```

Test coverage includes:
- Proportional discount distribution across multi-brand order items.
- Cash routing to branch cash funds.
- Expense validations and restriction of Account F (`GATEWAY_F`).
- POS card swipe pending lifecycle and strict reconciliation formulas.
- Internal treasury transfer balancing.
- Manager role policies and immutable audit snapshot logging.
- Google Sheets synchronization triggers.

---

## Environment Variables

Key parameters in `.env`:

```dotenv
APP_NAME="Pháp Tạng Cash Flow"
APP_ENV=local
APP_URL=http://pt-web-app.localhost

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=root
DB_PASSWORD=

# Telegram Bot Integration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Google Sheets Webhook Integration
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/your_script_id/exec
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
```
