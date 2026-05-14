declare module 'multer' {
  import { RequestHandler } from 'express';

  interface StorageEngine {}
  interface Options {
    storage?: StorageEngine;
    limits?: { fileSize?: number; files?: number };
    fileFilter?: (req: any, file: any, cb: (err: Error | null, accept: boolean) => void) => void;
  }
  interface Multer {
    single(fieldname: string): RequestHandler;
    array(fieldname: string, maxCount?: number): RequestHandler;
    fields(fields: Array<{ name: string; maxCount?: number }>): RequestHandler;
    none(): RequestHandler;
    any(): RequestHandler;
  }
  interface DiskStorageOptions {
    destination?: string | ((req: any, file: any, cb: (err: Error | null, dest: string) => void) => void);
    filename?: (req: any, file: any, cb: (err: Error | null, filename: string) => void) => void;
  }
  function multer(options?: Options): Multer;
  namespace multer {
    function diskStorage(options: DiskStorageOptions): StorageEngine;
    function memoryStorage(): StorageEngine;
  }
  export = multer;
}
