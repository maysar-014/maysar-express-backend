/**
 * In-process registry of ticket IDs that have been closed.
 * Used as a read-side override when the DB write for CLOSED status
 * doesn't reflect immediately in subsequent reads.
 */
const globalForRegistry = globalThis as unknown as {
    _closedTickets?: Set<string>;
};

if (!globalForRegistry._closedTickets) {
    globalForRegistry._closedTickets = new Set<string>();
}

export const closedTicketsRegistry = globalForRegistry._closedTickets;

export function markTicketClosed(ticketId: string): void {
    closedTicketsRegistry.add(ticketId);
}

export function isTicketMarkedClosed(ticketId: string): boolean {
    return closedTicketsRegistry.has(ticketId);
}
