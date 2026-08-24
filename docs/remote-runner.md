# Remote ephemeral runner protocol

The open core defines a `RemoteRunner` interface for enterprise or hosted
execution. Requests identify commits, a trusted policy hash, a pinned image digest,
commands and network policy. Source code does not need to pass through the CLI
process; the remote service is expected to fetch an already authorized repository.

Responses bind results to a runner identity and image digest and may include an
external attestation. Authentication, tenancy, retention, SSO and regional data
controls belong to the remote service deployment rather than the local CLI.
