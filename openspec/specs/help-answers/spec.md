# help-answers Specification

## Purpose
Lets customers ask support questions in their own words and get answers grounded in Bluegum's
help-centre articles, with the articles cited so they can check the answer.

## Requirements

### Requirement: Answers are grounded in help-centre articles

The assistant SHALL search the help centre before answering any question about Bluegum's
products, fees, policies or processes, and SHALL base its answer only on the articles found.

#### Scenario: Question covered by an article

- **WHEN** a customer asks "How long does an international transfer take?"
- **THEN** the assistant searches the help centre
- **AND** its answer states the timeframe given in the international transfers article

#### Scenario: Question phrased differently from the article

- **WHEN** a customer asks "I sent money overseas, when will it arrive?"
- **THEN** the international transfers article is among the top three search results

### Requirement: Answers show their sources

Every answer that used help-centre articles SHALL show the customer which articles it drew on,
each linking to the full article. The list of sources SHALL come from the articles the search
actually returned, not from text the model writes.

#### Scenario: Sources listed under an answer

- **WHEN** the assistant answers using the card replacement article
- **THEN** a source link titled with that article's title appears with the answer
- **AND** following the link opens the article

#### Scenario: Model cannot invent a source

- **WHEN** the model's reply mentions an article that the search did not return
- **THEN** that article does not appear in the answer's sources

### Requirement: Honest fallback when articles don't cover the question

When the search returns nothing relevant, the assistant SHALL say it doesn't have that
information and SHALL direct the customer to human support, instead of answering from general
knowledge.

#### Scenario: Question outside the help centre

- **WHEN** a customer asks "What is Bluegum's share price?"
- **THEN** the assistant says it can't help with that
- **AND** it gives the support phone number or contact page

### Requirement: Help-centre articles are readable on their own

Each help-centre article SHALL have its own page so that cited sources can be opened and read
without the assistant.

#### Scenario: Opening an article page

- **WHEN** a customer opens the URL of any help-centre article
- **THEN** the page shows that article's title and full content
