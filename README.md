# ATM Fraud Detection System

ATM Fraud Detection System is a full-stack course project that combines:

- a static HTML/CSS/JavaScript frontend
- a FastAPI backend
- an SQLite database
- a rule-based fraud engine
- a small compiler module built with Flex and Bison

The project simulates how ATM withdrawal activity can be analyzed for suspicious behavior such as repeated withdrawals, high cash-out amount, rapid timing, and changing locations. Based on the calculated risk, the system keeps the account active, temporarily blocks it for 24 hours, or permanently blocks it.

---

## 1. Project Goal

The main goal of this project is to detect suspicious ATM withdrawal patterns and automate a basic fraud response workflow.

The system supports:

- user registration
- OTP-based account verification
- login and profile access
- transaction submission for fraud analysis
- fraud result visualization
- analytics/report-style visualization
- account status management
- temporary block and permanent block logic
- DSL-based fraud analysis using lexer and parser concepts

This project is also a compiler design project because the same fraud rules are represented in a custom DSL pipeline using Flex and Bison.

---

## 2. High-Level Architecture

The project has two major runtime parts and one academic/compiler part.

### Runtime application

1. Frontend
   The frontend is a browser-based UI built with plain HTML, CSS, and JavaScript.

2. Backend
   The backend is a FastAPI application that exposes API endpoints for authentication, profile access, and fraud analysis.

3. Database
   SQLite stores users, accounts, transactions, and fraud reports.

### Compiler/DSL module

4. Flex + Bison
   A mini transaction language is tokenized by Flex and parsed by Bison. The parser then applies fraud scoring rules and prints the fraud result.

---

## 3. End-to-End User Flow

The normal user flow is:

1. User opens `frontend/index.html`
2. User registers from `register.html`
3. Backend sends OTP by email
4. User verifies OTP on `verify.html`
5. User logs in on `login.html`
6. Login data is stored in browser `localStorage`
7. User opens `dashboard.html` for overview
8. User goes to `analyzer.html`
9. User submits one or more withdrawals
10. Frontend sends data to `/analyze`
11. Backend validates the logged-in user and account
12. Backend applies fraud detection logic
13. Backend saves transactions and fraud report
14. Backend returns result JSON
15. Frontend stores it in `localStorage.fraudResult`
16. `result.html` shows decision, score, evidence, timer if temp-blocked
17. `analytics.html` shows charts and summary

---

## 4. Project Structure

```text
atm-fraud-detection-system/
├── README.md
├── atm.db
├── backend/
│   ├── main.py
│   ├── routes.py
│   ├── fraud_service.py
│   ├── atm.db
│   ├── input/
│   │   └── transaction.dsl
│   ├── compiler/
│   │   ├── lexer.l
│   │   ├── parser.y
│   │   ├── fraud_logic.c
│   │   ├── runner.c
│   │   ├── Makefile
│   │   ├── lex.yy.c
│   │   ├── parser.tab.c
│   │   └── parser.tab.h
│   └── database/
│       ├── atm.db
│       ├── db.py
│       └── schema.sql
└── frontend/
    ├── index.html
    ├── login.html
    ├── register.html
    ├── verify.html
    ├── dashboard.html
    ├── analyzer.html
    ├── result.html
    ├── analytics.html
    ├── profile.html
    ├── css/
    │   ├── style.css
    │   └── landing.css
    ├── js/
    │   ├── auth.js
    │   ├── app.js
    │   ├── result.js
    │   ├── analytics.js
    │   ├── dashboard.js
    │   ├── profile.js
    │   └── shell.js
    └── assets/
        └── hero-dashboard.jpg
```

---

## 5. Frontend Overview

The frontend is written with plain HTML, CSS, and JavaScript. No React, Vue, or frontend framework is used.

### Main pages

- `index.html`
  Landing page and entry point

- `register.html`
  New user registration form

- `verify.html`
  OTP verification page

- `login.html`
  User login page

- `dashboard.html`
  Overview screen with charts, KPIs, and latest case summary

- `analyzer.html`
  Main input form where user submits transactions for fraud analysis

- `result.html`
  Displays risk score, action, evidence, countdown for temp block, and transaction list

- `analytics.html`
  Shows visual report with bar, pie, and trend charts

- `profile.html`
  Shows the logged-in user profile

### Shared frontend logic

- `frontend/js/shell.js`
  Renders the shared top navigation/header

- `frontend/css/style.css`
  Shared design system and page styling for the application UI

### Frontend authentication behavior

The frontend stores these values in `localStorage`:

- `loggedInUsername`
- `loggedInAccount`
- `loggedInEmail`
- `fraudResult`

This allows the app to keep a simple session-like state on the browser side.

---

## 6. Backend Overview

The backend is built with FastAPI.

### Main backend files

- `backend/main.py`
  Creates the FastAPI app, enables CORS, and includes the API routes

