package merchant

import (
	"fmt"
	"sync"
)

type Merchant struct {
	ID   string
	Name string
}

type Service struct {
	mu        sync.Mutex
	merchants map[string]*Merchant
}

func NewService() *Service {
	return &Service{merchants: make(map[string]*Merchant)}
}

func (s *Service) CreateMerchant(id, name string) (*Merchant, error) {
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	merchant := &Merchant{ID: id, Name: name}
	s.merchants[id] = merchant
	return merchant, nil
}
