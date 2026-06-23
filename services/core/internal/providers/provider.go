package providers

import "fmt"

type Request struct {
	Kind      string
	Amount    int64
	AccountID string
}

type Result struct {
	Status string
	Trace  string
}

type Provider interface {
	Execute(Request) (Result, error)
}

type Registry struct {
	providers map[string]Provider
}

func NewRegistry() *Registry {
	return &Registry{providers: map[string]Provider{
		"mock": mockProvider{},
	}}
}

func (r *Registry) Execute(name string, req Request) (Result, error) {
	provider, ok := r.providers[name]
	if !ok {
		return Result{}, fmt.Errorf("provider not found")
	}
	return provider.Execute(req)
}

type mockProvider struct{}

func (mockProvider) Execute(req Request) (Result, error) {
	if req.Kind == "" {
		return Result{}, fmt.Errorf("kind is required")
	}
	return Result{Status: "accepted", Trace: "mock-provider"}, nil
}