- `backend/routes.py`
  Contains all API endpoints

- `backend/fraud_service.py`
  Contains the core fraud analysis logic, transaction saving logic, and account block logic

- `backend/database/db.py`
  Opens SQLite connection to `backend/database/atm.db`

### FastAPI startup behavior

`main.py`:

- creates `FastAPI(title="ATM Fraud Detection API")`
- enables CORS for all origins
- attaches the router from `routes.py`
- exposes `/` health-style route

---

## 7. API Endpoints

### `POST /register`

Used to create a user account.

Input:

- `username`
- `account_number`
- `email`
- `password`
- `confirm_password`

Behavior:

- validates required fields
- checks password confirmation
- hashes password using `bcrypt`
- generates a 6-digit OTP
- sends OTP by email
- saves the user in `users`

Output:

- success message or error

### `POST /verify`

Used to verify OTP.

Input:

- `otp`

Behavior:

- finds user by OTP
- sets `is_verified = 1`

### `POST /login`

Used to authenticate a user.

Input:

- `username`
- `password`

Behavior:

- checks if user exists
- checks if account is verified
- compares password hash with `bcrypt.checkpw`
- returns username, account number, and email

### `POST /profile`

Used to fetch user profile.

Input:

- `username`

Behavior:

- returns `username`, `account_number`, `email`

### `POST /analyze`

This is the main fraud analysis endpoint.

Input:

- `username`
- `account`
- `transactions`
- `time_interval`

Behavior:

- ensures user is logged in
- fetches user account from DB
- checks that account is verified
- confirms requested account matches registered account
- forwards the request to `analyze_transaction()` in `fraud_service.py`

---

## 8. Database Design

The main runtime database is:

`backend/database/atm.db`

Schema is defined in:

`backend/database/schema.sql`

### `users`

Stores application users.

Fields:

- `id`
- `username`
- `card_number`
- `email`
- `password`
- `is_verified`
- `otp`

Purpose:

- registration
- login
- OTP verification
- account ownership validation

### `accounts`

Stores account status for fraud response.

Fields:

- `id`
- `account_number`
- `status`
- `block_until`

Possible statuses:

- `ACTIVE`
- `TEMP_BLOCK`
- `BLOCKED`

### `transactions`

Stores ATM withdrawals submitted for analysis.

Fields:

- `id`
- `account`
- `amount`
- `location`
- `timestamp`

Purpose:

- maintain withdrawal history
- use recent 24-hour transactions in scoring
- support charts and result pages

### `fraud_reports`

Stores final fraud decisions.

Fields:

- `id`
- `account`
- `risk_score`
- `risk_level`
- `action`
- `created_at`

Purpose:

- preserve latest analysis outcome
- return previous decision for already blocked accounts

---

## 9. Core Fraud Logic

The real backend fraud decision engine is implemented in:

`backend/fraud_service.py`

### Main workflow inside `analyze_transaction(data)`

1. Read account, submitted transactions, and time interval
2. Ensure account exists in `accounts`
3. Check current account status
4. If already permanently blocked:
   Return previous high-risk state immediately
5. If already temporarily blocked:
   Return temp block state with `block_until`
6. Load recent transactions from the last 24 hours
7. Combine new transactions with recent transactions
8. Calculate risk score
9. Save new transactions
10. Decide action
11. Save fraud report
12. Return structured JSON to frontend

### Risk inputs used by backend

The backend considers:

- withdrawal count
- total withdrawal amount
- multiple locations
- time interval between withdrawals
- geographic distance from previous transaction
- impossible travel behavior
- combo rules

### Actual scoring rules

#### 1. Frequency

- if withdrawal count is `2` -> `+2`
- if withdrawal count is `3 or more` -> `+5`

#### 2. Amount

- if total amount is above `50,000` -> `+2`
- if total amount is above `100,000` -> `+4`

#### 3. Location

- if there is more than one location in current submission -> `+3`

#### 4. Time behavior

- if `60 < time_interval <= 120` -> `+2`
- if `time_interval <= 60` -> `+3`

#### 5. Distance-based fraud

The system checks the last saved transaction for the account.

If:

- distance between previous and current location is greater than `100 km`
- and time gap is less than `10 minutes`

Then:

- add `+5`

This is an impossible movement rule.

#### 6. Combo rules

- if withdrawal count is `3 or more` and total amount is above `100,000` -> `+5`
- if location changes and time interval is `<= 5` -> `+5`

### Final decision mapping

- `risk_score <= 4`
  - `risk_level = LOW`
  - `action = SAFE`
  - `status = ACTIVE`

- `5 <= risk_score <= 10`
  - `risk_level = MEDIUM`
  - `action = TEMPORARY BLOCK`
  - `status = TEMP_BLOCK`
  - account blocked for 24 hours

