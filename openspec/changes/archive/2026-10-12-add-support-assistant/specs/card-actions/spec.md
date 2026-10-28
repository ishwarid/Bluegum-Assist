# Spec Delta

## Purpose

Lets the signed-in customer check their cards and freeze or unfreeze one through the assistant,
while making sure nothing changes on the account without the customer's explicit approval.

## ADDED Requirements

### Requirement: Customer can check their card status

The assistant SHALL be able to report the status of the signed-in customer's own cards: name,
last four digits, and whether each card is active or frozen.

#### Scenario: Asking about cards

- **WHEN** a customer asks "Is my debit card active?"
- **THEN** the assistant reports the debit card's last four digits and its current status

### Requirement: Cards are scoped to the signed-in customer

Card lookups and changes SHALL only ever apply to cards belonging to the signed-in customer. The
customer's identity SHALL come from their session, never from anything the model or the message
text supplies.

#### Scenario: Request for someone else's card

- **WHEN** a freeze is attempted for a card ID that does not belong to the signed-in customer
- **THEN** no card is changed
- **AND** the assistant reports that it couldn't find that card

### Requirement: Freezing or unfreezing needs explicit approval

The assistant SHALL NOT freeze or unfreeze a card until the customer approves that exact action
for that exact card. The approval SHALL be verified on the server so that a modified client
cannot fake it.

#### Scenario: Customer approves a freeze

- **WHEN** a customer says "I lost my credit card, freeze it"
- **THEN** the assistant shows an approval request naming the card and its last four digits
- **AND** the card stays active until the customer approves
- **AND** after approval the card is frozen and the assistant confirms it

#### Scenario: Customer cancels a freeze

- **WHEN** the customer declines the approval request
- **THEN** the card stays active
- **AND** the assistant acknowledges that nothing was changed

#### Scenario: Forged approval

- **WHEN** a request arrives with an approval that the server did not issue
- **THEN** the card is not changed

### Requirement: Assistant only claims actions that succeeded

The assistant SHALL only tell the customer a card was frozen or unfrozen when the change actually
succeeded.

#### Scenario: Freeze fails

- **WHEN** the freeze could not be completed
- **THEN** the assistant tells the customer it didn't work and how to reach support
