BEGIN;

INSERT INTO ticket_listings (id, "sellerId", "eventId", "eventDateId", "eventSectionId", type, "sellTogether", "pricePerTicket", "deliveryMethod", status, version, "createdAt", "updatedAt") VALUES
('a0000000-0000-0000-0000-000000000048','f41d16ab-e18a-402f-9136-10efca6aae3d','evt_1774948764681_370c6b6a','edt_1774948764692_c66c72b9','sec_1774948764789_4764abce','Digital',false,'{"amount":15000000,"currency":"ARS"}',NULL,'Active',1,'2026-03-28 10:00:00','2026-03-28 10:00:00');

INSERT INTO ticket_units (id, "listingId", status, version, "createdAt", "updatedAt") VALUES
('c0000000-0000-0000-0000-000000000091','a0000000-0000-0000-0000-000000000048','available',1,'2026-03-28 10:00:00','2026-03-28 10:00:00'),
('c0000000-0000-0000-0000-000000000092','a0000000-0000-0000-0000-000000000048','available',1,'2026-03-28 10:00:00','2026-03-28 10:00:00');

COMMIT;