- `risk_score > 10`
  - `risk_level = HIGH`
  - `action = PERMANENT BLOCK`
  - `status = BLOCKED`

### Temporary block logic

`temp_block_card(account)`:

- sets account status to `TEMP_BLOCK`
- sets `block_until = now + 24 hours`

`check_card_status(account)`:

- if temp block is still active, return `TEMP_BLOCK`
- if block time already passed, automatically unblock the account

### Permanent block logic

`permanent_block(account)`:

- sets `status = BLOCKED`
- clears `block_until`

Blocked accounts remain blocked unless changed manually.

---

## 10. Frontend Fraud Result Rendering

After analysis:

- backend returns fraud JSON
- frontend saves it in `localStorage.fraudResult`

### `result.html`

`frontend/js/result.js` uses:

- `risk_score`
- `risk_level`
- `status`
- `action`
- `block_until`
- `transactions`

It renders:

- main verdict
- risk gauge
- metrics
- evidence list
- transaction table
- live countdown when the account is temporarily blocked

### `analytics.html`

`frontend/js/analytics.js` uses the same saved result to render:

- KPI cards
- bar chart
- pie chart
- trend chart
- action summary

---

## 11. Compiler Design Part

This is the special academic part of the project.

Folder:

`backend/compiler/`

This module demonstrates how fraud rules can be represented using a small DSL and processed with a lexer and parser.

### Files in compiler module

- `lexer.l`
  Flex lexer specification

- `parser.y`
  Bison parser specification

- `fraud_logic.c`
  Additional C implementation of fraud evaluation logic

- `runner.c`
  Opens DSL file and starts parsing

- `Makefile`
  Builds lexer and parser output

- `lex.yy.c`
  Generated C source from Flex

- `parser.tab.c`
  Generated parser implementation from Bison

- `parser.tab.h`
  Generated token header from Bison

### Input file

`backend/input/transaction.dsl`

This file contains the transaction script written in the mini DSL.

---

## 12. DSL Design

The DSL is a very small domain-specific language for describing a transaction analysis case.

### Supported keywords

- `ACCOUNT`
- `LOCATION`
- `WITHDRAW`
- `TIME_INTERVAL`
- `ANALYZE`

### Example style

```text
ACCOUNT 75
LOCATION 23.8103,90.4125
WITHDRAW 8000
LOCATION 22.3569,91.7832
WITHDRAW 5000
TIME_INTERVAL 4
ANALYZE
```

Meaning:

- set account number
- record locations
- add withdrawal amounts
- set time interval
- trigger fraud analysis

---

## 13. Lexer Logic with Flex

File:

`backend/compiler/lexer.l`

The lexer reads raw text from the DSL file and converts it into tokens that Bison can understand.

### Token rules

- `"ACCOUNT"` -> returns `ACCOUNT`
- `"LOCATION"` -> returns `LOCATION`
- `"WITHDRAW"` -> returns `WITHDRAW`
- `"TIME_INTERVAL"` -> returns `TIME_INTERVAL`
- `"ANALYZE"` -> returns `ANALYZE`

### Number handling

Rule:

```lex
[0-9]+
```

This matches integer numbers.

Action:

- convert text to integer using `atoi`
- store it in `yylval.num`
- return token `NUMBER`

### Location handling

Rule:

```lex
[0-9.,]+
```

This matches values like latitude and longitude strings.

Example:

- `23.8103,90.4125`

Action:

- duplicate string with `strdup`
- store it in `yylval.str`
- return token `CITY`

### Whitespace handling

Rule:

```lex
[ \t\n]
```

Whitespace is ignored.

### Unknown character handling

Rule:

```lex
.
```

Currently this is ignored silently.

### Why lexer is important here

Without the lexer:

- the parser would have to process raw characters directly
- keywords, numbers, and locations would not be separated cleanly

The lexer creates the first abstraction layer of the compiler pipeline.

---

## 14. Parser Logic with Bison

File:

`backend/compiler/parser.y`

The parser defines the grammar of the DSL and decides what each valid statement means.

### Bison value union

```c
%union{
    int num;
    char *str;
}
```

This means semantic values can be either:

- integer
- string

### Tokens

```c
%token ACCOUNT LOCATION WITHDRAW TIME_INTERVAL ANALYZE
%token <num> NUMBER
%token <str> CITY
```

### Grammar rules

#### Program

```c
program:
    statements ANALYZE { detect_fraud(); }
;
```

Meaning:

- a valid program is a list of statements followed by `ANALYZE`
- once `ANALYZE` is found, `detect_fraud()` is called

#### Statements

```c
statements:
      statements statement
    | statement
;
```

Meaning:

- one or more statements are allowed

#### Individual statement types

##### Account statement

```c
ACCOUNT NUMBER
```

Action:

- sets `account_number`

##### Location statement

```c
LOCATION CITY
```

