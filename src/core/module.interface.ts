export interface ServiceModule {
    name: string;
    initialize?: () => void | Promise<void>;
}
