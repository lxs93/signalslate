-- Re-running an analysis used to keep the earlier runs, which only the latest
-- is ever shown for but which Trends and the Students page counted again.
-- Keep each ticket's newest analysis; themes and flags of the rest cascade.
DELETE FROM "analyses" a
USING "analyses" newer
WHERE newer."exit_ticket_id" = a."exit_ticket_id"
  AND (newer."created_at", newer."id") > (a."created_at", a."id");
