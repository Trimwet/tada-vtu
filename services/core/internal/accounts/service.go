package accounts

import (
	"fmt"
	"sync"
)

type Account struct {
	ID      string
	Balance int64
}

type Service struct {
	mu       sync.Mutex
	accounts map[string]*Account
}

func NewService() *Service {
	return &Service{accounts: make(map[string]*Account)}
}

func (s *Service) CreateAccount(id string) (*Account, error) {
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	account := &Account{ID: id, Balance: 0}
	s.accounts[id] = account
	return account, nil
}

func (s *Service) Balance(id string) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	account, ok := s.accounts[id]
	if !ok {
		return 0, fmt.Errorf("account not found")
	}
	return account.Balance, nil
}
