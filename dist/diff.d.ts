export interface DiffLine {
    path: string;
    line: number;
    kind: "added" | "removed";
    content: string;
}
export declare function parseDiffLines(patch: string): DiffLine[];
