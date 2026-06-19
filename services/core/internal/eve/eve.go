// Package eve is the AI nervous system of TADAPAY.
//
// PRINCIPLE: Intelligence is centralized. Eve and the Risk Engine
// decide everything critical.
//
// Responsibilities (v1 stub — to be built):
//   - Route VTU requests to the best provider (speed, success rate, cost)
//   - Flag suspicious transactions for review
//   - Detect velocity abuse (too many purchases in short time)
//   - Smart retry logic when a provider fails
//
// Eve does NOT execute — it decides and routes.
// Actual execution happens in internal/providers.
//
// In v1, Eve is a stub that always routes to Inlomax.
// In v2, Eve uses real-time provider health data to make decisions.

package eve
