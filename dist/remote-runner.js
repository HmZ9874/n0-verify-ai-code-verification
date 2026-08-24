export class HttpRemoteRunner {
    endpoint;
    token;
    constructor(endpoint, token) {
        this.endpoint = endpoint;
        this.token = token;
    }
    async run(request) {
        const response = await fetch(new URL("runs", this.endpoint), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
            body: JSON.stringify(request),
        });
        if (!response.ok)
            throw new Error(`Remote runner returned HTTP ${response.status}`);
        return await response.json();
    }
}
//# sourceMappingURL=remote-runner.js.map