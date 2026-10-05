# QR Event Generator Module (`app/Modules/QrEventGenerator`)

## 1. Overview & Purpose
The **QR Event Generator** module allows administrators to create and manage events, issue individualized QR code ticket passes for customers, and scan those QR codes at the physical store to verify customer identities and track real-time attendance / check-in.

---

## 2. Directory Structure

```text
app/Modules/QrEventGenerator/
├── Controllers/
│   ├── EventController.php            # CRUD for events & attendee roster
│   ├── EventAttendeeController.php    # Create/update attendees & download QR/ticket files
│   └── QrScannerController.php        # Camera/file QR scanning & check-in verification
├── Models/
│   ├── Event.php                      # Event model (1-to-many attendees)
│   └── EventAttendee.php              # Attendee/ticket pass model with auto ticket_code
├── Policies/
│   ├── EventPolicy.php                # Authorization policy for events
│   └── EventAttendeePolicy.php        # Authorization policy for attendees
├── Services/
│   └── QrCodeService.php              # High-res SVG & PNG QR code / badge rendering
├── database/
│   └── migrations/
│       └── 2026_10_05_000001_create_qr_event_generator_tables.php
├── routes.php                         # Route definitions registered under `admin/qr-events`
└── README.md                          # This documentation file
```

Frontend Inertia views:
```text
resources/js/Pages/Admin/Modules/QrEventGenerator/
├── Components/
│   └── TicketCardModal.tsx            # Modal for previewing, printing, and downloading passes
├── Events/
│   ├── Index.tsx                      # Event listing & attendance overview
│   ├── Create.tsx                     # Create event form
│   ├── Edit.tsx                       # Edit event form
│   └── Show.tsx                       # Event command center, attendee roster, and stats
└── Scanner/
    ├── Index.tsx                      # Live camera & image file QR scanner
    └── DirectCheckIn.tsx              # Landing page when scanning with external mobile camera
```

---

## 3. Database Schema

### `qr_events` Table
| Column | Type | Description |
|---|---|---|
| `id` | `bigint unsigned` | Primary key |
| `user_id` | `foreignId (users)` | Admin/manager creator |
| `name` | `string` | Event title |
| `description`| `text` (nullable) | Program details / instructions |
| `location` | `string` (nullable) | Venue / store address |
| `event_date` | `dateTime` (nullable) | Scheduled event date & time |
| `status` | `string(32)` | `active`, `draft`, `completed`, `cancelled` |
| `timestamps` | `timestamps` | Created and updated timestamps |

### `qr_event_attendees` Table
| Column | Type | Description |
|---|---|---|
| `id` | `bigint unsigned` | Primary key |
| `event_id` | `foreignId (qr_events)` | Foreign key cascading on delete |
| `ticket_code`| `string(64)` | Unique human-friendly ticket code (e.g. `TK-9B8A7C`) |
| `full_name` | `string` | Customer full name |
| `phone` | `string(32)` | Customer phone number |
| `email` | `string` (nullable) | Customer email |
| `notes` | `text` (nullable) | Staff or customer notes |
| `status` | `string(32)` | `pending` (waiting), `checked_in`, `cancelled` |
| `checked_in_at` | `dateTime` (nullable) | Check-in timestamp |
| `checked_in_by` | `foreignId (users)` | Staff member who verified the ticket |
| `timestamps` | `timestamps` | Created and updated timestamps |

---

## 4. Key Mechanisms

### Automatic Ticket Code Generation
When a new `EventAttendee` record is created, `EventAttendee::booted()` automatically generates a unique code prefixed with `TK-` (e.g. `TK-B8F91A20`).

### QR Payload & Verification
The QR code encodes a secure direct verification URL:
```
{APP_URL}/admin/qr-events/check-in/{ticket_code}
```
* **Store Web Scanner**: Can extract `{ticket_code}` automatically whether reading the full URL or a raw ticket code string.
* **External Mobile Phone Camera**: When scanned by an iPhone/Android camera, opening the link lands on `/admin/qr-events/check-in/{ticket_code}` for 1-tap confirmation.
* **Security & Privacy**: The QR code itself does not expose customer phone numbers in plaintext to the public; only authenticated store staff can view and verify details.

### Check-in Logic & Duplicate Prevention
* **First Scan**: Marks status as `checked_in`, writes current timestamp to `checked_in_at`, and sets `checked_in_by` to the authenticated user ID.
* **Subsequent Scans**: Returns HTTP `409 Conflict` with exact timestamp and staff name who previously checked them in to prevent ticket reuse.

### QR & Ticket Card Exports
* **Raw PNG QR Code**: Route `admin.qr_events.attendees.qr_image` (with `?download=1` parameter).
* **High-Res SVG Ticket Card**: Route `admin.qr_events.attendees.download_ticket` generates a complete branded pass badge with customer name, phone, event info, and embedded QR code.
* **Interactive Modal**: [TicketCardModal.tsx](file:///Users/itcvn/Pet-Projects/web-app-phap-tang/resources/js/Pages/Admin/Modules/QrEventGenerator/Components/TicketCardModal.tsx) allows instant in-browser printing or downloading PNG/SVG.

---

## 5. Routes Reference

| Method | URI | Route Name | Action |
|---|---|---|---|
| `GET` | `/admin/qr-events` | `admin.qr_events.index` | List events |
| `GET` | `/admin/qr-events/create` | `admin.qr_events.create` | Create event form |
| `POST` | `/admin/qr-events` | `admin.qr_events.store` | Store new event |
| `GET` | `/admin/qr-events/{event}` | `admin.qr_events.show` | Event detail & attendee roster |
| `GET` | `/admin/qr-events/{event}/edit` | `admin.qr_events.edit` | Edit event form |
| `PUT` | `/admin/qr-events/{event}` | `admin.qr_events.update` | Update event |
| `DELETE` | `/admin/qr-events/{event}` | `admin.qr_events.destroy` | Delete event |
| `POST` | `/admin/qr-events/{event}/attendees` | `admin.qr_events.attendees.store` | Issue new QR ticket to customer |
| `PUT` | `/admin/qr-events/attendees/{attendee}` | `admin.qr_events.attendees.update` | Update attendee / status |
| `DELETE` | `/admin/qr-events/attendees/{attendee}` | `admin.qr_events.attendees.destroy` | Remove attendee pass |
| `GET` | `/admin/qr-events/attendees/{attendee}/download-ticket` | `admin.qr_events.attendees.download_ticket` | Download SVG ticket badge |
| `GET` | `/admin/qr-events/attendees/{attendee}/qr-image` | `admin.qr_events.attendees.qr_image` | Stream / Download PNG QR code |
| `GET` | `/admin/qr-events/scanner/view` | `admin.qr_events.scanner.index` | In-app scanner interface |
| `POST` | `/admin/qr-events/scanner/lookup` | `admin.qr_events.scanner.lookup` | Lookup attendee details |
| `POST` | `/admin/qr-events/scanner/check-in` | `admin.qr_events.scanner.check_in` | Perform check-in validation |
| `GET` | `/admin/qr-events/check-in/{ticket_code}` | `admin.qr_events.scanner.direct_check_in` | External scan check-in view |

---

## 6. How to Run Tests

Run the dedicated test suite using Laravel Sail:
```bash
./vendor/bin/sail test tests/Feature/QrEventGeneratorTest.php
```

All 7 feature tests cover:
- Event creation and listing
- Attendee ticket creation and automatic ticket code generation
- SVG ticket and PNG QR downloads
- Scanner lookup by raw ticket code and URL
- Check-in validation and duplicate prevention (HTTP 409)
- Direct check-in page rendering
