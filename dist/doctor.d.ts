export interface DoctorCheck {
    name: string;
    status: "PASS" | "WARN" | "FAIL";
    detail: string;
}
export declare function runDoctor(cwd: string): Promise<DoctorCheck[]>;
