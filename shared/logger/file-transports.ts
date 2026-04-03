import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import winston from 'winston';

type FileTransportOptions = ConstructorParameters<typeof winston.transports.File>[0];

export interface SafeFileTransportSpec {
    filename: string;
    [key: string]: unknown;
}

function resolveWritableFilename(filename: string): string | null {
    const candidates = [
        path.isAbsolute(filename) ? filename : path.resolve(filename),
        path.join(os.tmpdir(), 'maysar-logs', path.basename(filename))
    ];

    for (const candidate of candidates) {
        try {
            fs.mkdirSync(path.dirname(candidate), { recursive: true });
            fs.accessSync(path.dirname(candidate), fs.constants.W_OK);
            return candidate;
        } catch {
            // Try the next candidate.
        }
    }

    return null;
}

export function createSafeFileTransports(specs: SafeFileTransportSpec[]): winston.transport[] {
    const transports: winston.transport[] = [];

    for (const spec of specs) {
        const filename = resolveWritableFilename(spec.filename);
        if (!filename) {
            continue;
        }

        try {
            transports.push(
                new winston.transports.File({
                    ...(spec as Partial<FileTransportOptions>),
                    filename
                } as FileTransportOptions)
            );
        } catch {
            // Keep booting even if a specific file transport cannot be created.
        }
    }

    return transports;
}
