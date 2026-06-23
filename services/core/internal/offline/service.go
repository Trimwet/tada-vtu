package offline

import (
	"fmt"
	"sync"
)

type Event struct {
	ID     string
	Kind   string
	Status string
}

type Service struct {
	mu     sync.Mutex
	events map[string]*Event
}

func NewService() *Service {
	return &Service{events: make(map[string]*Event)}
}

func (s *Service) CreateEvent(id, kind string) (*Event, error) {
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if kind == "" {
		return nil, fmt.Errorf("kind is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	event := &Event{ID: id, Kind: kind, Status: "queued"}
	s.events[id] = event
	return event, nil
}
