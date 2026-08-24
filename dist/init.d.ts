export interface InitializeOptions {
    cwd: string;
    force?: boolean | undefined;
    language?: string | undefined;
    ci?: string | undefined;
}
export declare function initializeProject(options: InitializeOptions): Promise<string[]>;