Action:

- calls `update_location($2)`
- stores location string in internal array

##### Withdraw statement

```c
WITHDRAW NUMBER
```

Action:

- increments `withdraw_count`
- adds amount to `total_amount`

##### Time interval statement

```c
TIME_INTERVAL NUMBER
```

Action:

- sets `time_interval`

### Internal parser state

The parser keeps these variables:

- `withdraw_count`
- `total_amount`
- `time_interval`
- `account_number`
- `location_count`
- `locations[10][50]`

### `update_location(char *loc)`

This stores locations inside the parser state.

### `detect_fraud()`

This is called after parsing finishes successfully.

It computes risk using parser-collected information and prints:

- account number
- withdraw count
- total amount
- risk score
- final risk level

### Why Bison is useful here

Bison gives structure to the DSL:

- order of statements becomes meaningful
- only valid syntax is accepted
- semantic actions are triggered at parse time

This is the grammar/semantic analysis stage of the compiler workflow.

---

## 15. `fraud_logic.c` Explanation

File:

`backend/compiler/fraud_logic.c`

This file contains another C version of the fraud logic with variables like:

- `account_number`
- `withdraw_count`
- `total_amount`
- `location_change`
- `time_interval`

It also has:

- `update_location()`
- `detect_fraud()`

### Important note

The main Bison file `parser.y` already defines its own `detect_fraud()` and `update_location()`.

So academically:

- `parser.y` contains parser-driven fraud logic
- `fraud_logic.c` contains a separate C implementation of similar logic

This means the compiler folder shows both:

- parser-embedded semantic logic
- standalone C fraud logic

Depending on build/link setup, duplicated function names can be a design concern. In a production refactor, these should normally be unified or clearly separated.

---

## 16. `runner.c` Explanation

File:

`backend/compiler/runner.c`

Purpose:

- opens the DSL input file
- points `yyin` to that file
- calls `yyparse()`

Flow:

1. open `../input/transaction.dsl`
2. if file missing, print error
3. assign file to `yyin`
4. call `yyparse()`
5. close file

This is the executable entry point for the compiler module.

---

## 17. Makefile Explanation

File:

`backend/compiler/Makefile`

### `all`

```make
all:
	flex lexer.l
	bison -d parser.y
	gcc lex.yy.c parser.tab.c fraud_logic.c runner.c -o fraud
```

This does:

1. generate lexer code from `lexer.l`
2. generate parser code and header from `parser.y`
3. compile all C files into executable `fraud`

### `run`

```make
run:
	./fraud
```

Runs the compiled fraud DSL program.

---

## 18. Runtime Application vs Compiler Module

It is important to understand that this project has two parallel fraud-analysis expressions.

### Runtime web application

Used by frontend and backend:

- FastAPI
- SQLite
- real account state
- real temp/permanent blocking
- persistent reports

Main file:

- `backend/fraud_service.py`

### Compiler/DSL demonstration

Used for compiler design learning:

- Flex tokenization
- Bison grammar parsing
- semantic fraud scoring from DSL statements

Main files:

- `backend/compiler/lexer.l`
- `backend/compiler/parser.y`

So the compiler module is not the main web runtime, but it represents the same project idea from a language-processing perspective.

---

## 19. Security and Design Notes

### Good parts

- passwords are hashed with `bcrypt`
- account verification is required before analysis
- account number is checked against logged-in user
- temp block uses real expiration time
- fraud reports and transactions are persisted

### Improvement opportunities

- email sender credentials are currently hardcoded in `routes.py`
- some compiler logic is duplicated between `parser.y` and `fraud_logic.c`
- frontend session is simple `localStorage`, not secure JWT/session auth
- unknown lexer characters are ignored silently
- DSL error messages can be improved
- SQLite is fine for demo but not for large-scale production

---

## 20. How to Run

### Backend

From `backend/`:

```bash
uvicorn main:app --host 127.0.0.1 --port 8001
```

### Frontend

From `frontend/`:

```bash
python3 -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500/index.html
```

### Compiler module

From `backend/compiler/`:

```bash
make
make run
```

---

## 21. Recommended Test Flow

1. Register a new user
2. Verify OTP
3. Login
4. Open analyzer
5. Submit one normal case
6. Submit one suspicious case
7. Check result page
8. Check analytics page
9. Submit another request to verify temp block handling
10. Test permanent block scenario

---

## 22. Final Summary

This project is a combination of:

- software engineering
- web development
- database design
- rule-based fraud analysis
- compiler design with Flex and Bison

The runtime side shows how a fraud monitoring system can work end to end:

- register
- verify
- login
- analyze
- score
- block
- report

The compiler side shows how the same fraud problem can be expressed using:

- lexical analysis
- parsing
- semantic actions
- DSL-based evaluation

That combination is what makes this project academically interesting and practically complete.
