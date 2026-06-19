// Package providers contains adapters for external VTU and payment providers.
//
// PRINCIPLE: Interfaces are dumb. Providers execute — they don't decide.
// The decision of which provider to use comes from Eve (internal/eve).
//
// Current providers:
//   - inlomax.go  — airtime, data, cable, electricity (live)
//   - flutterwave.go — payment initiation and verification (live, via Next.js today)
//
// Future providers:
//   - paystack.go
//   - vtpass.go (backup VTU)
//   - monnify.go (bank transfers)
//
// Each provider implements a common interface so Eve can swap them
// without the rest of the system caring.

package providers
