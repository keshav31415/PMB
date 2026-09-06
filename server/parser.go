package server

import (
	"errors"
	"strings"
)

const (
	CmdPub  = "PUB"
	CmdSub  = "SUB"
	CmdAck  = "ACK"
	CmdPing = "PING"
)

var (
	ErrEmptyLine      = errors.New("empty command")
	ErrUnknownCmd     = errors.New("unknown command")
	ErrInvalidArgs    = errors.New("invalid command arguments")
	ErrInvalidSubMode = errors.New("invalid subscription mode")
)

type Command struct {
	Type     string
	Topic    string
	ClientID string
	Mode     string
	MsgID    string
	Payload  string
}

// ParseLine parses a newline-stripped ASCII command line into a structured Command.
func ParseLine(line string) (*Command, error) {
	line = strings.TrimRight(line, "\r\n")
	if len(line) == 0 {
		return nil, ErrEmptyLine
	}

	parts := strings.SplitN(line, " ", 2)
	cmdType := strings.ToUpper(parts[0])

	switch cmdType {
	case CmdPing:
		return &Command{Type: CmdPing}, nil

	case CmdPub:
		if len(parts) < 2 {
			return nil, ErrInvalidArgs
		}
		// Split topic and payload (payload may contain spaces)
		subParts := strings.SplitN(parts[1], " ", 2)
		if len(subParts) < 2 || subParts[0] == "" || subParts[1] == "" {
			return nil, ErrInvalidArgs
		}
		return &Command{
			Type:    CmdPub,
			Topic:   subParts[0],
			Payload: subParts[1],
		}, nil

	case CmdSub:
		if len(parts) < 2 {
			return nil, ErrInvalidArgs
		}
		fields := strings.Fields(parts[1])
		if len(fields) != 3 {
			return nil, ErrInvalidArgs
		}
		mode := strings.ToUpper(fields[2])
		if mode != "AT_MOST_ONCE" && mode != "AT_LEAST_ONCE" {
			return nil, ErrInvalidSubMode
		}
		return &Command{
			Type:     CmdSub,
			Topic:    fields[0],
			ClientID: fields[1],
			Mode:     mode,
		}, nil

	case CmdAck:
		if len(parts) < 2 {
			return nil, ErrInvalidArgs
		}
		fields := strings.Fields(parts[1])
		if len(fields) != 3 {
			return nil, ErrInvalidArgs
		}
		return &Command{
			Type:     CmdAck,
			Topic:    fields[0],
			ClientID: fields[1],
			MsgID:    fields[2],
		}, nil

	default:
		return nil, ErrUnknownCmd
	}
}
