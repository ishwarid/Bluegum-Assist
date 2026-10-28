# Spec Delta

## Purpose

The customer-facing chat window on the help centre: how conversations look and behave, including
streaming, progress, approvals, errors and accessibility.

## ADDED Requirements

### Requirement: Widget opens from any help-centre page

A launcher SHALL be available on every help-centre page. Opening it SHALL move keyboard focus to
the message box, and closing it SHALL return focus to the launcher.

#### Scenario: Opening with the keyboard

- **WHEN** a keyboard user activates the launcher
- **THEN** the chat opens and the message box has focus
- **AND** pressing Escape closes it and focus returns to the launcher

### Requirement: Answers stream and can be stopped

Assistant replies SHALL appear progressively as they are generated, and the customer SHALL be able
to stop a reply that is still being written.

#### Scenario: Stopping a reply

- **WHEN** the customer selects Stop while a reply is streaming
- **THEN** the reply stops growing
- **AND** the customer can send a new message

### Requirement: Tool use is visible

While the assistant searches the help centre or checks cards, the widget SHALL show what it is
doing in plain language.

#### Scenario: Searching

- **WHEN** the assistant is searching the help centre
- **THEN** the widget shows that it is searching, with the search terms

### Requirement: Approval requests are clear and explicit

An approval request SHALL name the action and the card, and offer separate controls to approve or
cancel. After the customer decides, the controls SHALL be replaced by the outcome.

#### Scenario: Approval shown

- **WHEN** the assistant asks to freeze a card
- **THEN** the widget shows "Freeze card" with the card's name and last four digits
- **AND** shows separate "Freeze card" and "Cancel" buttons

### Requirement: Failures are explained

When a request fails, the widget SHALL say what happened and offer a way forward: retry for
temporary errors, or the limit and reset time for usage limits.

#### Scenario: Network or model error

- **WHEN** the reply fails partway through
- **THEN** the widget shows an error message and a Try again button

### Requirement: Screen reader support

New assistant messages SHALL be announced to screen readers once complete, and every control SHALL
have an accessible name.

#### Scenario: Reply announced

- **WHEN** an assistant reply finishes
- **THEN** the reply text is in a live region that screen readers announce

### Requirement: Feedback on answers

Each completed assistant answer SHALL offer helpful and not-helpful controls, and SHALL confirm
when feedback is recorded.

#### Scenario: Marking an answer unhelpful

- **WHEN** the customer marks an answer as not helpful
- **THEN** the feedback is sent to the server with the message ID
- **AND** the widget confirms it was recorded

### Requirement: Demo mode is labelled

When no model API key is configured, the widget SHALL say it is using scripted demo replies.

#### Scenario: No API key

- **WHEN** the app runs without a model API key
- **THEN** the widget shows a notice that replies are scripted
