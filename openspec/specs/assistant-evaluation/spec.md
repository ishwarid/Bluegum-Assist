# assistant-evaluation Specification

## Purpose
Measures whether the assistant finds the right articles, calls the right tools and stays within
its guardrails, so changes to prompts, models or search can be judged on evidence.

## Requirements

### Requirement: Retrieval is evaluated without a model

A retrieval evaluation SHALL run a fixed set of questions, each labelled with the article that
should answer it, through the help-centre search, and report hit@1, hit@3 and mean reciprocal
rank. It SHALL need no model and no network access.

#### Scenario: Retrieval report

- **WHEN** the retrieval evaluation runs
- **THEN** it prints hit@1, hit@3 and mean reciprocal rank
- **AND** lists every question whose expected article was not in the top three

### Requirement: Retrieval quality gates the build

The test suite SHALL fail when retrieval hit@3 drops below 90%.

#### Scenario: Search change makes retrieval worse

- **WHEN** a change lowers hit@3 to below 90%
- **THEN** the test suite fails

### Requirement: End-to-end assistant evaluation

An assistant evaluation SHALL run a fixed set of conversations through the real assistant and
check each one against its expected behaviour: which tools were called, whether an approval was
requested instead of an action, which articles were cited, and whether advice was declined.

#### Scenario: Assistant evaluation report

- **WHEN** the assistant evaluation runs with a model API key
- **THEN** it reports pass or fail per case with the reason for each failure
- **AND** writes the results to a file that can be compared between runs

#### Scenario: Pass rate below threshold

- **WHEN** fewer than 85% of cases pass
- **THEN** the evaluation exits with a non-zero status

### Requirement: Evaluation runs without a key

The assistant evaluation SHALL also run against the scripted demo model, so the harness itself
can be tested in CI without a key.

#### Scenario: No key available

- **WHEN** the assistant evaluation runs without a model API key
- **THEN** it uses the scripted demo model and says so in its report
