# Security

## Sensitive Documents

Customer datasheets and technical documents may contain confidential product information. The platform must treat uploaded documents and generated artifacts as sensitive by default.

## Access Control

The MVP does not implement real authentication yet, but the architecture assumes:

- organization scoping on all primary records
- user attribution on reviewer actions
- future role-based access controls

## Audit Logging

Meaningful actions must create audit events, including:

- document creation
- classification run creation
- worker status changes
- memo generation
- human review updates

## Encryption Assumptions

Production design assumptions:

- TLS in transit
- encrypted object storage at rest
- encrypted database storage at rest

The local MVP does not claim production-grade encryption, but the documentation and schema assume that requirement.

## Least Privilege

Services should use the minimum required permissions:

- API may read and write application records
- worker may access only run inputs and output locations
- frontend never directly handles privileged database access

## Artifact Retention

The system should eventually support configurable retention and deletion policies for:

- uploaded documents
- raw text artifacts
- generated memos
- logs

Until then, the MVP should keep artifact paths explicit so retention can be enforced later.
